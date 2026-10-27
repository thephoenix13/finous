import { describe, expect, it } from "vitest";
import { addMonths, bufferMonths } from "../lib/finance";
import { roundTo } from "../lib/format";
import { createMockApi } from "./mock";
import { monthsBetween, PERSONA_MONTH, PERSONA_TODAY } from "./persona";
import type { Insight } from "./types";

/**
 * Every figure here is read off Prototype v2 (public/prototype_file_v2.html). If a screen's number changes,
 * change it in the prototype and in persona.ts together; these tests are what keep the two honest.
 */
const api = createMockApi();

describe("persona: who and when", () => {
  it("is Aarav Mehta of Bengaluru", async () => {
    expect(await api.getProfile()).toMatchObject({ name: "Aarav Mehta", firstName: "Aarav", city: "Bengaluru" });
  });

  it("lives on Tuesday 29 September 2026, the date on the prototype's Home screen", () => {
    expect(PERSONA_TODAY).toBe("2026-09-29");
    expect(new Date(`${PERSONA_TODAY}T00:00:00Z`).getUTCDay()).toBe(2); // Tuesday
    expect(PERSONA_MONTH).toBe("2026-09");
  });

  it("counts months between two months", () => {
    expect(monthsBetween("2026-09", "2027-12")).toBe(15);
    expect(monthsBetween("2026-09", "2038-06")).toBe(141);
    expect(monthsBetween("2026-09", "2026-09")).toBe(0);
  });
});

describe("persona: accounts (prototype Accounts screen)", () => {
  it("has two banks, one loan, one card and three investments", async () => {
    const o = await api.listAccounts();
    expect(o.bank.map((a) => [a.name, a.last4, a.balance])).toEqual([
      ["HDFC Bank", "4821", 284_000],
      ["State Bank of India", "7723", 136_000],
    ]);
    expect(o.loans).toHaveLength(1);
    expect(o.cards).toHaveLength(1);
    expect(o.investments.map((a) => [a.name, a.value])).toEqual([
      ["Groww Mutual Funds", 2_480_000],
      ["Zerodha Holdings", 840_000],
      ["PPF Account", 620_000],
    ]);
  });

  it("holds ₹4,20,000 in savings across the two banks", async () => {
    const { bank } = await api.listAccounts();
    expect(bank.reduce((s, a) => s + a.balance, 0)).toBe(420_000);
  });

  it("has the home loan at ₹62,00,000, 8.9%, EMI ₹58,345, ending Mar 2044", async () => {
    const [loan] = (await api.listAccounts()).loans;
    expect(loan).toMatchObject({ name: "HDFC Home Loan", outstanding: 6_200_000, ratePercent: 8.9, emi: 58_345, monthsLeft: 210, repaidPercent: 38 });
    expect(addMonths({ year: 2026, month: 9 }, loan.monthsLeft)).toEqual({ year: 2044, month: 3 });
    expect(loan.endsOn).toBe("2044-03");
    expect(loan.monthsLeft / 12).toBe(17.5); // "17.5 years left"
  });

  it("has the ICICI card at ₹18,400 of a ₹3L limit, 6% used, minimum due ₹1,840, auto-pay off", async () => {
    const [card] = (await api.listAccounts()).cards;
    expect(card).toMatchObject({ name: "ICICI Amazon Pay", last4: "4419", outstanding: 18_400, limit: 300_000, minimumDue: 1_840, statementDay: 28, dueDay: 15, autoPay: false });
    expect(Math.round((card.outstanding / card.limit) * 100)).toBe(6);
  });

  it("describes each investment the way the prototype does", async () => {
    const [groww, zerodha, ppf] = (await api.listAccounts()).investments;
    expect(groww).toMatchObject({ instrument: "mutual-funds", activeSips: 9 });
    expect(zerodha).toMatchObject({ instrument: "stocks", holdings: 14 });
    expect(ppf).toMatchObject({ instrument: "ppf", institution: "HDFC", openedYear: 2019 });
  });

  it("shows HDFC up ₹18,400 this month", async () => {
    expect(await api.getAccount("hdfc")).toMatchObject({ changeThisMonth: 18_400 });
  });
});

