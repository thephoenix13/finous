import { describe, expect, it } from "vitest";
import { persona } from "../api/persona";
import {
  buildAccounts,
  buildCashFlow,
  buildGoals,
  buildHealthScore,
  buildInsights,
  buildNetWorth,
  buildNetWorthHistory,
  buildTax,
  deriveMember,
  financialYear,
  monthsBetween,
} from "./derive";
import type { MarketRates, MemberAccount, MemberInput, MonthlyFigures } from "./types";

const ASOF = "2026-09-29";

/** Aarav's own inputs, as a member would have entered them. */
const accounts: MemberAccount[] = [
  { kind: "bank", id: "hdfc", name: "HDFC Bank", last4: "4821", balance: 284_000 },
  { kind: "bank", id: "sbi", name: "State Bank of India", last4: "7723", balance: 136_000 },
  { kind: "loan", id: "hdfc-home", name: "HDFC Home Loan", loanType: "home", outstanding: 6_200_000, ratePercent: 8.9, monthsLeft: 210, originalAmount: 10_000_000, startedOn: "2025-03" },
  { kind: "card", id: "icici-cc", name: "ICICI Amazon Pay", last4: "4419", outstanding: 18_400, limit: 300_000, statementDay: 28, dueDay: 15, autoPay: false },
  { kind: "investment", id: "groww", name: "Groww Mutual Funds", instrument: "mutual-funds", value: 2_480_000, activeSips: 9 },
  { kind: "investment", id: "zerodha", name: "Zerodha Holdings", instrument: "stocks", value: 840_000, holdings: 14 },
  { kind: "investment", id: "ppf", name: "PPF Account", instrument: "ppf", value: 620_000, institution: "HDFC", openedYear: 2019 },
  { kind: "other", id: "home", name: "Flat", assetKind: "property", value: 9_500_000 },
];
const september: MonthlyFigures = { month: "2026-09", income: 240_000, rent: 42_600, food: 18_200, other: 32_255, sips: 35_000 };
const rates: MarketRates = { homeLoan: 8.5, fixedDeposit12m: 7.1, savings: 3, asOf: "2026-09-29" };

const input = (over: Partial<MemberInput> = {}): MemberInput => ({
  asOf: ASOF,
  profile: persona.profile,
  accounts,
  monthly: [september],
  goals: [],
  rates,
  snapshots: [],
  ...over,
});

