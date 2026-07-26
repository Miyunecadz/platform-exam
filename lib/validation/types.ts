// Types for the definition-driven validation library.
// These describe the *format* of a definition file. They contain no knowledge
// of any particular client — only the shared shape every client's data uses.

export type FieldType =
  | "text"
  | "long_text"
  | "number"
  | "boolean"
  | "date"
  | "email"
  | "phone"
  | "choice"
  | "multi_choice"
  | "file";

export interface Constraints {
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min_selected?: number;
  max_selected?: number;
  accepted?: string[]; // permitted file extensions
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  constraints?: Constraints;
  sensitivity?: string;
  /** May appear as a filter in this client's work queues. */
  filterable?: boolean;
  /** May be used to sort this client's work queues. */
  sortable?: boolean;
  /** Management groups and summarises by this field. */
  reporting_dimension?: boolean;
}

export interface Definition {
  client: string;
  record_type: string;
  /**
   * Required, not optional. Definitions change while records are still open,
   * so a record has to be able to say which version it was created under.
   */
  version: number;
  fields: FieldDefinition[];
}

/** A single submitted record: field name -> submitted value. */
export type Record = { [key: string]: unknown };

/** Machine-readable reason a field failed. */
export type ErrorCode =
  | "required"
  | "type"
  | "too_short"
  | "too_long"
  | "min"
  | "max"
  | "pattern"
  | "not_in_options"
  | "not_array"
  | "too_few_selected"
  | "too_many_selected"
  | "bad_option"
  | "bad_extension"
  | "bad_date"
  | "bad_email"
  | "bad_phone"
  | "unknown_field";

export interface ValidationError {
  field: string; // field name (key)
  label: string; // human label from the definition
  code: ErrorCode; // machine-readable reason
  message: string; // human-readable message
}

export interface ValidationWarning {
  field: string;
  code: "unknown_field";
  message: string;
}

export interface ValidationResult {
  valid: boolean; // true when there are no errors (warnings do not affect this)
  /** The definition version this record was checked against, for the caller to store. */
  version: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** How to treat record keys that no field defines. */
export type UnknownFieldPolicy = "warn" | "error" | "ignore";

export interface ValidateOptions {
  unknownFields?: UnknownFieldPolicy; // default "warn"
}

// ---- Part 2: form description ----

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  /** The HTML-ish input a frontend would render. */
  input:
    | "text"
    | "textarea"
    | "number"
    | "checkbox"
    | "date"
    | "email"
    | "tel"
    | "select"
    | "multiselect"
    | "file";
  required: boolean;
  options?: FormFieldOption[];
  multiple?: boolean; // true for multi_choice
  accept?: string[]; // file extensions, for file inputs
  constraints?: Constraints; // passed through for client-side hints
  sensitivity?: string;
}

export interface FormDescription {
  client: string;
  record_type: string;
  version: number;
  fields: FormField[];
}

// ---- Part 2b: index description ----

/** Why a field needs an index. A field can need one for more than one reason. */
export type IndexReason = "filter" | "sort" | "report";

export interface IndexedField {
  field: string;
  type: FieldType;
  reasons: IndexReason[];
}

export interface IndexDescription {
  client: string;
  record_type: string;
  version: number;
  /** Only the fields the client actually filters, sorts, or groups by. */
  indexes: IndexedField[];
}
