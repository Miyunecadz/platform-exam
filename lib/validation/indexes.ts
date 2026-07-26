// Part 2b — work out which fields this client needs an index on.
//
// The flexible fields live in one JSON document per record, so nothing is
// indexed by default. A field earns an index only if the client's own
// definition says they filter, sort, or group by it. Same input, no client
// knowledge: change the definition and the answer changes with it.
//
// This exists so the three flags are read by something. A flag nothing
// consumes is a comment with extra steps.

import type {
  Definition,
  FieldDefinition,
  IndexDescription,
  IndexReason,
  IndexedField,
} from "./types";

function reasonsFor(field: FieldDefinition): IndexReason[] {
  const reasons: IndexReason[] = [];
  if (field.filterable) reasons.push("filter");
  if (field.sortable) reasons.push("sort");
  if (field.reporting_dimension) reasons.push("report");
  return reasons;
}

export function describeIndexes(definition: Definition): IndexDescription {
  const indexes: IndexedField[] = [];

  for (const field of definition.fields) {
    const reasons = reasonsFor(field);
    if (reasons.length === 0) continue; // no index — the common case
    indexes.push({ field: field.name, type: field.type, reasons });
  }

  return {
    client: definition.client,
    record_type: definition.record_type,
    version: definition.version,
    indexes,
  };
}
