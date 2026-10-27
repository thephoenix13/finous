/**
 * Finous finance maths. Pure functions, no dependencies, no formatting.
 *
 * Conventions
 *  - Money is a plain number of rupees. Never round inside this module; round when you display.
 *  - Rates are annual percentages (8.9 means 8.9% a year), compounded monthly.
 *  - Months are fractional where the maths is fractional (for example a loan that ends part-way
 *    through its last month). Round at the edge, for display.
 *  - Invalid input throws RangeError. A loan that can never be repaid reports `Infinity` months.
 *
 * Extracted from Prototype v2, where these figures were audited by hand.
 */

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be a positive number`);
}

function assertRate(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be zero or more`);
}

/** Monthly rate as a fraction, from an annual percentage. */
const monthlyRate = (annualRatePct: number): number => annualRatePct / 1200;

/** Monthly instalment for a loan repaid in equal EMIs. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  assertPositive("principal", principal);
  assertRate("annualRatePct", annualRatePct);
  assertPositive("months", months);
  const r = monthlyRate(annualRatePct);
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/**
 * Months left to clear `balance` paying `monthlyEmi` a month.
 * Returns Infinity when the instalment does not even cover the interest.
 */
export function monthsToClose(balance: number, annualRatePct: number, monthlyEmi: number): number {
  assertPositive("balance", balance);
  assertRate("annualRatePct", annualRatePct);
  assertPositive("monthlyEmi", monthlyEmi);
  const r = monthlyRate(annualRatePct);
  if (r === 0) return balance / monthlyEmi;
  if (monthlyEmi <= balance * r) return Infinity;
  return -Math.log(1 - (balance * r) / monthlyEmi) / Math.log(1 + r);
}

export type LoanSummary = {
  emi: number;
  totalPaid: number;
  totalInterest: number;
};

/** What a loan costs over its life, at a given amount, rate and tenure. */
export function loanSummary(principal: number, annualRatePct: number, months: number): LoanSummary {
  const monthly = emi(principal, annualRatePct, months);
  const totalPaid = monthly * months;
  return { emi: monthly, totalPaid, totalInterest: totalPaid - principal };
}

export type PrepayInput = {
  /** Outstanding principal today. */
  balance: number;
  annualRatePct: number;
  /** The EMI you keep paying. Prepaying shortens the loan; it does not lower the EMI. */
  emi: number;
  /** One-off extra payment made today. */
  amount: number;
};

export type PrepayResult = {
  monthsBefore: number;
  monthsAfter: number;
  monthsSaved: number;
  /** Total paid without prepaying, minus total paid with it (the prepayment itself included). */
  interestSaved: number;
};

/** Effect of a one-off prepayment with the EMI unchanged. */
export function prepay({ balance, annualRatePct, emi: monthlyEmi, amount }: PrepayInput): PrepayResult {
  assertPositive("amount", amount);
  const monthsBefore = monthsToClose(balance, annualRatePct, monthlyEmi);
  const monthsAfter = amount >= balance ? 0 : monthsToClose(balance - amount, annualRatePct, monthlyEmi);
  const paidBefore = monthlyEmi * monthsBefore;
  const paidAfter = monthlyEmi * monthsAfter + Math.min(amount, balance);
  return {
    monthsBefore,
    monthsAfter,
    monthsSaved: monthsBefore - monthsAfter,
    interestSaved: paidBefore - paidAfter,
  };
}

export type RefinanceInput = {
  balance: number;
  currentRatePct: number;
  newRatePct: number;
  /** Months left on the current loan. The new loan runs for the same time. */
  monthsLeft: number;
  /** Processing, legal and stamp costs paid up front to switch. */
  upfrontCost: number;
};

export type RefinanceResult = {
  currentEmi: number;
  newEmi: number;
  monthlySaving: number;
  annualSaving: number;
  /** Months of savings needed to recover the upfront cost. Infinity if switching saves nothing. */
  breakEvenMonths: number;
};

/** Should I switch lenders? Same balance and remaining term, new rate. */
export function refinance({ balance, currentRatePct, newRatePct, monthsLeft, upfrontCost }: RefinanceInput): RefinanceResult {
  assertRate("upfrontCost", upfrontCost);
  const currentEmi = emi(balance, currentRatePct, monthsLeft);
  const newEmi = emi(balance, newRatePct, monthsLeft);
  const monthlySaving = currentEmi - newEmi;
  return {
    currentEmi,
    newEmi,
    monthlySaving,
    annualSaving: monthlySaving * 12,
    breakEvenMonths: monthlySaving > 0 ? upfrontCost / monthlySaving : Infinity,
  };
}

/** Value of a lump sum plus monthly contributions (paid at month-end) after `months`. */
export function futureValue(present: number, monthlyContribution: number, annualRatePct: number, months: number): number {
  assertRate("present", present);
  assertRate("monthlyContribution", monthlyContribution);
  assertRate("annualRatePct", annualRatePct);
  assertPositive("months", months);
  const r = monthlyRate(annualRatePct);
  if (r === 0) return present + monthlyContribution * months;
  const growth = Math.pow(1 + r, months);
  return present * growth + monthlyContribution * ((growth - 1) / r);
}

export type GoalInput = {
  target: number;
  saved: number;
  annualReturnPct: number;
  months: number;
};

/** Monthly contribution (month-end) needed to reach `target`. Zero if already on track. */
export function monthlyContributionForGoal({ target, saved, annualReturnPct, months }: GoalInput): number {
  assertPositive("target", target);
  assertRate("saved", saved);
  assertRate("annualReturnPct", annualReturnPct);
  assertPositive("months", months);
  const r = monthlyRate(annualReturnPct);
  if (r === 0) return Math.max(0, (target - saved) / months);
  const growth = Math.pow(1 + r, months);
  return Math.max(0, (target - saved * growth) / ((growth - 1) / r));
}

/** Months of essential expenses the savings would cover. */
export function bufferMonths(savings: number, monthlyEssentials: number): number {
  assertRate("savings", savings);
  assertPositive("monthlyEssentials", monthlyEssentials);
  return savings / monthlyEssentials;
}

/** Tax saved by a deduction at a slab rate, including health and education cess (4% by default). */
export function taxSaving(deduction: number, slabPct: number, cessPct = 4): number {
  assertRate("deduction", deduction);
  assertRate("slabPct", slabPct);
  assertRate("cessPct", cessPct);
  return (deduction * slabPct) / 100 * (1 + cessPct / 100);
}

export type YearMonth = { year: number; month: number };

/** Calendar month `monthsAhead` after `from`. `month` is 1 to 12. Fractions round to the nearest month. */
export function addMonths(from: YearMonth, monthsAhead: number): YearMonth {
  if (!Number.isFinite(monthsAhead)) throw new RangeError("monthsAhead must be finite");
  const index = from.year * 12 + (from.month - 1) + Math.round(monthsAhead);
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
