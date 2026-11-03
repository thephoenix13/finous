import type {
  Account,
  AccountsOverview,
  BankAccount,
  CardAccount,
  CashFlow,
  DepositInsight,
  EmergencyFundInsight,
  Goal,
  HealthComponent,
  HealthComponentId,
  HealthScore,
  HomeSummary,
  InvestmentAccount,
  Insight,
  LoanAccount,
  MonthString,
  NetWorth,
  NetWorthHistory,
  RefinanceInsight,
  TaxSummary,
} from "../api";
import { addMonths, bufferMonths, emi, monthlyContributionForGoal, refinance } from "../lib/finance";
import type { MarketRates, MemberAccount, MemberGoal, MemberInput, MonthlyFigures, OtherAssetKind, Snapshot, TaxInputs } from "./types";

/** What switching a home loan costs, when the person has not told us: about 0.5% of what is outstanding, plus documentation. */
export const REFINANCE_PROCESSING_FEE_PERCENT = 0.5;
export const REFINANCE_DOCUMENTATION = 8_000;
/** Only suggest a refinance when the market rate is at least this far below the loan's. */
export const REFINANCE_MIN_RATE_GAP = 0.25;
/** Months of essential expenses we suggest keeping in savings, and aim for in an emergency fund. */
export const BUFFER_MONTHS = 3;
export const EMERGENCY_TARGET_MONTHS = 6;
/** Below this, moving money to a deposit is not worth a recommendation. */
export const DEPOSIT_MIN_AMOUNT = 25_000;
export const SECTION_80C_LIMIT = 150_000;
export const SECTION_80D_LIMIT = 25_000;
export const HOME_LOAN_INTEREST_CAP = 200_000;

export type YM = { year: number; month: number };
const ym = (month: MonthString): YM => {
  const [year, m] = month.split("-").map(Number);
  return { year, month: m };
};
const fmt = ({ year, month }: YM): MonthString => `${year}-${String(month).padStart(2, "0")}`;
const monthOf = (isoDate: string): MonthString => isoDate.slice(0, 7);
/** Whole months from one "YYYY-MM" to another. */
export const monthsBetween = (from: MonthString, to: MonthString): number => {
  const a = ym(from);
  const b = ym(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
};
const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);
const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step;

/* ── Accounts ─────────────────────────────────────────────────────────────────────────────────── */

export function loanEmi(loan: Extract<MemberAccount, { kind: "loan" }>): number {
  return loan.emi ?? Math.round(emi(loan.outstanding, loan.ratePercent, loan.monthsLeft));
}

export function buildAccounts(accounts: MemberAccount[], asOf: string): { overview: AccountsOverview; all: Account[] } {
  const now = ym(monthOf(asOf));
  const bank: BankAccount[] = [];
  const loans: LoanAccount[] = [];
  const cards: CardAccount[] = [];
  const investments: InvestmentAccount[] = [];

  for (const a of accounts) {
    if (a.kind === "bank") bank.push({ kind: "bank", id: a.id, name: a.name, accountType: "savings", last4: a.last4, balance: a.balance });
    else if (a.kind === "loan")
      loans.push({
        kind: "loan",
        id: a.id,
        name: a.name,
        loanType: a.loanType,
        outstanding: a.outstanding,
        ratePercent: a.ratePercent,
        startedOn: a.startedOn,
        endsOn: fmt(addMonths(now, a.monthsLeft)),
        monthsLeft: a.monthsLeft,
        emi: loanEmi(a),
        repaidPercent: a.originalAmount && a.originalAmount > 0 ? Math.min(100, Math.max(0, Math.round((1 - a.outstanding / a.originalAmount) * 100))) : undefined,
      });
    else if (a.kind === "card")
      cards.push({
        kind: "card",
        id: a.id,
        name: a.name,
        last4: a.last4,
        outstanding: a.outstanding,
        limit: a.limit,
        minimumDue: a.minimumDue,
        statementDay: a.statementDay,
        dueDay: a.dueDay,
        autoPay: a.autoPay,
      });
    else if (a.kind === "investment")
      investments.push({
        kind: "investment",
        id: a.id,
        name: a.name,
        instrument: a.instrument,
        institution: a.institution,
        value: a.value,
        activeSips: a.activeSips,
        holdings: a.holdings,
        openedYear: a.openedYear,
      });
  }
  return { overview: { asOf, bank, loans, cards, investments }, all: [...bank, ...loans, ...cards, ...investments] };
}

