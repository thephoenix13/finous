import { describe, expect, it } from "vitest";
import {
  addMonths,
  bufferMonths,
  emi,
  futureValue,
  loanSummary,
  monthlyContributionForGoal,
  monthsToClose,
  prepay,
  refinance,
  taxSaving,
} from "./finance";
import { formatMonthYear, inr, roundTo } from "./format";

/**
 * The persona's home loan, from Prototype v2: ₹62,00,000 outstanding at 8.9%, 17.5 years (210 months) left.
 * Every expected number below is a figure the prototype shows, so these tests keep the app and the
 * prototype in agreement.
 */
const LOAN = { balance: 6_200_000, ratePct: 8.9, months: 210 };
const LOAN_EMI = emi(LOAN.balance, LOAN.ratePct, LOAN.months);

describe("emi", () => {
  it("matches the persona's EMI of ₹58,345", () => {
    expect(Math.round(LOAN_EMI)).toBe(58_345);
  });

  it("falls with a lower rate", () => {
    expect(Math.round(emi(LOAN.balance, 8.5, LOAN.months))).toBe(56_822);
  });

  it("is straight division at a zero rate", () => {
    expect(emi(1_200_000, 0, 120)).toBe(10_000);
  });

  it("matches a textbook figure: 10L at 10% over 10 years", () => {
    expect(emi(1_000_000, 10, 120)).toBeCloseTo(13_215.07, 1);
  });

  it("rejects invalid input", () => {
    expect(() => emi(0, 8.9, 210)).toThrow(RangeError);
    expect(() => emi(-1, 8.9, 210)).toThrow(RangeError);
    expect(() => emi(100, -1, 210)).toThrow(RangeError);
    expect(() => emi(100, 8.9, 0)).toThrow(RangeError);
    expect(() => emi(Number.NaN, 8.9, 12)).toThrow(RangeError);
  });
});

describe("loanSummary", () => {
  it("matches the EMI calculator defaults", () => {
    const s = loanSummary(LOAN.balance, LOAN.ratePct, LOAN.months);
    expect(inr(s.emi)).toBe("₹58,345");
    expect(inr(s.totalInterest)).toBe("₹60,52,518");
    expect(inr(s.totalPaid)).toBe("₹1,22,52,518");
  });

  it("total paid equals principal plus interest", () => {
    const s = loanSummary(500_000, 11, 60);
    expect(s.totalPaid).toBeCloseTo(500_000 + s.totalInterest, 6);
  });
});

describe("monthsToClose", () => {
  it("recovers the original tenure from the EMI", () => {
    expect(monthsToClose(LOAN.balance, LOAN.ratePct, LOAN_EMI)).toBeCloseTo(210, 6);
  });

  it("is straight division at a zero rate", () => {
    expect(monthsToClose(120_000, 0, 10_000)).toBe(12);
  });

  it("never closes if the EMI does not cover the interest", () => {
    const interestOnly = LOAN.balance * (LOAN.ratePct / 1200);
    expect(monthsToClose(LOAN.balance, LOAN.ratePct, interestOnly)).toBe(Infinity);
    expect(monthsToClose(LOAN.balance, LOAN.ratePct, interestOnly - 1)).toBe(Infinity);
  });

  it("a bigger EMI closes sooner", () => {
    expect(monthsToClose(LOAN.balance, LOAN.ratePct, LOAN_EMI * 1.5)).toBeLessThan(210);
  });
});

describe("prepay", () => {
  const run = (amount: number) =>
    prepay({ balance: LOAN.balance, annualRatePct: LOAN.ratePct, emi: LOAN_EMI, amount });

  it("₹50,000 saves 4 months and about ₹1,83,378 (prototype Prepay screen)", () => {
    const r = run(50_000);
    expect(Math.round(r.monthsSaved)).toBe(4);
    expect(Math.round(r.interestSaved)).toBe(183_378);
  });

  it("₹1,00,000 saves 8 months and about ₹3,60,055", () => {
    const r = run(100_000);
    expect(Math.round(r.monthsSaved)).toBe(8);
    expect(Math.round(r.interestSaved)).toBe(360_055);
  });

  it("closes the loan on the new date: 210 months becomes 206", () => {
    expect(Math.round(run(50_000).monthsAfter)).toBe(206);
  });

  it("saves more the more you prepay", () => {
    expect(run(100_000).interestSaved).toBeGreaterThan(run(50_000).interestSaved);
  });

  it("paying off the whole balance ends the loan now", () => {
    const r = run(LOAN.balance);
    expect(r.monthsAfter).toBe(0);
    expect(r.interestSaved).toBeGreaterThan(0);
  });

  it("paying more than the balance is treated as paying it off", () => {
    expect(run(LOAN.balance * 2).interestSaved).toBeCloseTo(run(LOAN.balance).interestSaved, 6);
  });

  it("rejects a zero prepayment", () => {
    expect(() => run(0)).toThrow(RangeError);
  });
});

