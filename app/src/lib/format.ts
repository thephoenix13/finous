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

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * "31 March" from "2027-03-31", with no year. English uses a fixed table, so it never depends on the runtime's locale data;
 * another language, for example "hi", uses Intl: "31 मार्च". Built from UTC, so no time zone can move the day.
 */
export function formatDayMonth(isoDate: string, locale?: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (locale && !locale.toLowerCase().startsWith("en")) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
  }
  return `${day} ${MONTHS_LONG[month - 1]}`;
}

/**
 * "A and B", "A, B, and C": a list in the language's own words, through Intl.ListFormat ("हिंदी" says "और").
 * An empty list is an empty string.
 */
export function formatList(items: string[], locale = "en"): string {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
}

/** "2027-12" as a `YearMonth`, the shape `addMonths` and `formatMonthYear` take. */
export function parseMonth(month: string): YearMonth {
  const [year, m] = month.split("-").map(Number);
  return { year, month: m };
}

/** A rate or share without trailing zeros, to at most two decimals: 8.9 is "8.9%", 9 is "9%", 8.256 is "8.26%". */
export function percent(value: number, maxDecimals = 2): string {
  return `${Number(value.toFixed(maxDecimals))}%`;
}

/** An amount in lakhs, for "₹8.8L" copy: the number only, to one decimal with no trailing zero (40 and 8.8). The unit is the caller's, as it is translated. */
export function toLakhs(amount: number, decimals = 1): string {
  return String(Number((amount / 100_000).toFixed(decimals)));
}

/**
 * Round to a number of significant figures (three by default), for estimates: 134,827 is 135,000 and 18,364 is 18,400.
 * One rule at every size, so a small figure is not shown as precisely as a large one, or the reverse.
 */
export function roundSig(value: number, digits = 3): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  const step = 10 ** (Math.floor(Math.log10(Math.abs(value))) - digits + 1);
  return Math.round(value / step) * step;
}

/** Round to a step, for "about ₹1,35,000" style copy. */
export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