/* ── Net worth ────────────────────────────────────────────────────────────────────────────────── */

const SAVINGS_KINDS: OtherAssetKind[] = ["fixed-deposit"];

export function buildNetWorth(accounts: MemberAccount[], snapshots: Snapshot[], asOf: string): NetWorth {
  let savings = 0;
  let investments = 0;
  let propertyAndOther = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.kind === "bank") savings += a.balance;
    else if (a.kind === "investment") investments += a.value;
    else if (a.kind === "other") (SAVINGS_KINDS.includes(a.assetKind) ? (savings += a.value) : (propertyAndOther += a.value));
    else if (a.kind === "loan") liabilities += a.outstanding;
    else liabilities += a.outstanding;
  }
  const assets = savings + investments + propertyAndOther;
  const percent = (part: number) => (assets > 0 ? Math.round((part / assets) * 100) : 0);
  const allocation = assets === 0 ? [] : [
    { category: "investments" as const, amount: investments, percent: percent(investments) },
    { category: "savings" as const, amount: savings, percent: percent(savings) },
    { category: "property-and-other" as const, amount: propertyAndOther, percent: percent(propertyAndOther) },
  ];
  const value = assets - liabilities;

  // The change this month is against the last reading from before the month began, if there is one.
  const monthStart = `${monthOf(asOf)}-01`;
  const before = snapshots.filter((s) => s.takenOn < monthStart).sort((a, b) => (a.takenOn < b.takenOn ? 1 : -1))[0];
  return { asOf, value, changeThisMonth: before ? value - before.value : undefined, assets, liabilities, allocation };
}

/** One point a month: the last reading of each earlier month, then today's value as the current month. */
export function buildNetWorthHistory(netWorth: NetWorth, snapshots: Snapshot[], months = 12): NetWorthHistory {
  const current = monthOf(netWorth.asOf);
  const lastOfMonth = new Map<MonthString, Snapshot>();
  for (const s of [...snapshots].sort((a, b) => (a.takenOn < b.takenOn ? -1 : 1))) {
    if (monthOf(s.takenOn) < current) lastOfMonth.set(monthOf(s.takenOn), s);
  }
  const earlier = [...lastOfMonth.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-(months - 1));
  return { sample: false, points: [...earlier.map(([month, s]) => ({ month, value: s.value })), { month: current, value: netWorth.value }] };
}

/* ── Cash flow ────────────────────────────────────────────────────────────────────────────────── */

const latest = (monthly: MonthlyFigures[]) => [...monthly].sort((a, b) => (a.month < b.month ? -1 : 1));

const outflowOf = (m: MonthlyFigures, emis: number) => emis + m.rent + m.food + m.other + m.sips;

export function buildCashFlow(monthly: MonthlyFigures[], accounts: MemberAccount[]): CashFlow | null {
  const ordered = latest(monthly);
  const current = ordered[ordered.length - 1];
  if (!current) return null;
  const emis = sum(accounts.flatMap((a) => (a.kind === "loan" ? [loanEmi(a)] : [])));
  const outflow = outflowOf(current, emis);
  const saved = current.income - outflow;

  const previous = ordered[ordered.length - 2];
  const savedChangeVsLastMonth = previous ? saved - (previous.income - outflowOf(previous, emis)) : undefined;

  // Dining is "above average" when this month's food is at least 10% over the average of up to six earlier months (at least three).
  const earlier = ordered.slice(-7, -1);
  let insight: CashFlow["insight"];
  if (earlier.length >= 3) {
    const average = sum(earlier.map((m) => m.food)) / earlier.length;
    const above = average > 0 ? Math.round((current.food / average - 1) * 100) : 0;
    if (above >= 10) insight = { kind: "dining-above-average", percentAboveAverage: above, baselineMonths: earlier.length };
  }

  return {
    month: current.month,
    income: current.income,
    outflow,
    saved,
    savedChangeVsLastMonth,
    categories: [
      { category: "emi", amount: emis },
      { category: "sips", amount: current.sips },
      { category: "rent", amount: current.rent },
      { category: "food", amount: current.food },
      { category: "other", amount: current.other },
    ],
    insight,
  };
}

