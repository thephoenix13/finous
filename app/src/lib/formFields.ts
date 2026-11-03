/**
 * Reading what someone typed into a form. Pure, so every rule is tested without a screen. A figure is never guessed:
 * a field that is blank and optional comes back as undefined, a field that is wrong comes back as an error, nothing is rounded silently.
 */
export type FieldType = "text" | "rupees" | "integer" | "percent" | "last4" | "month" | "select" | "switch";

export type FieldSpec = {
  key: string;
  type: FieldType;
  required?: boolean;
  /** Smallest and largest number (rupees, integer, percent). */
  min?: number;
  max?: number;
  /** The allowed values of a select. */
  options?: readonly string[];
  /** The screen shows a line of help under this field. */
  hint?: boolean;
};

export type FieldError = "required" | "invalid" | "range";
export type Errors = Record<string, FieldError>;
export type Read = { ok: true; values: Record<string, string | number | boolean | undefined> } | { ok: false; errors: Errors };

/**
 * Rupees as people write them: "240000", "2,40,000", "₹ 2,40,000", "2,40,000.00". Paise are not kept.
 * Undefined for blank; null for anything that is not a plain non-negative whole-rupee amount.
 */
export function parseRupees(text: string): number | undefined | null {
  if (text.trim() === "") return undefined;
  const t = text.trim().replace(/^₹\s*/, "");
  // Plain digits, Indian grouping (2,40,000) or Western grouping (240,000); ".00" is fine, other paise are not.
  if (!/^(\d+|\d{1,2}(,\d{2})*,\d{3}|\d{1,3}(,\d{3})+)(\.0+)?$/.test(t)) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

/** A whole number, no commas. */
export function parseInteger(text: string): number | undefined | null {
  const t = text.trim();
  if (t === "") return undefined;
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

/** A percent such as 8.5 (a trailing % is allowed). Up to two decimals. */
export function parsePercent(text: string): number | undefined | null {
  const t = text.trim().replace(/\s*%$/, "");
  if (t === "") return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Number(t);
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const LAST4 = /^\d{4}$/;

function readOne(spec: FieldSpec, raw: string): { value?: string | number | boolean } | { error: FieldError } {
  const blank = raw.trim() === "";
  if (spec.type === "switch") return { value: raw === "true" };
  if (blank) return spec.required ? { error: "required" } : { value: undefined };

  let value: string | number | undefined | null;
  switch (spec.type) {
    case "text":
      value = raw.trim();
      break;
    case "rupees":
      value = parseRupees(raw);
      break;
    case "integer":
      value = parseInteger(raw);
      break;
    case "percent":
      value = parsePercent(raw);
      break;
    case "last4":
      value = LAST4.test(raw.trim()) ? raw.trim() : null;
      break;
    case "month":
      value = MONTH.test(raw.trim()) ? raw.trim() : null;
      break;
    case "select":
      value = spec.options?.includes(raw) ? raw : null;
      break;
  }
  if (value === null || value === undefined) return { error: "invalid" };
  if (typeof value === "number") {
    if (spec.min !== undefined && value < spec.min) return { error: "range" };
    if (spec.max !== undefined && value > spec.max) return { error: "range" };
  }
  return { value };
}

/** Checks every field and returns either all the values or all the errors, so the person sees everything to fix at once. */
export function readFields(specs: readonly FieldSpec[], raw: Record<string, string>): Read {
  const values: Record<string, string | number | boolean | undefined> = {};
  const errors: Errors = {};
  for (const spec of specs) {
    const result = readOne(spec, raw[spec.key] ?? "");
    if ("error" in result) errors[spec.key] = result.error;
    else values[spec.key] = result.value;
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };
}

/** A number as it goes back into a field to be edited: plain digits. */
export const toField = (n: number | undefined): string => (n === undefined ? "" : String(n));