describe("persona: transactions (prototype Search and Account screens)", () => {
  it("has the eight recent transactions", async () => {
    const { items, total } = await api.listTransactions();
    expect(total).toBe(8);
    expect(items.map((t) => t.description)).toEqual([
      "Swiggy",
      "SIP — Parag Parikh Flexi Cap",
      "Home loan EMI",
      "Blinkit",
      "Salary credit",
      "Zomato",
      "Swiggy",
      "Swiggy Instamart",
    ]);
  });

  it("pays the EMI at the loan's EMI, and the salary at the income", async () => {
    const { items } = await api.listTransactions();
    const loan = (await api.listAccounts()).loans[0];
    expect(items.find((t) => t.category === "emi")?.amount).toBe(-loan.emi);
    expect(items.find((t) => t.category === "income")?.amount).toBe(240_000);
  });

  it('finds "swiggy" three times, across HDFC and the ICICI card', async () => {
    const hits = await api.listTransactions({ search: "swiggy" });
    expect(hits.total).toBe(3); // Swiggy, Swiggy, Swiggy Instamart
    expect(new Set(hits.items.map((t) => t.accountId))).toEqual(new Set(["hdfc", "icici-cc"]));
  });

  it("shows the prototype's five recent HDFC items first, newest on top", async () => {
    const { items } = await api.listTransactions({ accountId: "hdfc", limit: 5 });
    expect(items.map((t) => t.description)).toEqual(["Swiggy", "SIP — Parag Parikh Flexi Cap", "Home loan EMI", "Blinkit", "Salary credit"]);
  });
});

describe("persona: cash flow (prototype Cash flow screen)", () => {
  it("earns ₹2,40,000, spends ₹1,86,400 and saves ₹53,600, ₹14,400 more than last month", async () => {
    expect(await api.getCashFlow()).toMatchObject({ income: 240_000, outflow: 186_400, saved: 53_600, savedChangeVsLastMonth: 14_400 });
  });

  it("splits the spending the way the prototype does", async () => {
    const { categories } = await api.getCashFlow();
    expect(categories).toEqual([
      { category: "emi", amount: 58_345 },
      { category: "sips", amount: 35_000 },
      { category: "rent", amount: 42_600 },
      { category: "food", amount: 18_200 },
      { category: "other", amount: 32_255 },
    ]);
  });

  it("notes dining running 22% above the six-month average", async () => {
    expect((await api.getCashFlow()).insight).toEqual({ kind: "dining-above-average", percentAboveAverage: 22, baselineMonths: 6 });
  });
});

describe("persona: net worth (prototype Net worth screen)", () => {
  it("is ₹76.4L: assets ₹1,38,60,000 less liabilities ₹62,18,400", async () => {
    const n = await api.getNetWorth();
    expect(n).toMatchObject({ assets: 13_860_000, liabilities: 6_218_400, value: 7_641_600, changeThisMonth: 124_000 });
    expect((n.value / 100_000).toFixed(1)).toBe("76.4");
  });

  it("owes the loan plus the card balance", async () => {
    expect((await api.getNetWorth()).liabilities).toBe(6_200_000 + 18_400);
  });

  it("allocates 28% to investments, 3% to savings and 69% to property and other", async () => {
    const { allocation } = await api.getNetWorth();
    expect(allocation.map((a) => [a.category, a.percent])).toEqual([
      ["investments", 28],
      ["savings", 3],
      ["property-and-other", 69],
    ]);
  });
});

describe("persona: home (prototype Home screen)", () => {
  it("shows ₹76.4L, up ₹1,24,000, and ₹53,600 saved this month", async () => {
    const h = await api.getHome();
    expect(h.netWorth).toEqual({ value: 7_641_600, changeThisMonth: 124_000 });
    expect(h.month).toMatchObject({ income: 240_000, outflow: 186_400, saved: 53_600 });
  });

  it('has two things to "look at": the loan rate, then the savings', async () => {
    expect((await api.getHome()).lookAt.map((i) => i.id)).toEqual(["refi", "fd"]);
  });
});

describe("persona: insights (prototype Refinance, FD and Emergency fund actions)", () => {
  /** The one insight of a kind, typed as that kind. */
  async function insight<K extends Insight["kind"]>(kind: K): Promise<Extract<Insight, { kind: K }>> {
    const found = (await api.listInsights()).find((i): i is Extract<Insight, { kind: K }> => i.kind === kind);
    if (!found) throw new Error(`no ${kind} insight`);
    return found;
  }

  it("refinancing 8.9% to 8.5% saves about ₹1,523 a month and breaks even in 26 months", async () => {
    expect(await insight("refinance")).toMatchObject({
      loanId: "hdfc-home",
      currentRatePercent: 8.9,
      marketRatePercent: 8.5,
      monthlySaving: 1_523,
      annualSaving: 18_275,
      upfrontCost: 39_000,
      breakEvenMonths: 26,
    });
  });

  it("charges ₹31,000 to process and ₹8,000 for documentation: ₹39,000 to switch", async () => {
    const refi = await insight("refinance");
    expect(refi.costs).toEqual({ processingFee: 31_000, documentation: 8_000 });
    expect(refi.costs.processingFee).toBe(refi.upfrontCost - refi.costs.documentation);
  });

  it("prices the processing fee at 0.5% of the outstanding loan", async () => {
    const [loan] = (await api.listAccounts()).loans;
    expect((await insight("refinance")).costs.processingFee / loan.outstanding).toBe(0.005);
  });

  it("moving ₹2.1L from 3% savings to a 7.1% deposit earns about ₹8,600 more a year", async () => {
    const fd = await insight("deposit");
    expect(fd).toMatchObject({ amount: 210_000, bufferLeft: 210_000, savingsRatePercent: 3, depositRatePercent: 7.1, termMonths: 12 });
    expect(fd.extraPerYear).toBe(8_610);
    expect(roundTo(fd.extraPerYear, 100)).toBe(8_600);
  });

  it("holds 3.5 months of essentials against a ₹7.2L, six-month emergency goal", async () => {
    const ef = await insight("emergency-fund");
    expect(ef).toMatchObject({ monthlyAmount: 50_000, heldAmount: 420_000, targetAmount: 720_000, targetMonths: 6, essentialsPerMonth: 119_145, targetDate: "2027-03" });
    expect(ef.monthsHeld.toFixed(1)).toBe("3.5");
  });

  it("rounds six months of essentials (₹7,14,870) up to the prototype's ₹7.2L target", () => {
    expect(6 * 119_145).toBe(714_870);
    expect(roundTo(6 * 119_145, 20_000)).toBe(720_000);
    expect(bufferMonths(420_000, 119_145).toFixed(1)).toBe("3.5");
  });
});

