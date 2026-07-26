import type { Metadata } from "next";
import Link from "next/link";
import SectionRail from "@/components/SectionRail";
import { renderRepoFile } from "@/lib/markdown";
import { REPO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Part B · README",
  description:
    "The repository README: what the library does, the decisions the format left open, and what the format cannot express.",
};

/**
 * The README, rendered here as well as living in the repository. The brief asks
 * for a README covering the open decisions, and a reader should not have to
 * leave the submission page to read it.
 */
export default function Page() {
  const { html, toc } = renderRepoFile("README.md");

  return (
    <main className="doc doc-railed">
      <div className="doc-inner">
        <SectionRail toc={toc} />
        <div className="doc-column">
          <header className="masthead">
            <div className="masthead-id">
              <span className="mono-kicker">part_b</span>
              <span className="masthead-kicker">Repository README</span>
            </div>
            <h1>README</h1>
            <p className="standfirst">
              The same file that sits at the root of the repository — how the
              library works, every decision the field-definition format left
              open, and what it cannot express.
            </p>
            <ul className="facts">
              <li>Rendered from the repo</li>
              <li>
                <a href={REPO.readme}>View on GitHub ↗</a>
              </li>
            </ul>
          </header>

          <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />

          <nav className="pager" aria-label="Section navigation">
            <Link className="pager-link" href="/part-b">
              <span className="mono-kicker">← part_b</span>
              <span className="pager-title">Coding exercise</span>
            </Link>
            <Link className="pager-link next" href="/part-c">
              <span className="mono-kicker">part_c →</span>
              <span className="pager-title">Closing reflection</span>
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
