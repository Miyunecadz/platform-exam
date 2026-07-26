import Masthead from "@/components/Masthead";
import Pager from "@/components/Pager";
import SectionRail from "@/components/SectionRail";
import { renderDocument } from "@/lib/markdown";
import { sectionByHref } from "@/lib/site";

/**
 * A section page whose body is one rendered markdown file. Documents long
 * enough to need one get the outline rail; short ones read as a single column.
 */
export default function MarkdownSection({
  href,
  file,
  rail = false,
}: {
  href: string;
  file: string;
  rail?: boolean;
}) {
  const section = sectionByHref(href);
  const { html, toc } = renderDocument(file);
  const showRail = rail && toc.length > 2;

  return (
    <main className={showRail ? "doc doc-railed" : "doc"}>
      <div className="doc-inner">
        {/* First in the DOM so the collapsed mobile control sits above the
            document; the grid puts it back on the right on wide screens. */}
        {showRail && <SectionRail toc={toc} />}
        <div className="doc-column">
          {section && <Masthead section={section} />}
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <Pager href={href} />
        </div>
      </div>
    </main>
  );
}
