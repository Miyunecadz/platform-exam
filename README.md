# Platform Foundation — take-home

A single repository that holds both deliverables:

- **Part B** — a definition-driven validation + form-description library (`lib/validation/`), with tests.
- **The submission page** — a Next.js app (`app/`) that presents Part A, Part C, the AI-usage note, and a live demo of the library, deployed to Vercel.

> The one rule that shapes everything: **the library contains no knowledge of any
> specific client.** No client field names, no per-client branches. The same code
> handles all three clients here, and is meant to handle an unseen fourth without
> modification.

---

## Part B — what it does

### Part 1 — validation from definitions

`validate(definition, record, options?)` checks a submitted record against a field
definition supplied as data, and returns **every** error (it does not stop at the
first), plus warnings.

```ts
import { validate } from "./lib/validation";

const result = validate(definition, record);
// {
//   valid: false,
//   errors:   [{ field, label, code, message }, ...],
//   warnings: [{ field, code: "unknown_field", message }, ...],
// }
```

Each error carries a machine-readable `code` (for the UI to branch on) *and* a
human `message` (for the UI to show). `valid` is true only when `errors` is empty;
warnings never affect it.

### Part 2 — a form description from the same definitions

`describeForm(definition)` returns a render-ready description — fields in order,
the input each needs, labels, options, required flags — with no UI attached.

```ts
import { describeForm } from "./lib/validation";
const form = describeForm(definition);
```

Example output (Client C, first two of its twelve fields shown):

```json
{
  "client": "client-c",
  "record_type": "patient_referral",
  "fields": [
    {
      "name": "patient_name",
      "label": "Patient name",
      "input": "text",
      "required": true,
      "constraints": { "max_length": 120 }
    },
    {
      "name": "national_id",
      "label": "National ID number",
      "input": "text",
      "required": true,
      "constraints": { "pattern": "^[0-9]{9}$" },
      "sensitivity": "confidential"
    }
  ]
}
```

`client` and `record_type` are carried through so a renderer that is handed one
form description knows which client's form it is holding, without a second
lookup.

Type → input mapping: `text→text`, `long_text→textarea`, `number→number`,
`boolean→checkbox`, `date→date`, `email→email`, `phone→tel`, `choice→select`,
`multi_choice→multiselect`, `file→file`. Options are humanised for display
(`old_town` → "Old town"), and `sensitivity` and raw `constraints` are passed
through as client-side hints.

---

## Decisions the format left open

The sample records deliberately push on ambiguous cases. Here is how each was
resolved, and why.

| Case | Decision | Reason |
|---|---|---|
| Wrong runtime type (`"1500"` for a number, `"yes"` for a boolean) | **Reject, no coercion** | A validator's job is to catch bad input, not guess intent. Coercion hides real errors. |
| Absent vs `null` vs `""` vs `[]` for a required field | All four count as **not provided** → one `required` error | Callers should not have to distinguish four kinds of "nothing". |
| `false` and `0` | **Present**, not empty | A required boolean that is genuinely `false` (Client C) and a cost of `0` (Client A) are valid answers. |
| Unknown keys in the record (`operator_initials`, `guardian_name`, …) | **Warn** by default; `unknownFields: "warn" \| "error" \| "ignore"` | The brief says clients add fields constantly; hard-failing is hostile. But the policy is the caller's to set. |
| Date format (no format given in constraints) | **ISO `YYYY-MM-DD`**, real-calendar checked (`2026-02-30` fails) | The definitions carry no format, so one had to be chosen and documented. |
| Phone (no `pattern` in any definition) | **Shape check only** — allowed separators + at least 7 digits | Without a pattern we cannot know the real rule; over-strict validation would reject valid numbers. This is a known weak point. |
| Email | Permissive `something@something.something` | Stricter regexes reject addresses that are in fact valid. |
| File fields | Only the **extension** is checked against `accepted` | The record carries a filename string, not the file. |

### What the format cannot express (and I did not fake)

- **Cross-field / temporal rules** — e.g. Client B's `project_end` must follow
  `project_start`. Every constraint in the format is single-field. Implementing
  this would mean hardcoding those two field names in the library — exactly the
  client-specific code the exercise forbids. The clean fix is to keep it in
  *data*: a declarative `constraints.after: "project_start"` the engine resolves
  at runtime, still knowing no client names. Sketched, not built.
- **Validating the definition itself.** The library trusts the definition. A
  `choice` with no `options`, or `min` above `max`, is not caught. A meta-schema
  is the first thing I would add with more time. Where a bad definition would
  otherwise crash the validator — an unparseable `constraints.pattern`, an
  unknown `type` — the check is skipped instead: a fault in the definition must
  not stop a record from being told what is wrong with *it*.

### What I would add to the format

The starter notes the format is not necessarily complete. Four things I would
change, each visible in the three definitions as they stand. I built against the
format as given — none of this is implemented.

- **No `money` type.** Client A's `estimated_cost` and Client B's
  `amount_requested` are plain `number`s bounded by `min`/`max`. The currency is
  nowhere in the definition, and "two decimal places" cannot be stated, so
  `3.7431` is a valid repair cost. A `money` type carrying currency and scale
  would express both, and would tell a UI to render a currency input rather than
  a bare number.
- **No `address` type.** Client A splits location across `street_address` (free
  `text`, `max_length: 200`) and `neighbourhood` (a `choice`), with nothing in
  the format connecting them. Nothing can check that the street sits in the
  chosen neighbourhood, and the street itself is unstructured, so it cannot be
  geocoded or deduplicated — which is what the "same pothole reported twice"
  problem in the brief actually needs. A structured `address` type would hold
  the parts and their relationship in one field.
- **No `date_range` type.** Client B carries `project_start` and `project_end`
  as two independent `date` fields, which is precisely why "end must follow
  start" is unexpressible. A single `date_range` field would make the common
  case a type rather than a cross-field rule, and leave the general `after`
  mechanism for the rarer ones.
- **Nothing about how a field is used, only how it is entered.** The format
  describes fields for input: label, type, constraints. It says nothing about
  which fields are filtered, sorted, or grouped on. A platform reading these
  definitions therefore cannot know which fields need database indexes or which
  belong in a queue's filter bar — that has to be configured a second time,
  somewhere else, by hand. Flags on the field would keep it in one place.
- **`sensitivity` has no defined vocabulary.** Two values appear across the
  three definitions — `internal` on Client A's `estimated_cost`, `confidential`
  on Client B's `annual_turnover` and Client C's `national_id` and
  `clinical_notes` — but the format never states the permitted levels or how
  they rank. The library can only pass the string through, which it does; no
  consumer can compare two of them without inventing its own scale.

---

## Running it

```bash
pnpm install
pnpm test        # 42 tests: unit + integration against the real starter data
pnpm dev         # the submission page, with a live demo of the library
```

## Layout

```
lib/validation/
  types.ts       shared format types (no client knowledge)
  validate.ts    Part 1 — validation
  form.ts        Part 2 — form description
  index.ts       public surface
lib/__tests__/
  validate.test.ts    type/constraint/edge-case unit tests
  fixtures.test.ts    integration against the three real definitions + records
definitions/     the three starter definitions
sample-records/  the three starter record sets
app/             the Next.js submission page
content/         Part A / Part C / AI-usage prose
```

## What I would do differently with more time

- Validate the definition (meta-schema) before using it.
- Structured, translatable error messages (keys, not baked-in English) — the
  platform must speak Hebrew.
- A constraint registry so cross-field rules like `after` are a definition edit
  plus a small registered module, not a change to the core validator.

See **Part C** on the submission page for the fuller reflection.
