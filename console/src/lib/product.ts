import type { Product, ProductDraft, ProductKind } from "../api/types";

/** The product form as typed: numbers are still text until they are checked. */
export type ProductForm = {
  name: string;
  kind: ProductKind | "";
  rate: string;
  tenureMin: string;
  tenureMax: string;
  eligibility: string;
  fees: string;
  disclosureEn: string;
  disclosureHi: string;
  live: boolean;
};

export type ProductErrors = Partial<Record<keyof ProductForm, string>>;

export const EMPTY_PRODUCT: ProductForm = { name: "", kind: "", rate: "", tenureMin: "", tenureMax: "", eligibility: "", fees: "", disclosureEn: "", disclosureHi: "", live: false };

export const formFromProduct = (p: Product): ProductForm => ({
  name: p.name,
  kind: p.kind,
  rate: String(p.rate),
  tenureMin: String(p.tenureMin),
  tenureMax: String(p.tenureMax),
  eligibility: p.eligibility,
  fees: p.fees,
  disclosureEn: p.disclosureEn,
  disclosureHi: p.disclosureHi,
  live: p.live,
});

const MAX_RATE = 36;
const MAX_TENURE_MONTHS = 600;

/** A number typed by a person: digits and one point, nothing else. Null if it isn't one. */
function number(text: string): number | null {
  const t = text.trim();
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

/** Customers are told "Learn more", never "Apply": the app does not take applications. */
const APPLY = /\bapply(ing)?\b/i;

/**
 * Checks the product form. Returns the product ready to save when everything is fine, or what is wrong, field by field.
 * The Hindi disclosure is required only when the bank has Hindi turned on, because customers will see it.
 */
export function parseProduct(form: ProductForm, options: { hindiRequired: boolean; id?: string }): { ok: true; draft: ProductDraft } | { ok: false; errors: ProductErrors } {
  const errors: ProductErrors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = "Give the product a name, at least 2 characters.";
  else if (name.length > 60) errors.name = "Use 60 characters or fewer.";

  if (form.kind === "") errors.kind = "Choose loan or deposit.";

  const rate = number(form.rate);
  if (rate === null) errors.rate = "Enter the rate as a number, such as 8.75.";
  else if (rate <= 0 || rate > MAX_RATE) errors.rate = `Enter a rate above 0 and up to ${MAX_RATE}.`;

  const min = number(form.tenureMin);
  const max = number(form.tenureMax);
  if (min === null || !Number.isInteger(min) || min < 1) errors.tenureMin = "Enter the shortest term in whole months.";
  else if (min > MAX_TENURE_MONTHS) errors.tenureMin = `Use ${MAX_TENURE_MONTHS} months or fewer.`;
  if (max === null || !Number.isInteger(max) || max < 1) errors.tenureMax = "Enter the longest term in whole months.";
  else if (max > MAX_TENURE_MONTHS) errors.tenureMax = `Use ${MAX_TENURE_MONTHS} months or fewer.`;
  else if (min !== null && !errors.tenureMin && max < min) errors.tenureMax = "The longest term can't be shorter than the shortest.";

  if (form.eligibility.trim().length < 10) errors.eligibility = "Say who can have it, at least 10 characters.";
  if (form.fees.trim().length < 3) errors.fees = "Say what it costs, or that there is no fee.";

  const en = form.disclosureEn.trim();
  if (en.length < 20) errors.disclosureEn = "Write the disclosure customers will read, at least 20 characters.";
  else if (APPLY.test(en)) errors.disclosureEn = "Say Learn more, not Apply. The app doesn't take applications.";

  const hi = form.disclosureHi.trim();
  if (options.hindiRequired && hi.length < 20) errors.disclosureHi = "Your app is in Hindi too, so write the disclosure in Hindi as well.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    draft: {
      ...(options.id ? { id: options.id } : {}),
      name,
      kind: form.kind as ProductKind,
      rate: rate!,
      tenureMin: min!,
      tenureMax: max!,
      eligibility: form.eligibility.trim(),
      fees: form.fees.trim(),
      disclosureEn: en,
      disclosureHi: hi,
      live: form.live,
    },
  };
}

/** "5 years", "18 months", "1 year 6 months": a term in months, said the way people say it. */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years === 0 ? "" : `${years} year${years === 1 ? "" : "s"}`;
  const m = rest === 0 ? "" : `${rest} month${rest === 1 ? "" : "s"}`;
  return [y, m].filter(Boolean).join(" ");
}
