import Link from "next/link";
import { pager } from "@/lib/site";

/** Prev/next links between sections, rendered at the foot of each section page. */
export default function Pager({ href }: { href: string }) {
  const { prev, next } = pager(href);
  if (!prev && !next) return null;

  return (
    <nav className="pager" aria-label="Section navigation">
      {prev ? (
        <Link className="pager-link" href={prev.href}>
          <span className="mono-kicker">← {prev.ref}</span>
          <span className="pager-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className="pager-link next" href={next.href}>
          <span className="mono-kicker">{next.ref} →</span>
          <span className="pager-title">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
