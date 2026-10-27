/** The most recent statement date and the payment due date after it, for a card, as of a day. Dates are ISO ("2026-09-28"). */
export type CardCycle = { statement: string; due: string };

const pad = (n: number) => String(n).padStart(2, "0");
/** The last day of a month; `month` is 1 to 12. */
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
/** A day of the month, held to the month's last day (the 31st in a 30-day month is the 30th). */
const onDay = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(Math.min(day, daysIn(year, month)))}`;
const shift = (year: number, month: number, by: number) => {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

/**
 * The statement is the latest one on or before `asOf`; the payment falls on the first due day after it. A card whose statement
 * is the 28th and due day the 15th, as of 29 September, has its statement on 28 September and falls due on 15 October.
 */
export function cardCycle(asOf: string, statementDay: number, dueDay: number): CardCycle {
  const [year, month] = asOf.split("-").map(Number);
  const thisMonth = onDay(year, month, statementDay);
  const statementMonth = thisMonth <= asOf ? { year, month } : shift(year, month, -1);
  const statement = onDay(statementMonth.year, statementMonth.month, statementDay);

  let due = onDay(statementMonth.year, statementMonth.month, dueDay);
  if (due <= statement) {
    const next = shift(statementMonth.year, statementMonth.month, 1);
    due = onDay(next.year, next.month, dueDay);
  }
  return { statement, due };
}
