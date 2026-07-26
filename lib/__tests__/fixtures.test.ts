// Integration tests against the real starter definitions and sample records.
// The library must handle all three clients with the same code path — so these
// tests load the actual JSON and assert on the traps each record was built to set.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validate, describeForm, describeIndexes } from "../validation";
import type { Definition } from "../validation";

const root = join(import.meta.dirname, "..", "..");
const load = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));

const defs: Record<string, Definition> = {
  a: load("definitions/client-a-city-maintenance.json"),
  b: load("definitions/client-b-grant-foundation.json"),
  c: load("definitions/client-c-clinic-referrals.json"),
};
const records: Record<string, any[]> = {
  a: load("sample-records/client-a-records.json"),
  b: load("sample-records/client-b-records.json"),
  c: load("sample-records/client-c-records.json"),
};

const fieldsWith = (r: ReturnType<typeof validate>) =>
  new Set(r.errors.map((e) => e.field));

describe("first record of every client is valid", () => {
  it.each(["a", "b", "c"])("client %s record 0", (k) => {
    expect(validate(defs[k], records[k][0]).valid).toBe(true);
  });
});

describe("client A traps", () => {
  it("record 1: blank name, too-short description; cost 0 is fine; extra key warns", () => {
    const r = validate(defs.a, records.a[1]);
    const f = fieldsWith(r);
    expect(f).toContain("reporter_name"); // "" -> required
    expect(f).toContain("description"); // "Dark" -> too_short
    expect(f.has("estimated_cost")).toBe(false); // 0 is valid
    expect(r.warnings.map((w) => w.field)).toContain("operator_initials");
  });

  it("record 2: bad option, bad file ext, bad date, boolean-as-string, number-as-string", () => {
    const f = fieldsWith(validate(defs.a, records.a[2]));
    for (const field of ["neighbourhood", "photo", "reported_at", "callback_requested", "estimated_cost"])
      expect(f).toContain(field);
  });

  it("record 3: null required values are caught", () => {
    const f = fieldsWith(validate(defs.a, records.a[3]));
    expect(f).toContain("reporter_phone"); // null, required
    expect(f).toContain("callback_requested"); // null, required
  });
});

describe("client B traps", () => {
  it("record 1: pattern, email, coercion, too many choices, short text, bad file, is invalid", () => {
    const f = fieldsWith(validate(defs.b, records.b[1]));
    for (const field of ["registry_number", "contact_email", "amount_requested", "focus_areas", "project_description", "budget_file"])
      expect(f).toContain(field);
  });

  it("record 2: below-min amount, unknown round, empty required multi_choice, missing required file", () => {
    const f = fieldsWith(validate(defs.b, records.b[2]));
    for (const field of ["amount_requested", "funding_round", "focus_areas", "budget_file"])
      expect(f).toContain(field);
    // empty optional contact_phone "" must NOT error
    expect(f.has("contact_phone")).toBe(false);
  });
});

describe("client C traps", () => {
  it("record 1: required boolean genuinely false is valid", () => {
    expect(validate(defs.c, records.c[1]).valid).toBe(true);
  });

  it("record 2: id pattern, dob format, licence pattern, bad specialty, bad urgency, negative number", () => {
    const f = fieldsWith(validate(defs.c, records.c[2]));
    for (const field of ["national_id", "date_of_birth", "physician_licence", "specialty", "urgency", "previous_visits"])
      expect(f).toContain(field);
  });

  it("record 3: missing required fields flagged, extras warned", () => {
    const r = validate(defs.c, records.c[3]);
    const f = fieldsWith(r);
    expect(f).toContain("national_id"); // missing, required
    expect(f).toContain("urgency"); // missing, required
    expect(r.warnings.map((w) => w.field)).toEqual(
      expect.arrayContaining(["guardian_name", "insurance_provider"]),
    );
  });
});

describe("form description works for every client with no client-specific code", () => {
  it.each(["a", "b", "c"])("client %s", (k) => {
    const form = describeForm(defs[k]);
    expect(form.fields).toHaveLength(defs[k].fields.length);
    // order is preserved
    expect(form.fields.map((f) => f.name)).toEqual(defs[k].fields.map((f) => f.name));
  });

  it("maps types to inputs and carries options/required", () => {
    const form = describeForm(defs.a);
    const neighbourhood = form.fields.find((f) => f.name === "neighbourhood")!;
    expect(neighbourhood.input).toBe("select");
    expect(neighbourhood.required).toBe(true);
    expect(neighbourhood.options?.[0]).toEqual({ value: "north", label: "North" });
    const desc = form.fields.find((f) => f.name === "description")!;
    expect(desc.input).toBe("textarea");
  });
});

describe("index description matches what each brief says its queues and reports do", () => {
  it("client A groups reports by category and neighbourhood, over time", () => {
    const out = describeIndexes(defs.a);
    const byField = Object.fromEntries(out.indexes.map((i) => [i.field, i.reasons]));
    expect(byField.category).toContain("report");
    expect(byField.neighbourhood).toContain("report");
    expect(byField.reported_at).toContain("sort");
  });

  it("client C filters its queue by specialty and sorts by urgency", () => {
    const byField = Object.fromEntries(
      describeIndexes(defs.c).indexes.map((i) => [i.field, i.reasons]),
    );
    expect(byField.specialty).toContain("filter");
    expect(byField.urgency).toContain("sort");
  });

  it("indexes a small subset, not every field", () => {
    for (const k of ["a", "b", "c"]) {
      const out = describeIndexes(defs[k]);
      expect(out.indexes.length).toBeGreaterThan(0);
      expect(out.indexes.length).toBeLessThan(defs[k].fields.length);
    }
  });

  it("clinical notes are never indexed — free text nobody filters on", () => {
    const fields = describeIndexes(defs.c).indexes.map((i) => i.field);
    expect(fields).not.toContain("clinical_notes");
  });
});

describe("every client definition carries a version", () => {
  it.each(["a", "b", "c"])("client %s", (k) => {
    expect(typeof defs[k].version).toBe("number");
    expect(validate(defs[k], records[k][0]).version).toBe(defs[k].version);
    expect(describeForm(defs[k]).version).toBe(defs[k].version);
  });
});
