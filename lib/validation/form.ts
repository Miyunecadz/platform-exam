// Part 2 — turn a definition into a form description a frontend can render.
// Same input, no client knowledge. We map each field *type* to an input kind
// and pass through everything a renderer needs: label, options, required, and
// the raw constraints as client-side hints.

import type {
  Definition,
  FieldDefinition,
  FormDescription,
  FormField,
} from "./types";

const INPUT_BY_TYPE: Record<FieldDefinition["type"], FormField["input"]> = {
  text: "text",
  long_text: "textarea",
  number: "number",
  boolean: "checkbox",
  date: "date",
  email: "email",
  phone: "tel",
  choice: "select",
  multi_choice: "multiselect",
  file: "file",
};

/** Humanise an option value for display: "old_town" -> "Old town". */
function optionLabel(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function toFormField(field: FieldDefinition): FormField {
  const out: FormField = {
    name: field.name,
    label: field.label,
    input: INPUT_BY_TYPE[field.type] ?? "text",
    required: field.required ?? false,
  };

  if (field.options) {
    out.options = field.options.map((value) => ({
      value,
      label: optionLabel(value),
    }));
  }
  if (field.type === "multi_choice") out.multiple = true;
  if (field.constraints?.accepted) out.accept = field.constraints.accepted;
  if (field.constraints) out.constraints = field.constraints;
  if (field.sensitivity) out.sensitivity = field.sensitivity;

  return out;
}

export function describeForm(definition: Definition): FormDescription {
  return {
    client: definition.client,
    record_type: definition.record_type,
    version: definition.version,
    fields: definition.fields.map(toFormField), // order preserved
  };
}
