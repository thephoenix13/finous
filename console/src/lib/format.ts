/** 1,24,000 the way Indian readers group digits. */
export const formatCount = (n: number): string => n.toLocaleString("en-IN");

/** "6 Nov 2026" from an ISO date or time. UTC, so the same moment reads the same everywhere. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** A whole-number percentage, or a dash when there is nothing to divide by. */
export const formatPercent = (value: number | null): string => (value === null ? "–" : `${Math.round(value)}%`);
