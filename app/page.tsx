import Link from "next/link";
import { SECTIONS } from "@/lib/site";

/**
 * The thesis, shown rather than described: two clients' workflow stages living
 * as rows in one table. Straight out of Part A section 3.
 */
const STATE_ROWS = [
  { id: "received", label: "Received", position: 1, client: "client_c" },
  { id: "triaged", label: "Triaged", position: 2, client: "client_c" },
  { id: "new", label: "New", position: 1, client: "client_a" },
  { id: "assigned", label: "Assigned", position: 2, client: "client_a" },
];

export default function Page() {
  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="mono-kicker">take_home · platform foundation</span>
            <h1>
              One platform, many clients.
              <span className="hero-turn">
                The differences live in rows, not in code.
              </span>
            </h1>
            <p className="standfirst">
              An architecture note answering the nine questions, a validation
              library that knows nothing about any specific client, and an
              honest account of what did not fit.
            </p>
          </div>

          <figure className="thesis">
            <figcaption className="thesis-head">
              <span className="mono-kicker">definitions.states</span>
            </figcaption>
            <table className="thesis-table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>label</th>
                  <th>position</th>
                  <th>client</th>
                </tr>
              </thead>
              <tbody>
                {STATE_ROWS.map((row) => (
                  <tr key={row.client + row.id}>
                    <td className="cell-id">{row.id}</td>
                    <td className="cell-label">{row.label}</td>
                    <td>{row.position}</td>
                    <td className="cell-client">{row.client}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="thesis-note">
              One table, two clients&rsquo; rows. Renaming{" "}
              <span className="cell-label">Triaged</span> to{" "}
              <span className="cell-label">Assessed</span> is an edit here, not
              a release.
            </p>
          </figure>
        </div>
      </header>

      <main className="doc doc-full">
        <div className="doc-inner">
          <div className="doc-column">
            <div className="ledger-head">
              <span className="mono-kicker">contents</span>
            </div>
            <ol className="ledger">
              {SECTIONS.map((section) => (
                <li key={section.href}>
                  <Link className="ledger-row" href={section.href}>
                    <span className="ledger-ref">{section.ref}</span>
                    <span className="ledger-main">
                      <span className="ledger-title">{section.title}</span>
                      <span className="ledger-blurb">{section.standfirst}</span>
                    </span>
                    <span className="ledger-facts">
                      {section.facts.map((fact) => (
                        <span key={fact}>{fact}</span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    </>
  );
}