describe("cross-check against the persona (figures that come from a formula)", () => {
  const view = deriveMember(input());

  it("reaches the persona's net worth, assets and liabilities", () => {
    expect(view.netWorth.value).toBe(persona.netWorth.value);
    expect(view.netWorth.assets).toBe(persona.netWorth.assets);
    expect(view.netWorth.liabilities).toBe(persona.netWorth.liabilities);
    expect(view.netWorth.allocation).toEqual(persona.netWorth.allocation);
  });

  it("reaches the persona's month: EMI, outflow, saved and the categories", () => {
    expect(view.cashFlow).toMatchObject({ income: 240_000, outflow: 186_400, saved: 53_600 });
    expect(view.cashFlow!.categories).toEqual(persona.cashFlow.categories);
  });

  it("works the loan out as the persona does", () => {
    expect(view.accounts.loans[0]).toMatchObject({ emi: 58_345, endsOn: "2044-03", repaidPercent: 38 });
    expect(view.accounts.loans[0]).toMatchObject({ emi: persona.accounts.loans[0].emi, endsOn: persona.accounts.loans[0].endsOn });
  });

  it("finds the persona's refinance saving of ₹1,523 a month, ₹39,000 upfront, back in 26 months", () => {
    const refi = view.insights.find((i) => i.kind === "refinance");
    const theirs = persona.insights.find((i) => i.kind === "refinance");
    expect(refi).toMatchObject({ monthlySaving: 1_523, upfrontCost: 39_000, breakEvenMonths: 26, costs: { processingFee: 31_000, documentation: 8_000 } });
    expect(refi).toMatchObject({ monthlySaving: (theirs as { monthlySaving: number }).monthlySaving, annualSaving: (theirs as { annualSaving: number }).annualSaving });
  });

  it("finds the persona's emergency fund: ₹7,20,000 target, ₹50,000 a month, by March 2027", () => {
    const ef = view.insights.find((i) => i.kind === "emergency-fund");
    const theirs = persona.insights.find((i) => i.kind === "emergency-fund");
    expect(ef).toMatchObject({ targetAmount: 720_000, monthlyAmount: 50_000, targetDate: "2027-03", heldAmount: 420_000, essentialsPerMonth: 119_145 });
    expect(ef).toMatchObject({ targetAmount: (theirs as { targetAmount: number }).targetAmount, monthlyAmount: (theirs as { monthlyAmount: number }).monthlyAmount, targetDate: (theirs as { targetDate: string }).targetDate });
  });

  it("differs from the persona on the deposit on purpose: it keeps three months of essentials, not half", () => {
    const deposit = view.insights.find((i) => i.kind === "deposit");
    // 420,000 − 3 × 119,145 = 62,565, rounded down to 60,000. At 4.1% more: ₹2,460 a year.
    expect(deposit).toMatchObject({ amount: 60_000, bufferLeft: 360_000, extraPerYear: 2_460, termMonths: 12 });
  });

  it("has the persona's home screen: net worth, month and two things to look at", () => {
    expect(view.home.netWorth.value).toBe(persona.home.netWorth.value);
    expect(view.home.month).toMatchObject({ income: 240_000, saved: 53_600 });
    expect(view.home.lookAt.map((i) => i.kind)).toEqual(["refinance", "deposit"]);
  });
});

describe("accounts", () => {
  it("leaves out what it cannot know instead of making it up", () => {
    const { overview } = buildAccounts([{ kind: "loan", id: "l", name: "Car loan", loanType: "car", outstanding: 500_000, ratePercent: 9, monthsLeft: 36 }], ASOF);
    expect(overview.loans[0].startedOn).toBeUndefined();
    expect(overview.loans[0].repaidPercent).toBeUndefined();
    expect(overview.loans[0].endsOn).toBe("2029-09");
  });

  it("uses the instalment the person gave, else works it out", () => {
    const given = buildAccounts([{ kind: "loan", id: "l", name: "L", loanType: "personal", outstanding: 100_000, ratePercent: 12, monthsLeft: 12, emi: 9_000 }], ASOF);
    expect(given.overview.loans[0].emi).toBe(9_000);
    const worked = buildAccounts([{ kind: "loan", id: "l", name: "L", loanType: "personal", outstanding: 100_000, ratePercent: 12, monthsLeft: 12 }], ASOF);
    expect(worked.overview.loans[0].emi).toBe(8_885);
  });

  it("keeps the repaid percent between 0 and 100", () => {
    const over = buildAccounts([{ kind: "loan", id: "l", name: "L", loanType: "home", outstanding: 200, ratePercent: 8, monthsLeft: 12, originalAmount: 100 }], ASOF);
    expect(over.overview.loans[0].repaidPercent).toBe(0);
  });

  it("leaves the card's minimum due absent unless given", () => {
    const { overview } = buildAccounts([accounts[3], { ...(accounts[3] as Extract<MemberAccount, { kind: "card" }>), id: "c2", minimumDue: 900 }], ASOF);
    expect(overview.cards.map((c) => c.minimumDue)).toEqual([undefined, 900]);
  });

  it("sorts accounts into their groups and keeps other assets out of the lists", () => {
    const { overview, all } = buildAccounts(accounts, ASOF);
    expect([overview.bank.length, overview.loans.length, overview.cards.length, overview.investments.length]).toEqual([2, 1, 1, 3]);
    expect(all).toHaveLength(7);
  });
});

