import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

marked.setOptions({ gfm: true });

export type TocNode = {
  id: string;
  /** The "id" half of the id/label pair shown in the rail — q1, q1.2, … */
  ref: string;
  text: string;
  children: TocNode[];
};

export type Rendered = {
  html: string;
  /** Top-level (##) sections, each with its (###) subsections. */
  toc: TocNode[];
  /** The leading # title, stripped from the body so the page can set its own masthead. */
  title: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Strip the leading number from "4. Keeping clients apart" — the rail supplies its own. */
function stripLeadingNumber(text: string): string {
  return text.replace(/^\d+\.\s*/, "");
}

function readContent(file: string): string {
  return readFileSync(join(process.cwd(), "content", file), "utf8");
}

/**
 * Render a markdown file, giving every heading a stable id and returning the
 * two-level outline the section rail navigates by.
 */
export function renderDocument(file: string): Rendered {
  const md = readContent(file);
  const tokens = marked.lexer(md);

  let title = "";
  const toc: TocNode[] = [];
  const used = new Map<string, number>();
  const ids: string[] = [];

  for (const token of tokens) {
    if (token.type !== "heading") continue;

    const raw = token.text as string;
    if (token.depth === 1 && !title) {
      title = raw;
      ids.push("");
      continue;
    }

    let id = slugify(raw);
    const seen = used.get(id) ?? 0;
    used.set(id, seen + 1);
    if (seen) id = `${id}-${seen + 1}`;
    ids.push(id);

    if (token.depth === 2) {
      toc.push({
        id,
        ref: `q${toc.length + 1}`,
        text: stripLeadingNumber(raw),
        children: [],
      });
    } else if (token.depth === 3 && toc.length) {
      const parent = toc[toc.length - 1];
      parent.children.push({
        id,
        ref: `${parent.ref}.${parent.children.length + 1}`,
        text: stripLeadingNumber(raw),
        children: [],
      });
    }
  }

  let i = 0;
  const renderer = new marked.Renderer();

  // The note sets the assumption behind each answer as a wholly italic
  // paragraph. Mark those so they can be styled apart from ordinary emphasis.
  renderer.paragraph = function ({ tokens: inline }) {
    const text = this.parser.parseInline(inline);
    const isAssumption = inline.length === 1 && inline[0].type === "em";
    return isAssumption
      ? `<p class="assumption">${text}</p>\n`
      : `<p>${text}</p>\n`;
  };

  renderer.heading = function ({ tokens: inline, depth }) {
    const text = this.parser.parseInline(inline);
    const id = ids[i++];
    // The leading h1 becomes the page masthead, so drop it from the body.
    if (depth === 1 && !id) return "";
    return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">#</a>${text}</h${depth}>\n`;
  };

  const html = marked.parse(md, { renderer }) as string;
  return { html, toc, title };
}
