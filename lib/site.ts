export const REPO_URL = "https://github.com/Miyunecadz/platform-exam";

/** Deep links into the repository, so a reader can go straight to the thing named. */
export const REPO = {
  root: REPO_URL,
  readme: `${REPO_URL}#readme`,
  library: `${REPO_URL}/tree/main/lib/validation`,
  tests: `${REPO_URL}/tree/main/lib/__tests__`,
  definitions: `${REPO_URL}/tree/main/definitions`,
} as const;

export type Section = {
  href: string;
  /** The permanent id half of the id/label pair the whole site is built on. */
  ref: string;
  label: string;
  kicker: string;
  title: string;
  standfirst: string;
  /** Short facts shown under the masthead — all drawn from the section itself. */
  facts: string[];
};

/** Ordered sections — drives the nav, the landing ledger, and the prev/next pager. */
export const SECTIONS: Section[] = [
  {
    href: "/part-a",
    ref: "part_a",
    label: "Part A",
    kicker: "Architecture",
    title: "Architecture note",
    standfirst:
      "Nine questions about running one platform for many clients, answered with the assumption each answer rests on.",
    facts: ["9 questions", "6 definition tables", "3 clients modelled"],
  },
  {
    href: "/part-b",
    ref: "part_b",
    label: "Part B",
    kicker: "Library",
    title: "Coding exercise",
    standfirst:
      "A validation and form-description library driven entirely by field definitions. No client field names, no per-client branches — the same code handles all three clients below, and an unseen fourth.",
    facts: ["55 tests", "10 field types", "0 client names in code"],
  },
  {
    href: "/part-c",
    ref: "part_c",
    label: "Part C",
    kicker: "Reflection",
    title: "Closing reflection",
    standfirst:
      "What the design gets right, what it defers, and where it would strain first.",
    facts: ["Trade-offs", "Known gaps"],
  },
  {
    href: "/ai-usage",
    ref: "ai_usage",
    label: "AI usage",
    kicker: "Appendix",
    title: "How I used AI",
    standfirst:
      "Where AI was used on this exercise, where it was not, and what I checked by hand.",
    facts: ["Disclosure"],
  },
];

export function sectionByHref(href: string): Section | undefined {
  return SECTIONS.find((s) => s.href === href);
}

export function pager(href: string): { prev?: Section; next?: Section } {
  const i = SECTIONS.findIndex((s) => s.href === href);
  if (i === -1) return {};
  return { prev: SECTIONS[i - 1], next: SECTIONS[i + 1] };
}
