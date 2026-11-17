import type { FeedField } from "../api/types";

export type MappingCheck = {
  /** Required fields with no column yet, by label. */
  missing: string[];
  /** A column used for more than one field: column to the labels that share it. */
  shared: Record<string, string[]>;
  /** Whether the mapping can be tested and saved: nothing required is missing and no column is shared. */
  ok: boolean;
};

/** Checks which fields still need a column, and whether one column was given to two fields. */
export function checkMapping(fields: readonly FeedField[], mapping: Record<string, string>): MappingCheck {
  const missing = fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.label);
  const byColumn = new Map<string, string[]>();
  for (const f of fields) {
    const column = mapping[f.key];
    if (column) byColumn.set(column, [...(byColumn.get(column) ?? []), f.label]);
  }
  const shared = Object.fromEntries([...byColumn].filter(([, labels]) => labels.length > 1));
  return { missing, shared, ok: missing.length === 0 && Object.keys(shared).length === 0 };
}

/** A mapping without its empty choices, so "not matched" is the same as absent when it is saved or compared. */
export const compactMapping = (mapping: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(mapping).filter(([, column]) => column !== ""));
