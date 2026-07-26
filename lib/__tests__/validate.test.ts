import { describe, it, expect } from "vitest";
import { validate, describeIndexes } from "../validation";
import type { Definition } from "../validation";

// A small self-contained definition that exercises every field type and
// constraint, so these tests do not depend on any real client's fields.
const def: Definition = {
  client: "test",
  record_type: "sample",
  version: 1,
  fields: [
    { name: "name", label: "Name", type: "text", required: true, constraints: { max_length: 5 } },
    { name: "bio", label: "Bio", type: "long_text", required: false, constraints: { min_length: 3 } },
    { name: "count", label: "Count", type: "number", required: true, constraints: { min: 0, max: 10 } },
    { name: "agree", label: "Agree", type: "boolean", required: true },
    { name: "when", label: "When", type: "date", required: true },
    { name: "mail", label: "Mail", type: "email", required: false },
    { name: "tel", label: "Tel", type: "phone", required: false },
    { name: "colour", label: "Colour", type: "choice", required: true, options: ["red", "blue"] },
    { name: "tags", label: "Tags", type: "multi_choice", required: false, options: ["a", "b", "c"], constraints: { min_selected: 1, max_selected: 2 } },
    { name: "doc", label: "Doc", type: "file", required: false, constraints: { accepted: ["pdf"] } },
    { name: "code", label: "Code", type: "text", required: false, constraints: { pattern: "^[0-9]{3}$" } },
  ],
};

/** Build a fully valid record, then override for each test. */
function base(): Record<string, unknown> {
  return {
    name: "Ann",
    count: 3,
    agree: true,
    when: "2026-01-15",
    colour: "red",
  };
}

const codesFor = (r: ReturnType<typeof validate>, field: string) =>
  r.errors.filter((e) => e.field === field).map((e) => e.code);

describe("presence / required", () => {
  it("accepts a fully valid record", () => {
    expect(validate(def, base()).valid).toBe(true);
  });

  it.each([undefined, null, "", "   "])("flags required field when value is %o", (v) => {
    const r = validate(def, { ...base(), name: v });
    expect(codesFor(r, "name")).toContain("required");
  });

  it("treats boolean false as present, not empty", () => {
    const r = validate(def, { ...base(), agree: false });
    expect(r.valid).toBe(true);
  });

  it("treats number 0 as present, not empty", () => {
    const r = validate(def, { ...base(), count: 0 });
    expect(r.valid).toBe(true);
  });

  it("skips all checks for an absent optional field", () => {
    const r = validate(def, base()); // bio, mail, tel, tags, doc, code all absent
    expect(r.errors).toHaveLength(0);
  });
});

describe("type strictness (no coercion)", () => {
  it("rejects a numeric string for a number field", () => {
    const r = validate(def, { ...base(), count: "3" });
    expect(codesFor(r, "count")).toEqual(["type"]);
  });

  it("rejects a string for a boolean field", () => {
    const r = validate(def, { ...base(), agree: "yes" });
    expect(codesFor(r, "agree")).toEqual(["type"]);
  });

  it("rejects a non-array for multi_choice", () => {
    const r = validate(def, { ...base(), tags: "a" });
    expect(codesFor(r, "tags")).toEqual(["not_array"]);
  });

  it("rejects NaN for a number field", () => {
    const r = validate(def, { ...base(), count: NaN });
    expect(codesFor(r, "count")).toEqual(["type"]);
  });
});

