/** 1,24,000 the way Indian readers group digits. */
export const formatCount = (n: number): string => n.toLocaleString("en-IN");

/** ₹28,50,000: rupees, with digits grouped the Indian way. Whole rupees only. */
export const formatRupees = (n: number): string => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** "6 Nov 2026" from an ISO date or time. UTC, so the same moment reads the same everywhere. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** A whole-number percentage, or a dash when there is nothing to divide by. */
export const formatPercent = (value: number | null): string => (value === null ? "–" : `${Math.round(value)}%`);

/** "17 Nov 2026, 7:30 am" in Indian time, which is what a bank's staff expect to read. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