describe("refinance", () => {
  const run = (newRatePct: number) =>
    refinance({
      balance: LOAN.balance,
      currentRatePct: LOAN.ratePct,
      newRatePct,
      monthsLeft: LOAN.months,
      upfrontCost: 39_000,
    });

  it("8.9% to 8.5% saves about ₹1,523 a month (prototype Refinance screen)", () => {
    const r = run(8.5);
    expect(Math.round(r.monthlySaving)).toBe(1_523);
    expect(Math.round(r.annualSaving)).toBe(18_275);
  });

  it("breaks even in 26 months on ₹39,000 upfront", () => {
    expect(Math.ceil(run(8.5).breakEvenMonths)).toBe(26);
  });

  it("current EMI is the persona's EMI", () => {
    expect(Math.round(run(8.5).currentEmi)).toBe(58_345);
  });

  it("saves nothing at the same rate, and never breaks even", () => {
    const r = run(8.9);
    expect(r.monthlySaving).toBeCloseTo(0, 9);
    expect(r.breakEvenMonths).toBe(Infinity);
  });

  it("a higher rate costs more, and never breaks even", () => {
    const r = run(9.5);
    expect(r.monthlySaving).toBeLessThan(0);
    expect(r.breakEvenMonths).toBe(Infinity);
  });
});

describe("goals", () => {
  it("house down payment: ₹31,400 a month for ₹30L in 5 years from ₹6L at 6%", () => {
    const c = monthlyContributionForGoal({ target: 3_000_000, saved: 600_000, annualReturnPct: 6, months: 60 });
    expect(roundTo(c, 100)).toBe(31_400);
  });

  it("home upgrade: about ₹1,35,000 a month to reach ₹30L in 15 months from ₹8.4L", () => {
    const c = monthlyContributionForGoal({ target: 3_000_000, saved: 840_000, annualReturnPct: 6, months: 15 });
    expect(roundTo(c, 1_000)).toBe(135_000);
  });

  it("home upgrade at today's ₹25,000 a month reaches about ₹12.9L", () => {
    expect(roundTo(futureValue(840_000, 25_000, 6, 15), 10_000)).toBe(1_290_000);
  });

  it("moving the target to Dec 2029 (39 months) needs about ₹46,000 a month", () => {
    const c = monthlyContributionForGoal({ target: 3_000_000, saved: 840_000, annualReturnPct: 6, months: 39 });
    expect(roundTo(c, 1_000)).toBe(46_000);
  });

  it("education fund: about ₹18,400 a month", () => {
    const c = monthlyContributionForGoal({ target: 5_000_000, saved: 620_000, annualReturnPct: 6, months: 141 });
    expect(roundTo(c, 100)).toBe(18_400);
  });

  it("contributions reach the target when fed back into futureValue", () => {
    const goal = { target: 3_000_000, saved: 600_000, annualReturnPct: 6, months: 60 };
    const c = monthlyContributionForGoal(goal);
    expect(futureValue(goal.saved, c, goal.annualReturnPct, goal.months)).toBeCloseTo(goal.target, 4);
  });

  it("needs nothing when the lump sum alone gets there", () => {
    expect(monthlyContributionForGoal({ target: 1_000_000, saved: 1_000_000, annualReturnPct: 6, months: 12 })).toBe(0);
  });

  it("is straight division at a zero return", () => {
    expect(monthlyContributionForGoal({ target: 120_000, saved: 0, annualReturnPct: 0, months: 12 })).toBe(10_000);
    expect(futureValue(10_000, 1_000, 0, 12)).toBe(22_000);
  });
});

describe("bufferMonths and taxSaving", () => {
  it("₹4.2L over ₹1,19,145 of essentials is 3.5 months", () => {
    expect(bufferMonths(420_000, 119_145).toFixed(1)).toBe("3.5");
  });

  it("after a ₹50,000 prepayment the buffer is 3.1 months", () => {
    expect(bufferMonths(420_000 - 50_000, 119_145).toFixed(1)).toBe("3.1");
  });

  it("₹56,000 of 80C at the 30% slab saves ₹17,472 with cess", () => {
    expect(taxSaving(56_000, 30)).toBeCloseTo(17_472, 6);
  });

  it("cess can be switched off", () => {
    expect(taxSaving(100_000, 30, 0)).toBe(30_000);
  });
});

describe("addMonths", () => {
  it("210 months after Sep 2026 is Mar 2044 (the loan's end)", () => {
    expect(addMonths({ year: 2026, month: 9 }, 210)).toEqual({ year: 2044, month: 3 });
  });

  it("206 months after Sep 2026 is Nov 2043 (after a ₹50,000 prepayment)", () => {
    expect(formatMonthYear(addMonths({ year: 2026, month: 9 }, 206))).toBe("Nov 2043");
  });

  it("crosses year boundaries both ways", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
    expect(addMonths({ year: 2026, month: 9 }, 0)).toEqual({ year: 2026, month: 9 });
  });

  it("rounds fractional months to the nearest", () => {
    expect(addMonths({ year: 2026, month: 9 }, 209.99)).toEqual({ year: 2044, month: 3 });
  });
});

describe("inr", () => {
  it("uses Indian digit grouping", () => {
    expect(inr(6_200_000)).toBe("₹62,00,000");
    expect(inr(186_400)).toBe("₹1,86,400");
    expect(inr(12_252_518)).toBe("₹1,22,52,518");
    expect(inr(999)).toBe("₹999");
    expect(inr(0)).toBe("₹0");
  });

  it("rounds to the nearest rupee", () => {
    expect(inr(58_345.32)).toBe("₹58,345");
    expect(inr(58_345.5)).toBe("₹58,346");
  });

  it("marks negatives with a true minus sign", () => {
    expect(inr(-842)).toBe("−₹842");
    expect(inr(-0.2)).toBe("₹0");
  });
});

describe("roundTo", () => {
  it("rounds to the nearest step", () => {
    expect(roundTo(31_399.4, 100)).toBe(31_400);
    expect(roundTo(134_827, 1_000)).toBe(135_000);
  });
});