describe("net worth", () => {
  it("is zero with an empty allocation when there is nothing", () => {
    expect(buildNetWorth([], [], ASOF)).toMatchObject({ value: 0, assets: 0, liabilities: 0, allocation: [] });
  });

  it("can be negative, when debts exceed assets", () => {
    const n = buildNetWorth([{ kind: "bank", id: "b", name: "B", last4: "1111", balance: 10_000 }, { kind: "card", id: "c", name: "C", last4: "2222", outstanding: 50_000, limit: 100_000, statementDay: 1, dueDay: 20, autoPay: false }], [], ASOF);
    expect(n.value).toBe(-40_000);
  });

  it("counts a fixed deposit as savings and property as property and other", () => {
    const n = buildNetWorth([{ kind: "other", id: "fd", name: "FD", assetKind: "fixed-deposit", value: 100_000 }, { kind: "other", id: "p", name: "Plot", assetKind: "property", value: 300_000 }], [], ASOF);
    expect(n.allocation).toEqual([
      { category: "investments", amount: 0, percent: 0 },
      { category: "savings", amount: 100_000, percent: 25 },
      { category: "property-and-other", amount: 300_000, percent: 75 },
    ]);
  });

  it("compares with the last reading from before this month, and says nothing without one", () => {
    const snaps = [
      { takenOn: "2026-08-15", value: 7_000_000 },
      { takenOn: "2026-08-30", value: 7_500_000 },
      { takenOn: "2026-09-10", value: 7_600_000 },
    ];
    expect(buildNetWorth(accounts, snaps, ASOF).changeThisMonth).toBe(7_641_600 - 7_500_000);
    expect(buildNetWorth(accounts, [{ takenOn: "2026-09-10", value: 1 }], ASOF).changeThisMonth).toBeUndefined();
    expect(buildNetWorth(accounts, [], ASOF).changeThisMonth).toBeUndefined();
  });

  it("does not count a reading dated the first of this month as last month's", () => {
    const n = buildNetWorth(accounts, [{ takenOn: "2026-08-31", value: 7_000_000 }, { takenOn: "2026-09-01", value: 7_600_000 }], ASOF);
    expect(n.changeThisMonth).toBe(7_641_600 - 7_000_000);
  });
});

describe("net worth history", () => {
  const nw = buildNetWorth(accounts, [], ASOF);

  it("is just today when there are no readings, which the chart will not draw", () => {
    expect(buildNetWorthHistory(nw, [])).toEqual({ sample: false, points: [{ month: "2026-09", value: 7_641_600 }] });
  });

  it("takes the last reading of each earlier month, then today's value as this month, and is not a sample", () => {
    const h = buildNetWorthHistory(nw, [
      { takenOn: "2026-07-03", value: 100 },
      { takenOn: "2026-07-28", value: 150 },
      { takenOn: "2026-08-09", value: 200 },
      { takenOn: "2026-09-02", value: 999 },
    ]);
    expect(h).toEqual({
      sample: false,
      points: [
        { month: "2026-07", value: 150 },
        { month: "2026-08", value: 200 },
        { month: "2026-09", value: 7_641_600 },
      ],
    });
  });

  it("keeps at most twelve points, the latest", () => {
    const snaps = Array.from({ length: 20 }, (_, i) => {
      const index = 2025 * 12 + 0 + i; // Jan 2025 onward
      return { takenOn: `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-15`, value: i };
    });
    const h = buildNetWorthHistory(nw, snaps);
    expect(h.points).toHaveLength(12);
    expect(h.points[h.points.length - 1].month).toBe("2026-09");
    expect(h.points[0].month).toBe("2025-10");
  });
});

