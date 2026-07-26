"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPO_URL, SECTIONS } from "@/lib/site";

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link className="nav-brand" href="/">
          <span className="nav-brand-mark" aria-hidden="true" />
          Platform Foundation
        </Link>
        <div className="nav-links">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={pathname === s.href ? "page" : undefined}
            >
              {s.ref}
            </Link>
          ))}
        </div>
        <a className="nav-code" href={REPO_URL}>
          code ↗
        </a>
      </div>
    </nav>
  );
}
