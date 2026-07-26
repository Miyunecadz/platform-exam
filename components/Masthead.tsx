import type { Section } from "@/lib/site";

/** The header every section page opens with: id, label, standfirst, facts. */
export default function Masthead({ section }: { section: Section }) {
  return (
    <header className="masthead">
      <div className="masthead-id">
        <span className="mono-kicker">{section.ref}</span>
        <span className="masthead-kicker">{section.kicker}</span>
      </div>
      <h1>{section.title}</h1>
      <p className="standfirst">{section.standfirst}</p>
      <ul className="facts">
        {section.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </header>
  );
}