describe("cash flow", () => {
  it("is null until the person has entered monthly figures", () => {
    expect(buildCashFlow([], accounts)).toBeNull();
  });

  it("takes EMIs from every loan, and can show a month that saved nothing or less", () => {
    const flow = buildCashFlow([{ month: "2026-09", income: 100_000, rent: 60_000, food: 30_000, other: 20_000, sips: 0 }], accounts)!;
    expect(flow.categories.find((c) => c.category === "emi")!.amount).toBe(58_345);
    expect(flow.saved).toBe(100_000 - (58_345 + 60_000 + 30_000 + 20_000));
    expect(flow.saved).toBeLessThan(0);
  });

  it("compares with the month before, and says nothing with only one month", () => {
    const august = { ...september, month: "2026-08", other: 40_000 };
    expect(buildCashFlow([september, august], accounts)!.savedChangeVsLastMonth).toBe(7_745);
    expect(buildCashFlow([september], accounts)!.savedChangeVsLastMonth).toBeUndefined();
  });

  it("treats the latest month as current whatever order they were entered in", () => {
    const august = { ...september, month: "2026-08" };
    expect(buildCashFlow([september, august], accounts)!.month).toBe("2026-09");
    expect(buildCashFlow([august, september], accounts)!.month).toBe("2026-09");
  });

  describe("dining above average", () => {
    const month = (m: string, food: number): MonthlyFigures => ({ ...september, month: m, food });
    const history = [month("2026-06", 10_000), month("2026-07", 10_000), month("2026-08", 10_000)];

    it("shows once there are three earlier months and food is 10% or more above their average", () => {
      expect(buildCashFlow([...history, month("2026-09", 12_200)], accounts)!.insight).toEqual({ kind: "dining-above-average", percentAboveAverage: 22, baselineMonths: 3 });
      expect(buildCashFlow([...history, month("2026-09", 11_000)], accounts)!.insight).toEqual({ kind: "dining-above-average", percentAboveAverage: 10, baselineMonths: 3 });
    });

    it("does not show under 10% above, with fewer than three earlier months, or when food is below average", () => {
      expect(buildCashFlow([...history, month("2026-09", 10_900)], accounts)!.insight).toBeUndefined();
      expect(buildCashFlow([history[1], history[2], month("2026-09", 20_000)], accounts)!.insight).toBeUndefined();
      expect(buildCashFlow([...history, month("2026-09", 5_000)], accounts)!.insight).toBeUndefined();
    });

    it("uses at most the six months before", () => {
      const long = Array.from({ length: 8 }, (_, i) => month(`2026-0${i + 1}`, i < 2 ? 100_000 : 10_000));
      const flow = buildCashFlow([...long, month("2026-09", 13_000)], accounts)!;
      expect(flow.insight).toEqual({ kind: "dining-above-average", percentAboveAverage: 30, baselineMonths: 6 });
    });
  });
});

