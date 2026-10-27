import type { YearMonth } from "./finance";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Rupees with Indian digit grouping, rounded to the nearest rupee: ₹62,00,000.
 * Negatives use a true minus sign, as in the prototype: −₹842.
 */
export function inr(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const text = `₹${rounded.toLocaleString("en-IN")}`;
  return amount < 0 && rounded !== 0 ? `−${text}` : text;
}

/**
 * "Mar 2044". English uses a fixed table, so it never depends on the runtime's locale data
 * (en-IN spells September "Sept"). Another language, for example "hi", uses Intl: "नव॰ 2043".
 */
export function formatMonthYear({ year, month }: YearMonth, locale?: string): string {
  if (locale && !locale.toLowerCase().startsWith("en")) {
    return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  return `${MONTHS[month - 1]} ${year}`;
}

/** Round to a step, for "about ₹1,35,000" style copy. */
export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
