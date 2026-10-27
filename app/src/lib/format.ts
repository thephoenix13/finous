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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * "Tuesday, 29 September" from "2026-09-29". English uses fixed tables; another language uses Intl ("मंगलवार, 29 सितंबर").
 * Built from UTC, so no time zone can move the day.
 */
export function formatWeekdayDate(isoDate: string, locale?: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (locale && !locale.toLowerCase().startsWith("en")) {
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  }
  return `${WEEKDAYS[date.getUTCDay()]}, ${day} ${MONTHS_LONG[month - 1]}`;
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

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The day as a number of whole days since 1970, built from UTC so no time zone can move it. */
const dayNumber = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
};

export type WhenLabels = { today: string; yesterday: string };

/**
 * When something happened, relative to `asOf`: "Today", "Yesterday", the weekday within the last week ("Sun"), else the day and month.
 * English uses fixed tables; another language uses Intl. A day after `asOf` is written as a date, never as a weekday.
 */
export function formatWhen(isoDate: string, asOf: string, labels: WhenLabels, locale?: string): string {
  const age = dayNumber(asOf) - dayNumber(isoDate);
  if (age === 0) return labels.today;
  if (age === 1) return labels.yesterday;
  if (age >= 2 && age <= 6) {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (locale && !locale.toLowerCase().startsWith("en")) return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(date);
    return WEEKDAYS_SHORT[date.getUTCDay()];
  }
  return formatDayMonth(isoDate, locale);
}

/** "9:12 PM" from "21:12". English is a fixed 12-hour format; another language uses Intl. */
export function formatClock(time: string, locale?: string): string {
  const [hour, minute] = time.split(":").map(Number);
  if (locale && !locale.toLowerCase().startsWith("en")) {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(Date.UTC(1970, 0, 1, hour, minute)));
  }
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

/** "28th" for English, "28" for any other language (which words the day around the number). */
export function ordinalDay(day: number, locale?: string): string {
  if (locale && !locale.toLowerCase().startsWith("en")) return String(day);
  const lastTwo = day % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${day}${suffix}`;
}

/** A signed amount for a transaction: "−₹842" out, "+₹2,40,000" in. */
export function signedInr(amount: number): string {
  return amount > 0 ? `+${inr(amount)}` : inr(amount);
}