describe("insights", () => {
  const flow = buildCashFlow([september], accounts);
  const kinds = (r: MarketRates, a = accounts, f = flow) => buildInsights(a, f, r, ASOF).map((i) => i.kind);

  it("shows no rate-based insight without rates, rather than guessing a rate", () => {
    expect(kinds({})).toEqual(["emergency-fund"]);
  });

  it("suggests a refinance only for a home loan at least 0.25 points above the market", () => {
    expect(kinds({ homeLoan: 8.65 })).toContain("refinance");
    expect(kinds({ homeLoan: 8.7 })).not.toContain("refinance");
    expect(kinds({ homeLoan: 9.5 })).not.toContain("refinance");
    const car = accounts.map((a) => (a.kind === "loan" ? { ...a, loanType: "car" as const } : a));
    expect(kinds({ homeLoan: 7 }, car)).not.toContain("refinance");
  });

  it("skips a refinance that would not pay back before the loan ends", () => {
    const short = accounts.map((a) => (a.kind === "loan" ? { ...a, monthsLeft: 20 } : a));
    expect(kinds({ homeLoan: 8.5 }, short)).not.toContain("refinance");
  });

  it("names the loan in the insight id and carries the costs that add up", () => {
    const refi = buildInsights(accounts, flow, rates, ASOF)[0];
    expect(refi.id).toBe("refi-hdfc-home");
    expect(refi.kind === "refinance" && refi.upfrontCost === refi.costs.processingFee + refi.costs.documentation).toBe(true);
  });

  it("suggests a deposit only with both rates, the deposit above savings, and spare cash over three months of essentials", () => {
    expect(kinds({ fixedDeposit12m: 7.1 })).not.toContain("deposit");
    expect(kinds({ savings: 3 })).not.toContain("deposit");
    expect(kinds({ fixedDeposit12m: 3, savings: 3 })).not.toContain("deposit");
    expect(kinds({ fixedDeposit12m: 7.1, savings: 3 })).toContain("deposit");
    const poor = accounts.map((a) => (a.kind === "bank" ? { ...a, balance: 100_000 } : a));
    expect(kinds(rates, poor)).not.toContain("deposit");
  });

  it("does not suggest a deposit when what is spare, rounded down to ten thousand, is under the minimum", () => {
    // 372,000 − 3 × 119,145 = 14,565, which rounds down to 10,000: not worth a recommendation.
    const modest = accounts.map((a) => (a.id === "hdfc" ? { ...a, balance: 236_000 } : a));
    expect(kinds(rates, modest)).not.toContain("deposit");
    // 410,000 − 357,435 = 52,565, which rounds to 50,000: shown.
    const comfortable = accounts.map((a) => (a.id === "hdfc" ? { ...a, balance: 274_000 } : a));
    expect(buildInsights(comfortable, flow, rates, ASOF).find((i) => i.kind === "deposit")).toMatchObject({ amount: 50_000 });
  });

  it("does not suggest a deposit with no monthly figures, since there is no way to size a buffer", () => {
    expect(kinds(rates, accounts, null)).not.toContain("deposit");
  });

  it("suggests an emergency fund only when savings are under six months of essentials and something is saved each month", () => {
    expect(kinds({})).toContain("emergency-fund");
    const rich = accounts.map((a) => (a.kind === "bank" ? { ...a, balance: 500_000 } : a));
    expect(kinds({}, rich)).not.toContain("emergency-fund");
    const broke = buildCashFlow([{ ...september, other: 200_000 }], accounts);
    expect(kinds({}, accounts, broke)).not.toContain("emergency-fund");
    expect(kinds({}, accounts, null)).not.toContain("emergency-fund");
  });

  it("never proposes more a month than the person saves, and dates the goal to match", () => {
    // Other spending 70,000 leaves 240,000 − 224,145 = 15,855 a month; the gap is 300,000, so 19 months.
    const flow70 = buildCashFlow([{ ...september, other: 70_000 }], accounts)!;
    expect(flow70.saved).toBe(15_855);
    const ef = buildInsights(accounts, flow70, {}, ASOF).find((i) => i.kind === "emergency-fund");
    expect(ef).toMatchObject({ monthlyAmount: 15_855, targetDate: "2028-04" });
  });

  it("offers no emergency fund when nothing is left each month to put towards it", () => {
    const flow90 = buildCashFlow([{ ...september, other: 90_000 }], accounts)!;
    expect(flow90.saved).toBe(-4_145);
    expect(buildInsights(accounts, flow90, {}, ASOF).map((i) => i.kind)).not.toContain("emergency-fund");
  });

  it("orders them refinance, deposit, emergency fund", () => {
    expect(kinds(rates)).toEqual(["refinance", "deposit", "emergency-fund"]);
  });
});

