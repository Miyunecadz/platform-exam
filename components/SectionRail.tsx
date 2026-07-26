"use client";

import { useEffect, useRef, useState } from "react";
import type { TocNode } from "@/lib/markdown";

/**
 * Right-hand outline for long documents. Tracks the heading currently at the
 * top of the viewport, expands only that section's subsections, and fills the
 * spine to show how far through the document the reader is.
 */
export default function SectionRail({ toc }: { toc: TocNode[] }) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const headings = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const ids = toc.flatMap((s) => [s.id, ...s.children.map((c) => c.id)]);
    headings.current = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    let frame = 0;
    const measure = () => {
      frame = 0;

      // Active = the last heading whose top has passed the reading line.
      const line = window.innerHeight * 0.28;
      let current = headings.current[0];
      for (const el of headings.current) {
        if (el.getBoundingClientRect().top <= line) current = el;
        else break;
      }
      if (current) setActiveId(current.id);

      const scrollable = document.body.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [toc]);

  const activeSection =
    toc.find((s) => s.id === activeId || s.children.some((c) => c.id === activeId)) ??
    toc[0];

  const rows = (
    <ol className="rail-list">
      {toc.map((section) => {
        const isCurrent = section.id === activeSection?.id;
        return (
          <li key={section.id}>
            <a
              className="rail-row"
              href={`#${section.id}`}
              aria-current={section.id === activeId ? "location" : undefined}
              data-current={isCurrent || undefined}
              onClick={() => setOpen(false)}
            >
              <span className="rail-ref">{section.ref}</span>
              <span className="rail-label">{section.text}</span>
            </a>

            {isCurrent && section.children.length > 0 && (
              <ol className="rail-sub">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <a
                      className="rail-row sub"
                      href={`#${child.id}`}
                      aria-current={child.id === activeId ? "location" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <span className="rail-label">{child.text}</span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <aside className="rail" aria-label="Document outline">
        <div className="rail-inner">
          <div className="rail-head">
            <span className="mono-kicker">outline</span>
            <span className="rail-progress-value">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="rail-body">
            <span className="rail-spine" aria-hidden="true">
              <span
                className="rail-spine-fill"
                style={{ transform: `scaleY(${progress})` }}
              />
            </span>
            {rows}
          </div>
        </div>
      </aside>

      <div className="rail-mobile">
        <button
          type="button"
          className="rail-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="mono-kicker">outline</span>
          <span className="rail-toggle-current">{activeSection?.text}</span>
          <span className="rail-toggle-mark" aria-hidden="true">
            {open ? "×" : "+"}
          </span>
        </button>
        {open && <div className="rail-sheet">{rows}</div>}
      </div>
    </>
  );
}