/* ── Insights ─────────────────────────────────────────────────────────────────────────────────── */

export function buildInsights(accounts: MemberAccount[], cashFlow: CashFlow | null, rates: MarketRates, asOf: string): Insight[] {
  const insights: Insight[] = [];
  const bankTotal = sum(accounts.flatMap((a) => (a.kind === "bank" ? [a.balance] : [])));
  const essentials = cashFlow ? sum(cashFlow.categories.filter((c) => c.category === "emi" || c.category === "rent" || c.category === "food").map((c) => c.amount)) : 0;

  // A cheaper home loan is on offer.
  if (rates.homeLoan !== undefined) {
    const market = rates.homeLoan;
    for (const a of accounts) {
      if (a.kind !== "loan" || a.loanType !== "home" || a.monthsLeft <= 0 || a.outstanding <= 0) continue;
      if (a.ratePercent - market < REFINANCE_MIN_RATE_GAP) continue;
      const processingFee = Math.round((a.outstanding * REFINANCE_PROCESSING_FEE_PERCENT) / 100);
      const costs = { processingFee, documentation: REFINANCE_DOCUMENTATION };
      const upfrontCost = processingFee + REFINANCE_DOCUMENTATION;
      const result = refinance({ balance: a.outstanding, currentRatePct: a.ratePercent, newRatePct: market, monthsLeft: a.monthsLeft, upfrontCost });
      if (!(result.monthlySaving > 0) || !Number.isFinite(result.breakEvenMonths) || result.breakEvenMonths >= a.monthsLeft) continue;
      const insight: RefinanceInsight = {
        id: `refi-${a.id}`,
        kind: "refinance",
        loanId: a.id,
        currentRatePercent: a.ratePercent,
        marketRatePercent: market,
        monthlySaving: Math.round(result.monthlySaving),
        annualSaving: Math.round(result.annualSaving),
        upfrontCost,
        costs,
        breakEvenMonths: Math.ceil(result.breakEvenMonths),
      };
      insights.push(insight);
    }
  }

  // Savings above a buffer could earn more in a deposit.
  if (rates.fixedDeposit12m !== undefined && rates.savings !== undefined && rates.fixedDeposit12m > rates.savings && essentials > 0) {
    const spare = bankTotal - BUFFER_MONTHS * essentials;
    const amount = Math.floor(spare / 10_000) * 10_000;
    if (amount >= DEPOSIT_MIN_AMOUNT) {
      const insight: DepositInsight = {
        id: "deposit",
        kind: "deposit",
        amount,
        bufferLeft: bankTotal - amount,
        savingsRatePercent: rates.savings,
        depositRatePercent: rates.fixedDeposit12m,
        termMonths: 12,
        extraPerYear: Math.round((amount * (rates.fixedDeposit12m - rates.savings)) / 100),
      };
      insights.push(insight);
    }
  }

  // Savings cover fewer months of essentials than the target, and there is something to set aside each month.
  if (cashFlow && essentials > 0 && cashFlow.saved > 0 && bankTotal < EMERGENCY_TARGET_MONTHS * essentials) {
    const targetAmount = roundUpTo(EMERGENCY_TARGET_MONTHS * essentials, 10_000);
    const gap = targetAmount - bankTotal;
    const monthlyAmount = Math.min(cashFlow.saved, roundUpTo(gap / EMERGENCY_TARGET_MONTHS, 1_000));
    const insight: EmergencyFundInsight = {
      id: "emergency-fund",
      kind: "emergency-fund",
      monthlyAmount,
      heldAmount: bankTotal,
      targetAmount,
      targetMonths: EMERGENCY_TARGET_MONTHS,
      essentialsPerMonth: essentials,
      monthsHeld: bufferMonths(bankTotal, essentials),
      targetDate: fmt(addMonths(ym(monthOf(asOf)), Math.ceil(gap / monthlyAmount))),
    };
    insights.push(insight);
  }
  return insights;
}