describe("health score", () => {
  const flow = buildCashFlow([september], accounts);
  const nw = buildNetWorth(accounts, [], ASOF);

  it("works the parts out from the figures, with the formulas written down", () => {
    const h = buildHealthScore(accounts, flow, nw)!;
    const part = (id: string) => h.components.find((c) => c.id === id)!;
    // Debt to income: 58,345 / 240,000 = 24.3%; 100 at 10% or less, 0 at 50% or more: (50 − 24.31) / 40 = 64.
    expect(part("debt-to-income").score).toBe(64);
    // Savings rate: 53,600 / 240,000 = 22.3%; 0 at 0%, 100 at 30%: 74.
    expect(part("savings-rate").score).toBe(74);
    // Emergency fund: 420,000 / 119,145 = 3.5 months of 6: 59.
    expect(part("emergency-fund")).toMatchObject({ unit: "months", score: 59 });
    // Card use: 18,400 / 300,000 = 6.1%, under 10%: full marks.
    expect(part("card-utilisation").score).toBe(100);
    // Spread: the biggest class is 69% of assets, so 31% is elsewhere; 31 / 66.7 = 46.
    expect(part("diversification").score).toBe(46);
  });

  it("scores from 300 to 900 on the weights, and names the two weakest parts below 70 as the drags", () => {
    const h = buildHealthScore(accounts, flow, nw)!;
    // (64×20 + 74×20 + 59×20 + 100×15 + 46×10) / 85 = 69.4; 300 + 6 × 69.4 = 716.
    expect(h).toMatchObject({ score: 716, outOf: 900, drags: ["diversification", "emergency-fund"] });
  });

  it("calls only parts under 70 a drag: a part at 75 is fine", () => {
    const rich: MemberAccount[] = [
      { kind: "bank", id: "b", name: "B", last4: "1111", balance: 10_000_000 },
      { kind: "investment", id: "i", name: "I", instrument: "stocks", value: 10_000_000 },
    ];
    const h = buildHealthScore(rich, buildCashFlow([{ month: "2026-09", income: 500_000, rent: 0, food: 10_000, other: 10_000, sips: 0 }], []), buildNetWorth(rich, [], ASOF))!;
    expect(h.components.find((c) => c.id === "diversification")!.score).toBe(75);
    expect(h.drags).toEqual([]);
  });

  it("leaves out a part it cannot work out, and does not invent a repayment track or an income band", () => {
    const h = buildHealthScore(accounts, flow, nw)!;
    expect(h.components.map((c) => c.id)).not.toContain("repayment-track");
    expect(h.changeThisMonth).toBeUndefined();
    expect(h.topPercentForIncomeBand).toBeUndefined();
  });

  it("is null when fewer than three parts can be worked out", () => {
    expect(buildHealthScore([], null, buildNetWorth([], [], ASOF))).toBeNull();
    const cardOnly = accounts.filter((a) => a.kind === "card");
    expect(buildHealthScore(cardOnly, null, buildNetWorth(cardOnly, [], ASOF))).toBeNull();
  });

  it("stays between 300 and 900 at the extremes", () => {
    const best = buildHealthScore(
      [{ kind: "bank", id: "b", name: "B", last4: "1111", balance: 10_000_000 }, { kind: "investment", id: "i", name: "I", instrument: "stocks", value: 10_000_000 }, { kind: "other", id: "o", name: "O", assetKind: "property", value: 10_000_000 }],
      buildCashFlow([{ month: "2026-09", income: 500_000, rent: 0, food: 10_000, other: 10_000, sips: 0 }], []),
      buildNetWorth([{ kind: "bank", id: "b", name: "B", last4: "1111", balance: 10_000_000 }, { kind: "investment", id: "i", name: "I", instrument: "stocks", value: 10_000_000 }, { kind: "other", id: "o", name: "O", assetKind: "property", value: 10_000_000 }], [], ASOF),
    )!;
    expect(best.score).toBe(900);
    expect(best.drags).toEqual([]);
    const worst = buildHealthScore(
      [{ kind: "card", id: "c", name: "C", last4: "1", outstanding: 100_000, limit: 100_000, statementDay: 1, dueDay: 20, autoPay: false }],
      buildCashFlow([{ month: "2026-09", income: 100_000, rent: 90_000, food: 20_000, other: 0, sips: 0 }], [{ kind: "loan", id: "l", name: "L", loanType: "home", outstanding: 1, ratePercent: 8, monthsLeft: 12, emi: 60_000 }]),
      buildNetWorth([], [], ASOF),
    )!;
    expect(worst.score).toBe(300);
  });
});