describe("constraints", () => {
  it("enforces number min/max", () => {
    expect(codesFor(validate(def, { ...base(), count: -1 }), "count")).toEqual(["min"]);
    expect(codesFor(validate(def, { ...base(), count: 11 }), "count")).toEqual(["max"]);
  });

  it("enforces string length", () => {
    expect(codesFor(validate(def, { ...base(), name: "Annette" }), "name")).toEqual(["too_long"]);
    expect(codesFor(validate(def, { ...base(), bio: "hi" }), "bio")).toEqual(["too_short"]);
  });

  it("enforces regex pattern", () => {
    expect(codesFor(validate(def, { ...base(), code: "12a" }), "code")).toEqual(["pattern"]);
    expect(validate(def, { ...base(), code: "123" }).valid).toBe(true);
  });

  it("skips an unparseable pattern rather than throwing", () => {
    const broken = {
      ...def,
      fields: [{ name: "code", label: "Code", type: "text" as const, constraints: { pattern: "^[0-9" } }],
    };
    const result = validate(broken, { code: "anything" });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("enforces choice membership", () => {
    expect(codesFor(validate(def, { ...base(), colour: "green" }), "colour")).toEqual(["not_in_options"]);
  });

  it("enforces multi_choice options and counts", () => {
    expect(codesFor(validate(def, { ...base(), tags: ["z"] }), "tags")).toContain("bad_option");
    expect(codesFor(validate(def, { ...base(), tags: ["a", "b", "c"] }), "tags")).toContain("too_many_selected");
  });

  it("enforces file extension case-insensitively", () => {
    expect(codesFor(validate(def, { ...base(), doc: "report.docx" }), "doc")).toEqual(["bad_extension"]);
    expect(validate(def, { ...base(), doc: "report.PDF" }).valid).toBe(true);
  });
});

describe("format checks", () => {
  it("rejects non-ISO and impossible dates", () => {
    expect(codesFor(validate(def, { ...base(), when: "15/01/2026" }), "when")).toEqual(["bad_date"]);
    expect(codesFor(validate(def, { ...base(), when: "2026-02-30" }), "when")).toEqual(["bad_date"]);
  });

  it("checks email shape", () => {
    expect(codesFor(validate(def, { ...base(), mail: "noa.example.org" }), "mail")).toEqual(["bad_email"]);
    expect(validate(def, { ...base(), mail: "a@b.co" }).valid).toBe(true);
  });

  it("checks phone shape", () => {
    expect(codesFor(validate(def, { ...base(), tel: "052-1234567" }), "tel")).toEqual([]);
    expect(codesFor(validate(def, { ...base(), tel: "call me" }), "tel")).toEqual(["bad_phone"]);
  });
});

describe("unknown fields", () => {
  it("warns by default and stays valid", () => {
    const r = validate(def, { ...base(), mystery: 1 });
    expect(r.valid).toBe(true);
    expect(r.warnings.map((w) => w.field)).toContain("mystery");
  });

  it("can be escalated to an error", () => {
    const r = validate(def, { ...base(), mystery: 1 }, { unknownFields: "error" });
    expect(r.valid).toBe(false);
    expect(codesFor(r, "mystery")).toEqual(["unknown_field"]);
  });

  it("can be ignored entirely", () => {
    const r = validate(def, { ...base(), mystery: 1 }, { unknownFields: "ignore" });
    expect(r.warnings).toHaveLength(0);
    expect(r.valid).toBe(true);
  });

  it("never treats _note as unknown", () => {
    const r = validate(def, { ...base(), _note: "hello" });
    expect(r.warnings).toHaveLength(0);
  });
});

describe("multiple errors are collected, not short-circuited", () => {
  it("reports every problem at once", () => {
    const r = validate(def, { name: "", count: 99, agree: "no", when: "nope", colour: "x" });
    // required name, max count, type agree, bad_date when, not_in_options colour
    expect(r.errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe("definition version", () => {
  it("reports the version the record was checked against", () => {
    expect(validate(def, base()).version).toBe(1);
  });

  it("reports the version even when the record fails", () => {
    const r = validate({ ...def, version: 7 }, { ...base(), name: "" });
    expect(r.valid).toBe(false);
    expect(r.version).toBe(7);
  });
});

describe("index description", () => {
  const indexed: Definition = {
    ...def,
    fields: [
      { name: "plain", label: "Plain", type: "text" },
      { name: "queue", label: "Queue", type: "choice", options: ["x"], filterable: true },
      { name: "order", label: "Order", type: "date", sortable: true },
      { name: "group", label: "Group", type: "choice", options: ["y"], reporting_dimension: true },
      {
        name: "all_three",
        label: "All three",
        type: "choice",
        options: ["z"],
        filterable: true,
        sortable: true,
        reporting_dimension: true,
      },
    ],
  };

  it("indexes only the fields the definition asks for", () => {
    const out = describeIndexes(indexed);
    expect(out.indexes.map((i) => i.field)).toEqual([
      "queue",
      "order",
      "group",
      "all_three",
    ]);
  });

  it("gives every reason a field needs its index", () => {
    const out = describeIndexes(indexed);
    const byField = Object.fromEntries(out.indexes.map((i) => [i.field, i.reasons]));
    expect(byField.queue).toEqual(["filter"]);
    expect(byField.order).toEqual(["sort"]);
    expect(byField.group).toEqual(["report"]);
    expect(byField.all_three).toEqual(["filter", "sort", "report"]);
  });

  it("indexes nothing when the definition asks for nothing", () => {
    expect(describeIndexes(def).indexes).toEqual([]);
  });

  it("carries client, record type and version", () => {
    const out = describeIndexes(indexed);
    expect(out).toMatchObject({ client: "test", record_type: "sample", version: 1 });
  });
});
