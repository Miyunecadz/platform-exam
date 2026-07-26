import type { Metadata } from "next";
import Link from "next/link";
import Demo from "@/components/Demo";
import Masthead from "@/components/Masthead";
import Pager from "@/components/Pager";
import { REPO, sectionByHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Part B · Library",
  description:
    "A definition-driven validation and form-description library, with a live demo running the real code.",
};

const PARTS = [
  {
    ref: "part_1",
    title: "Validation",
    body: "Checks a record against a definition and returns every error, not just the first — each with a machine code and a message a person can act on, plus warnings for fields the definition does not describe.",
  },
  {
    ref: "part_2",
    title: "Form description",
    body: "Turns the same definition into a render-ready structure: fields in order, input type, labels, options, required flags. It describes the form. It does not draw it.",
  },
  {
    ref: "part_2b",
    title: "Index description",
    body: "Reads the filter, sort and group flags and returns only the fields that earn a database index. A flag nothing consumes is a comment with extra steps.",
  },
];

export default function Page() {
  const section = sectionByHref("/part-b")!;

  return (
    <main className="doc doc-wide">
      <div className="doc-inner">
        <div className="doc-column">
          <Masthead section={section} />

          <ol className="parts">
            {PARTS.map((part) => (
              <li key={part.ref} className="part">
                <span className="mono-kicker">{part.ref}</span>
                <h2>{part.title}</h2>
                <p>{part.body}</p>
              </li>
            ))}
          </ol>

          <div className="proof">
            <div className="proof-stat">
              <span className="proof-number">55</span>
              <span className="proof-label">
                tests — every type and constraint, plus the three real
                definitions and their deliberately awkward sample records
              </span>
            </div>
            <div className="actions">
              <a className="btn" href={REPO.library}>
                Read the library ↗
              </a>
              <Link className="btn secondary" href="/part-b/readme">
                README
              </Link>
              <a className="btn secondary" href={REPO.tests}>
                The 55 tests ↗
              </a>
            </div>
          </div>

          <section className="demo-block" aria-labelledby="demo-heading">
            <div className="demo-head">
              <span className="mono-kicker">live</span>
              <h2 id="demo-heading">The library, running here</h2>
              <p>
                Pick a client and a sample record, edit the JSON, and watch it
                validate — or switch to the form and index descriptions built
                from the same definition.
              </p>
            </div>
            <div className="card">
              <Demo />
            </div>
          </section>

          <Pager href="/part-b" />
        </div>
      </div>
    </main>
  );
}