describe("goals", () => {
  const goal = { id: "g", name: "Car", targetAmount: 600_000, fundedAmount: 120_000, targetDate: "2027-09", assumedReturnPercent: 0 };

  it("works out the months left, the percent funded and the monthly amount needed", () => {
    expect(buildGoals([goal], ASOF)[0]).toMatchObject({ monthsRemaining: 12, percentFunded: 20, monthlyNeeded: 40_000 });
  });

  it("allows for a return on what is already saved", () => {
    const needed = buildGoals([{ ...goal, assumedReturnPercent: 6 }], ASOF)[0].monthlyNeeded;
    expect(needed).toBeLessThan(40_000);
    expect(needed).toBeGreaterThan(35_000);
  });

  it("caps the percent funded at 100 and needs nothing more once funded", () => {
    expect(buildGoals([{ ...goal, fundedAmount: 700_000 }], ASOF)[0]).toMatchObject({ percentFunded: 100, monthlyNeeded: 0 });
  });

  it("for a goal whose date has arrived, needs the whole shortfall now", () => {
    expect(buildGoals([{ ...goal, targetDate: "2026-09" }], ASOF)[0]).toMatchObject({ monthsRemaining: 0, monthlyNeeded: 480_000 });
    expect(buildGoals([{ ...goal, targetDate: "2026-01" }], ASOF)[0]).toMatchObject({ monthsRemaining: 0 });
  });
});

describe("tax", () => {
  it("puts a date in its April to March year", () => {
    expect(financialYear("2026-03-31")).toEqual({ label: "2025-26", endsIn: 2026 });
    expect(financialYear("2026-04-01")).toEqual({ label: "2026-27", endsIn: 2027 });
    expect(financialYear("2026-12-31").label).toBe("2026-27");
    expect(financialYear("2099-04-01").label).toBe("2099-00");
  });

  it("counts only what was entered towards 80C, as yearly totals, and caps the home loan deduction", () => {
    const t = buildTax({ slabPercent: 30, ppf: 42_000, elss: 0, lifeInsurance: 22_000, health80D: 14_000, homeLoanInterestPaid: 551_800 }, ASOF);
    expect(t.financialYear).toBe("2026-27");
    expect(t.deadline).toBe("2027-03-31");
    expect(t.slabPercent).toBe(30);
    expect(t.section80C.items.map((i) => [i.kind, i.amount, i.schedule])).toEqual([
      ["ppf", 42_000, "yearly-total"],
      ["life-insurance", 22_000, "yearly-total"],
    ]);
    expect(t.section80C).toMatchObject({ limit: 150_000, used: 64_000 });
    expect(t.section80D).toEqual({ limit: 25_000, used: 14_000 });
    expect(t.homeLoanInterest).toEqual({ paid: 551_800, cap: 200_000, deductible: 200_000 });
  });

  it("is all zero, with an unknown slab, before anything is entered", () => {
    const t = buildTax(undefined, ASOF);
    expect(t).toMatchObject({ slabPercent: 0, section80C: { used: 0, items: [] }, section80D: { used: 0 }, homeLoanInterest: { paid: 0, deductible: 0 } });
  });

  it("deducts the interest actually paid when it is under the cap", () => {
    expect(buildTax({ slabPercent: 20, ppf: 0, elss: 0, lifeInsurance: 0, health80D: 0, homeLoanInterestPaid: 120_000 }, ASOF).homeLoanInterest.deductible).toBe(120_000);
  });
});

describe("a brand-new member", () => {
  const view = deriveMember(input({ accounts: [], monthly: [], rates: {} }));

  it("has a quiet, valid view of nothing", () => {
    expect(view.netWorth).toMatchObject({ value: 0, allocation: [] });
    expect(view.accounts).toEqual({ asOf: ASOF, bank: [], loans: [], cards: [], investments: [] });
    expect(view.cashFlow).toBeNull();
    expect(view.health).toBeNull();
    expect(view.insights).toEqual([]);
    expect(view.home.month).toBeUndefined();
    expect(view.home.lookAt).toEqual([]);
    expect(view.netWorthHistory.points).toHaveLength(1);
  });
});

describe("monthsBetween", () => {
  it("counts whole months across years", () => {
    expect(monthsBetween("2026-09", "2027-12")).toBe(15);
    expect(monthsBetween("2026-09", "2026-01")).toBe(-8);
  });
});