describe("persona: health score (prototype Health screens)", () => {
  it("scores 742 of 900, up 18, in the top 22% for the income band", async () => {
    expect(await api.getHealthScore()).toMatchObject({ score: 742, outOf: 900, changeThisMonth: 18, topPercentForIncomeBand: 22 });
  });

  it("shows the six components with the prototype's values and bars", async () => {
    const { components } = await api.getHealthScore();
    const shown = components.map((c) => [c.id, c.unit === "months" ? Number(c.value.toFixed(1)) : Math.round(c.value), c.score]);
    expect(shown).toEqual([
      ["debt-to-income", 24, 78],
      ["savings-rate", 22, 82],
      ["emergency-fund", 3.5, 58],
      ["card-utilisation", 6, 90],
      ["diversification", 64, 64],
      ["repayment-track", 96, 96],
    ]);
  });

  it("names the emergency fund and diversification as the drags", async () => {
    expect((await api.getHealthScore()).drags).toEqual(["emergency-fund", "diversification"]);
  });
});

describe("persona: goals (prototype Goals screens)", () => {
  it("has three goals with the prototype's amounts and dates", async () => {
    const goals = await api.listGoals();
    expect(goals.map((g) => [g.name, g.fundedAmount, g.targetAmount, g.targetDate, g.percentFunded])).toEqual([
      ["Home upgrade", 840_000, 3_000_000, "2027-12", 28],
      ["Emergency fund", 420_000, 720_000, "2027-03", 58],
      ["Daughter's education", 620_000, 5_000_000, "2038-06", 12],
    ]);
  });

  it("counts the months left: 15, 6 and 141", async () => {
    expect((await api.listGoals()).map((g) => g.monthsRemaining)).toEqual([15, 6, 141]);
  });

  it("needs about ₹1,35,000, ₹50,000 and ₹18,400 a month", async () => {
    const [home, emergency, education] = await api.listGoals();
    expect(roundTo(home.monthlyNeeded, 1_000)).toBe(135_000);
    expect(emergency.monthlyNeeded).toBe(50_000); // cash in savings: no return assumed
    expect(roundTo(education.monthlyNeeded, 100)).toBe(18_400);
  });

  it("assumes a 6% return on invested goals and none on the emergency fund", async () => {
    expect((await api.listGoals()).map((g) => g.assumedReturnPercent)).toEqual([6, 0, 6]);
  });

  it("funds the home upgrade from three places, ₹25,000 a month today", async () => {
    const home = await api.getGoal("home-upgrade");
    expect(home.contributions?.map((c) => [c.institution, c.currentValue])).toEqual([
      ["Groww", 550_000],
      ["HDFC", 150_000],
      ["HDFC", 140_000],
    ]);
    expect(home.currentMonthlyContribution).toBe(25_000);
  });

  it("does not make up contributions the prototype never shows", async () => {
    expect((await api.getGoal("emergency-fund")).contributions).toBeUndefined();
    expect((await api.getGoal("daughters-education")).contributions).toBeUndefined();
  });

  it("funds the emergency goal with the savings it already holds", async () => {
    const [{ bank }, emergency] = [await api.listAccounts(), await api.getGoal("emergency-fund")];
    expect(emergency.fundedAmount).toBe(bank.reduce((s, a) => s + a.balance, 0));
  });
});

describe("persona: consents (prototype Consent manager)", () => {
  it("has two active 12-month consents expiring 24 Sep 2027, refreshed every 12 hours", async () => {
    const consents = await api.listConsents();
    expect(consents.map((c) => [c.purpose, c.status, c.expiresOn, c.durationMonths, c.refreshEveryHours])).toEqual([
      ["financial-dashboard", "active", "2027-09-24", 12, 12],
      ["health-score", "active", "2027-09-24", 12, 12],
    ]);
  });
});