/* ── Health score ─────────────────────────────────────────────────────────────────────────────── */

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
/** 100 at or below `good`, 0 at or above `bad`, in a straight line between. */
const lowIsGood = (value: number, good: number, bad: number) => clamp(((bad - value) / (bad - good)) * 100);
/** 0 at or below `bad`, 100 at or above `good`. */
const highIsGood = (value: number, bad: number, good: number) => clamp(((value - bad) / (good - bad)) * 100);

const WEIGHTS: Record<HealthComponentId, number> = {
  "debt-to-income": 20,
  "savings-rate": 20,
  "emergency-fund": 20,
  "card-utilisation": 15,
  diversification: 10,
  "repayment-track": 15,
};

/**
 * A score from 300 to 900 built from what can be worked out from what the person has entered. A part we cannot work out (the
 * repayment track needs payment history we do not have) is left out, not guessed, and the others are re-weighted. Returns null
 * when fewer than three parts can be worked out.
 */
export function buildHealthScore(accounts: MemberAccount[], cashFlow: CashFlow | null, netWorth: NetWorth): HealthScore | null {
  const components: HealthComponent[] = [];

  if (cashFlow && cashFlow.income > 0) {
    const emis = cashFlow.categories.find((c) => c.category === "emi")?.amount ?? 0;
    const dti = (emis / cashFlow.income) * 100;
    components.push({ id: "debt-to-income", value: dti, unit: "percent", score: Math.round(lowIsGood(dti, 10, 50)) });
    const rate = (cashFlow.saved / cashFlow.income) * 100;
    components.push({ id: "savings-rate", value: rate, unit: "percent", score: Math.round(highIsGood(rate, 0, 30)) });

    const essentials = cashFlow.categories.filter((c) => c.category === "emi" || c.category === "rent" || c.category === "food").reduce((t, c) => t + c.amount, 0);
    if (essentials > 0) {
      const bankTotal = sum(accounts.flatMap((a) => (a.kind === "bank" ? [a.balance] : [])));
      const months = bufferMonths(bankTotal, essentials);
      components.push({ id: "emergency-fund", value: months, unit: "months", score: Math.round(highIsGood(months, 0, EMERGENCY_TARGET_MONTHS)) });
    }
  }

  const limit = sum(accounts.flatMap((a) => (a.kind === "card" ? [a.limit] : [])));
  if (limit > 0) {
    const used = (sum(accounts.flatMap((a) => (a.kind === "card" ? [a.outstanding] : []))) / limit) * 100;
    components.push({ id: "card-utilisation", value: used, unit: "percent", score: Math.round(lowIsGood(used, 10, 90)) });
  }

  if (netWorth.assets > 0 && netWorth.allocation.length > 0) {
    const biggest = Math.max(...netWorth.allocation.map((a) => a.percent));
    const spread = 100 - biggest;
    // Three equal classes (a spread of about 67) is as good as it gets.
    components.push({ id: "diversification", value: spread, unit: "percent", score: Math.round(clamp((spread / 66.7) * 100)) });
  }

  if (components.length < 3) return null;

  const weight = sum(components.map((c) => WEIGHTS[c.id]));
  const average = sum(components.map((c) => c.score * WEIGHTS[c.id])) / weight;
  const drags = [...components]
    .filter((c) => c.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((c) => c.id);
  return { score: Math.round(300 + 6 * average), outOf: 900, components, drags };
}

/* ── Goals ────────────────────────────────────────────────────────────────────────────────────── */

export function buildGoals(goals: MemberGoal[], asOf: string): Goal[] {
  const now = monthOf(asOf);
  return goals.map((g) => {
    const monthsRemaining = Math.max(0, monthsBetween(now, g.targetDate));
    const monthlyNeeded =
      monthsRemaining > 0
        ? Math.round(monthlyContributionForGoal({ target: g.targetAmount, saved: g.fundedAmount, annualReturnPct: g.assumedReturnPercent, months: monthsRemaining }))
        : Math.max(0, g.targetAmount - g.fundedAmount);
    return {
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      fundedAmount: g.fundedAmount,
      targetDate: g.targetDate,
      assumedReturnPercent: g.assumedReturnPercent,
      monthsRemaining,
      percentFunded: Math.min(100, Math.round((g.fundedAmount / g.targetAmount) * 100)),
      monthlyNeeded,
    };
  });
}

/* ── Tax ──────────────────────────────────────────────────────────────────────────────────────── */

/** The financial year (April to March) a date falls in, such as "2026-27", and the year it ends in. */
export function financialYear(asOf: string): { label: string; endsIn: number } {
  const year = Number(asOf.slice(0, 4));
  const month = Number(asOf.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  return { label: `${start}-${String((start + 1) % 100).padStart(2, "0")}`, endsIn: start + 1 };
}

const NO_TAX_INPUTS: TaxInputs = { slabPercent: 0, ppf: 0, elss: 0, lifeInsurance: 0, health80D: 0, homeLoanInterestPaid: 0 };

export function buildTax(inputs: TaxInputs | undefined, asOf: string): TaxSummary {
  const t = inputs ?? NO_TAX_INPUTS;
  const fy = financialYear(asOf);
  const items: TaxSummary["section80C"]["items"] = [
    { id: "ppf", kind: "ppf" as const, amount: t.ppf },
    { id: "elss", kind: "elss" as const, amount: t.elss },
    { id: "life", kind: "life-insurance" as const, amount: t.lifeInsurance },
  ]
    .filter((i) => i.amount > 0)
    .map((i) => ({ ...i, schedule: "yearly-total" as const }));
  return {
    financialYear: fy.label,
    asOf,
    deadline: `${fy.endsIn}-03-31`,
    slabPercent: t.slabPercent,
    section80C: { limit: SECTION_80C_LIMIT, used: sum(items.map((i) => i.amount)), items },
    section80D: { limit: SECTION_80D_LIMIT, used: t.health80D },
    homeLoanInterest: { paid: t.homeLoanInterestPaid, cap: HOME_LOAN_INTEREST_CAP, deductible: Math.min(t.homeLoanInterestPaid, HOME_LOAN_INTEREST_CAP) },
  };
}

/* ── Everything ───────────────────────────────────────────────────────────────────────────────── */

export type MemberView = {
  profile: MemberInput["profile"];
  accounts: AccountsOverview;
  allAccounts: Account[];
  /** Assets with no screen of their own yet (property, gold, other): counted in net worth only. */
  otherAssets: Extract<MemberAccount, { kind: "other" }>[];
  netWorth: NetWorth;
  netWorthHistory: NetWorthHistory;
  /** Null until the person has entered their monthly figures. */
  cashFlow: CashFlow | null;
  insights: Insight[];
  /** Null until there is enough to work a score out from. */
  health: HealthScore | null;
  goals: Goal[];
  tax: TaxSummary;
  home: HomeSummary;
};

export function deriveMember(input: MemberInput): MemberView {
  const { overview, all } = buildAccounts(input.accounts, input.asOf);
  const netWorth = buildNetWorth(input.accounts, input.snapshots, input.asOf);
  const cashFlow = buildCashFlow(input.monthly, input.accounts);
  const insights = buildInsights(input.accounts, cashFlow, input.rates, input.asOf);
  return {
    profile: input.profile,
    accounts: overview,
    allAccounts: all,
    otherAssets: input.accounts.filter((a): a is Extract<MemberAccount, { kind: "other" }> => a.kind === "other"),
    netWorth,
    netWorthHistory: buildNetWorthHistory(netWorth, input.snapshots),
    cashFlow,
    insights,
    health: buildHealthScore(input.accounts, cashFlow, netWorth),
    goals: buildGoals(input.goals, input.asOf),
    tax: buildTax(input.tax, input.asOf),
    home: {
      asOf: input.asOf,
      netWorth: { value: netWorth.value, changeThisMonth: netWorth.changeThisMonth },
      month: cashFlow
        ? { month: cashFlow.month, income: cashFlow.income, outflow: cashFlow.outflow, saved: cashFlow.saved, savedChangeVsLastMonth: cashFlow.savedChangeVsLastMonth }
        : undefined,
      lookAt: insights.slice(0, 2),
    },
  };
}
