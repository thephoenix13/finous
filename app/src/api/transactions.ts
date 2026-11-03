import type { Transaction, TransactionPage, TransactionQuery } from "./types";

/** Newest first: by date, then time (a missing time counts as midnight), then id so the order is stable. */
export function newestFirst(a: Transaction, b: Transaction): number {
  return b.date.localeCompare(a.date) || (b.time ?? "00:00").localeCompare(a.time ?? "00:00") || b.id.localeCompare(a.id);
}

/** Filters, orders and pages a list of transactions the way every Api must: search is trimmed and case-insensitive, `limit` only cuts the page. */
export function queryTransactions(all: Transaction[], { search, accountId, limit }: TransactionQuery = {}): TransactionPage {
  const needle = search?.trim().toLowerCase();
  const matches = all
    .filter((t) => (!accountId || t.accountId === accountId) && (!needle || t.description.toLowerCase().includes(needle)))
    .sort(newestFirst);
  return { items: limit === undefined ? matches : matches.slice(0, Math.max(0, limit)), total: matches.length };
}
