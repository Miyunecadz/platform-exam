// Part 1 — validate a submitted record against a definition.
//
// Design rules that hold for every client (the whole point of the exercise):
//   * The library knows field *types* and *constraints*, never field *names*.
//   * No coercion. "1500" is not a number; "yes" is not a boolean. We reject.
//   * Absent / null / "" / [] all count as "not provided". Required catches them
//     once; optional fields that are absent simply skip every other check.
//
// Decisions the format left open are documented in the README.

import type {
  Constraints,
  Definition,
  ErrorCode,
  FieldDefinition,
  Record,
  ValidateOptions,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from "./types";

const IGNORED_KEYS = new Set(["_note"]); // metadata in sample records, per the brief

/** A value counts as "not provided" if it is absent, null, blank, or an empty list. */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function err(
  field: FieldDefinition,
  code: ErrorCode,
  message: string,
): ValidationError {
  return { field: field.name, label: field.label, code, message };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Deliberately permissive: an email is "something@something.something" with no
// internal whitespace. Anything stricter rejects addresses that are in fact valid.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A phone is validated only for shape, not correctness — no field in any of the
// three clients supplies a `pattern` for phones, so we cannot know the real rule.
// We accept the common separators and require at least 7 digits. See README.
const PHONE_ALLOWED = /^[\d\s\-+().]+$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Compile a `pattern` from a definition. A malformed pattern is a fault in the
 * definition, not in the submitted record, so we skip the check rather than
 * throw — `validate` must always return a result. A meta-schema is the real fix
 * (see README).
 */
function compilePattern(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/** Check the value's runtime type matches the field type. Returns an error or null. */
function checkType(field: FieldDefinition, value: unknown): ValidationError | null {
  switch (field.type) {
    case "text":
    case "long_text":
    case "email":
    case "phone":
    case "date":
    case "choice":
    case "file":
      if (typeof value !== "string")
        return err(field, "type", `${field.label} must be text.`);
      return null;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value))
        return err(field, "type", `${field.label} must be a number.`);
      return null;
    case "boolean":
      if (typeof value !== "boolean")
        return err(field, "type", `${field.label} must be true or false.`);
      return null;
    case "multi_choice":
      if (!Array.isArray(value))
        return err(field, "not_array", `${field.label} must be a list of choices.`);
      return null;
    default:
      // Unknown field type in the definition. Treat as a definition problem, not
      // a record problem — accept the value rather than reject valid data.
      return null;
  }
}

/** Apply type-specific format and constraint checks. Assumes type already matched. */
function checkValue(field: FieldDefinition, value: unknown): ValidationError[] {
  const c: Constraints = field.constraints ?? {};
  const out: ValidationError[] = [];

  switch (field.type) {
    case "text":
    case "long_text": {
      const s = value as string;
      if (c.min_length != null && s.length < c.min_length)
        out.push(err(field, "too_short", `${field.label} must be at least ${c.min_length} characters.`));
      if (c.max_length != null && s.length > c.max_length)
        out.push(err(field, "too_long", `${field.label} must be at most ${c.max_length} characters.`));
      if (c.pattern != null) {
        const re = compilePattern(c.pattern);
        if (re && !re.test(s))
          out.push(err(field, "pattern", `${field.label} is not in the expected format.`));
      }
      break;
    }
    case "email": {
      if (!EMAIL.test(value as string))
        out.push(err(field, "bad_email", `${field.label} must be a valid email address.`));
      break;
    }
    case "phone": {
      const s = value as string;
      const digits = (s.match(/\d/g) ?? []).length;
      if (!PHONE_ALLOWED.test(s) || digits < 7)
        out.push(err(field, "bad_phone", `${field.label} must be a valid phone number.`));
      break;
    }
    case "date": {
      if (!isValidIsoDate(value as string))
        out.push(err(field, "bad_date", `${field.label} must be a valid date (YYYY-MM-DD).`));
      break;
    }
    case "number": {
      const n = value as number;
      if (c.min != null && n < c.min)
        out.push(err(field, "min", `${field.label} must be at least ${c.min}.`));
      if (c.max != null && n > c.max)
        out.push(err(field, "max", `${field.label} must be at most ${c.max}.`));
      break;
    }
    case "choice": {
      const opts = field.options ?? [];
      if (!opts.includes(value as string))
        out.push(err(field, "not_in_options", `${field.label} must be one of: ${opts.join(", ")}.`));
      break;
    }
    case "multi_choice": {
      const arr = value as unknown[];
      const opts = field.options ?? [];
      for (const item of arr) {
        if (typeof item !== "string" || !opts.includes(item)) {
          out.push(err(field, "bad_option", `${field.label} contains an invalid choice: ${String(item)}.`));
        }
      }
      if (c.min_selected != null && arr.length < c.min_selected)
        out.push(err(field, "too_few_selected", `${field.label} needs at least ${c.min_selected} selection(s).`));
      if (c.max_selected != null && arr.length > c.max_selected)
        out.push(err(field, "too_many_selected", `${field.label} allows at most ${c.max_selected} selection(s).`));
      break;
    }
    case "file": {
      const ext = extensionOf(value as string);
      if (c.accepted != null && !c.accepted.includes(ext))
        out.push(err(field, "bad_extension", `${field.label} must be one of these file types: ${c.accepted.join(", ")}.`));
      break;
    }
  }
  return out;
}

/**
 * Validate a record against a definition.
 * Returns every error found (we do not stop at the first) plus warnings for
 * record keys that no field defines.
 */
export function validate(
  definition: Definition,
  record: Record,
  options: ValidateOptions = {},
): ValidationResult {
  const unknownPolicy = options.unknownFields ?? "warn";
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const field of definition.fields) {
    const value = record[field.name];

    if (isEmpty(value)) {
      if (field.required) {
        errors.push(err(field, "required", `${field.label} is required.`));
      }
      continue; // absent optional field — nothing else to check
    }

    const typeError = checkType(field, value);
    if (typeError) {
      errors.push(typeError); // type is wrong — constraint checks would be noise
      continue;
    }

    errors.push(...checkValue(field, value));
  }

  // Keys present in the record that no field defines.
  if (unknownPolicy !== "ignore") {
    const known = new Set(definition.fields.map((f) => f.name));
    for (const key of Object.keys(record)) {
      if (IGNORED_KEYS.has(key) || known.has(key)) continue;
      if (unknownPolicy === "error") {
        errors.push({
          field: key,
          label: key,
          code: "unknown_field",
          message: `Unknown field '${key}' is not permitted.`,
        });
      } else {
        warnings.push({
          field: key,
          code: "unknown_field",
          message: `Unknown field '${key}' was ignored.`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    version: definition.version,
    errors,
    warnings,
  };
}
