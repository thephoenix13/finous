/**
 * The prototype's persona, Aarav Mehta of Bengaluru, as API data.
 *
 * Source: Prototype v2 (public/prototype_file_v2.html). Raw figures are copied from it. Anything the finance
 * module owns (EMI, refinance saving, what a goal needs each month, months of buffer) is derived from
 * lib/finance, so the mock cannot drift from the audited maths. persona.test.ts pins every figure to the prototype.
 *
 * "Today" is fixed at Tuesday 29 September 2026, as on the prototype's Home screen, so nothing here depends on the clock.
 */
import { bufferMonths, emi, monthlyContributionForGoal, refinance } from "../lib/finance";
import type {
  Account,
  AccountsOverview,
  BankAccount,
  CardAccount,
  CashFlow,
  Consent,
  Goal,
  HealthScore,
  HomeSummary,
  Insight,
  InvestmentAccount,
  IsoDate,
  LoanAccount,
  MonthString,
  NetWorth,
  NetWorthHistory,
  Profile,
  TaxSummary,
  Transaction,
} from "./types";

export const PERSONA_TODAY: IsoDate = "2026-09-29";
export const PERSONA_MONTH: MonthString = "2026-09";

/** Whole months from one "YYYY-MM" to another. */
export function monthsBetween(from: MonthString, to: MonthString): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/* ── Raw figures from the prototype ───────────────────────────────────────────────────────────── */

const INCOME = 240_000;
const OUTFLOW = 186_400;
const SIPS = 35_000;
const RENT = 42_600;
const FOOD = 18_200;
const SAVED_CHANGE_VS_LAST_MONTH = 14_400;

const LOAN = { outstanding: 6_200_000, ratePercent: 8.9, monthsLeft: 210 };
const CARD = { outstanding: 18_400, limit: 300_000 };
/** Switching lenders costs a processing fee of about 0.5% of the outstanding amount, plus documentation. */
const REFINANCE_COSTS = { processingFee: Math.round(LOAN.outstanding * 0.005), documentation: 8_000 };
const REFINANCE = { marketRatePercent: 8.5, upfrontCost: REFINANCE_COSTS.processingFee + REFINANCE_COSTS.documentation };

/** Property and other manual assets. The prototype's Net worth screen shows assets of ₹1,38,60,000; this is the remainder. */
const PROPERTY_AND_OTHER = 9_500_000;

const EMI = Math.round(emi(LOAN.outstanding, LOAN.ratePercent, LOAN.monthsLeft));

/* ── Profile ──────────────────────────────────────────────────────────────────────────────────── */

const profile: Profile = {
  id: "usr_aarav",
  name: "Aarav Mehta",
  firstName: "Aarav",
  city: "Bengaluru",
  email: "aarav.mehta@example.com",
};

/* ── Accounts ─────────────────────────────────────────────────────────────────────────────────── */

const bank: BankAccount[] = [
  { kind: "bank", id: "hdfc", name: "HDFC Bank", accountType: "savings", last4: "4821", balance: 284_000, changeThisMonth: 18_400 },
  { kind: "bank", id: "sbi", name: "State Bank of India", accountType: "savings", last4: "7723", balance: 136_000 },
];

const loans: LoanAccount[] = [
  {
    kind: "loan",
    id: "hdfc-home",
    name: "HDFC Home Loan",
    loanType: "home",
    outstanding: LOAN.outstanding,
    ratePercent: LOAN.ratePercent,
    startedOn: "2025-03",
    endsOn: "2044-03",
    monthsLeft: LOAN.monthsLeft,
    emi: EMI,
    repaidPercent: 38,
  },
];

const cards: CardAccount[] = [
  {
    kind: "card",
    id: "icici-cc",
    name: "ICICI Amazon Pay",
    last4: "4419",
    outstanding: CARD.outstanding,
    limit: CARD.limit,
    minimumDue: CARD.outstanding / 10,
    statementDay: 28,
    dueDay: 15,
    autoPay: false,
  },
];

const investments: InvestmentAccount[] = [
  { kind: "investment", id: "groww", name: "Groww Mutual Funds", instrument: "mutual-funds", value: 2_480_000, activeSips: 9 },
  { kind: "investment", id: "zerodha", name: "Zerodha Holdings", instrument: "stocks", value: 840_000, holdings: 14 },
  { kind: "investment", id: "ppf", name: "PPF Account", instrument: "ppf", institution: "HDFC", value: 620_000, openedYear: 2019 },
];

const accounts: AccountsOverview = { asOf: PERSONA_TODAY, bank, loans, cards, investments };
const allAccounts: Account[] = [...bank, ...loans, ...cards, ...investments];

/* ── Transactions (the prototype's recent activity, September 2026) ───────────────────────────── */

const transactions: Transaction[] = [
  { id: "t1", accountId: "hdfc", date: "2026-09-28", time: "06:00", description: "Home loan EMI", amount: -EMI, category: "emi" },
  { id: "t2", accountId: "hdfc", date: "2026-09-28", time: "07:00", description: "SIP — Parag Parikh Flexi Cap", amount: -15_000, category: "sip" },
  { id: "t3", accountId: "hdfc", date: "2026-09-28", time: "21:12", description: "Swiggy", amount: -842, category: "food" },
  { id: "t4", accountId: "hdfc", date: "2026-09-27", time: "19:42", description: "Blinkit", amount: -1_240, category: "food" },
  { id: "t5", accountId: "hdfc", date: "2026-09-26", description: "Zomato", amount: -1_240, category: "food" },
  { id: "t6", accountId: "hdfc", date: "2026-09-26", time: "10:24", description: "Salary credit", amount: INCOME, category: "income" },
  { id: "t7", accountId: "icici-cc", date: "2026-09-24", description: "Swiggy", amount: -576, category: "food" },
  { id: "t8", accountId: "hdfc", date: "2026-09-19", description: "Swiggy Instamart", amount: -1_284, category: "food" },
];

/* ── Net worth and cash flow ──────────────────────────────────────────────────────────────────── */

const bankTotal = bank.reduce((sum, a) => sum + a.balance, 0);
const investmentTotal = investments.reduce((sum, a) => sum + a.value, 0);
const assets = bankTotal + investmentTotal + PROPERTY_AND_OTHER;
const liabilities = LOAN.outstanding + CARD.outstanding;
const pct = (part: number) => Math.round((part / assets) * 100);

const netWorth: NetWorth = {
  asOf: PERSONA_TODAY,
  value: assets - liabilities,
  changeThisMonth: 124_000,
  assets,
  liabilities,
  allocation: [
    { category: "investments", amount: investmentTotal, percent: pct(investmentTotal) },
    { category: "savings", amount: bankTotal, percent: pct(bankTotal) },
    { category: "property-and-other", amount: PROPERTY_AND_OTHER, percent: pct(PROPERTY_AND_OTHER) },
  ],
};

const cashFlow: CashFlow = {
  month: PERSONA_MONTH,
  income: INCOME,
  outflow: OUTFLOW,
  saved: INCOME - OUTFLOW,
  savedChangeVsLastMonth: SAVED_CHANGE_VS_LAST_MONTH,
  categories: [
    { category: "emi", amount: EMI },
    { category: "sips", amount: SIPS },
    { category: "rent", amount: RENT },
    { category: "food", amount: FOOD },
    { category: "other", amount: OUTFLOW - (EMI + SIPS + RENT + FOOD) },
  ],
  insight: { kind: "dining-above-average", percentAboveAverage: 22, baselineMonths: 6 },
};

/* ── Insights ─────────────────────────────────────────────────────────────────────────────────── */

const essentials = EMI + RENT + FOOD;
const refi = refinance({
  balance: LOAN.outstanding,
  currentRatePct: LOAN.ratePercent,
  newRatePct: REFINANCE.marketRatePercent,
  monthsLeft: LOAN.monthsLeft,
  upfrontCost: REFINANCE.upfrontCost,
});
const DEPOSIT = { amount: 210_000, savingsRatePercent: 3, depositRatePercent: 7.1, termMonths: 12 };

const insights: Insight[] = [
  {
    id: "refi",
    kind: "refinance",
    loanId: "hdfc-home",
    currentRatePercent: LOAN.ratePercent,
    marketRatePercent: REFINANCE.marketRatePercent,
    monthlySaving: Math.round(refi.monthlySaving),
    annualSaving: Math.round(refi.annualSaving),
    upfrontCost: REFINANCE.upfrontCost,
    costs: REFINANCE_COSTS,
    breakEvenMonths: Math.ceil(refi.breakEvenMonths),
  },
  {
    id: "fd",
    kind: "deposit",
    amount: DEPOSIT.amount,
    bufferLeft: bankTotal - DEPOSIT.amount,
    savingsRatePercent: DEPOSIT.savingsRatePercent,
    depositRatePercent: DEPOSIT.depositRatePercent,
    termMonths: DEPOSIT.termMonths,
    extraPerYear: Math.round((DEPOSIT.amount * (DEPOSIT.depositRatePercent - DEPOSIT.savingsRatePercent)) / 100),
  },
  {
    id: "ef",
    kind: "emergency-fund",
    monthlyAmount: 50_000,
    heldAmount: bankTotal,
    // Six months of essentials is ₹7,14,870. The prototype rounds the goal up to ₹7.2L.
    targetAmount: 720_000,
    targetMonths: 6,
    essentialsPerMonth: essentials,
    monthsHeld: bufferMonths(bankTotal, essentials),
    targetDate: "2027-03",
  },
];

const home: HomeSummary = {
  asOf: PERSONA_TODAY,
  netWorth: { value: netWorth.value, changeThisMonth: netWorth.changeThisMonth },
  month: {
    month: PERSONA_MONTH,
    income: cashFlow.income,
    outflow: cashFlow.outflow,
    saved: cashFlow.saved,
    savedChangeVsLastMonth: cashFlow.savedChangeVsLastMonth,
  },
  lookAt: insights.filter((i) => i.id === "refi" || i.id === "fd"),
};

/* ── Health score ─────────────────────────────────────────────────────────────────────────────── */

const health: HealthScore = {
  score: 742,
  outOf: 900,
  changeThisMonth: 18,
  topPercentForIncomeBand: 22,
  components: [
    { id: "debt-to-income", value: (EMI / INCOME) * 100, unit: "percent", score: 78 },
    { id: "savings-rate", value: ((INCOME - OUTFLOW) / INCOME) * 100, unit: "percent", score: 82 },
    { id: "emergency-fund", value: bufferMonths(bankTotal, essentials), unit: "months", score: 58 },
    { id: "card-utilisation", value: (CARD.outstanding / CARD.limit) * 100, unit: "percent", score: 90 },
    { id: "diversification", value: 64, unit: "percent", score: 64 },
    { id: "repayment-track", value: 96, unit: "percent", score: 96 },
  ],
  drags: ["emergency-fund", "diversification"],
};

/* ── Goals ────────────────────────────────────────────────────────────────────────────────────── */

type GoalSeed = Omit<Goal, "monthsRemaining" | "percentFunded" | "monthlyNeeded">;

function goal(seed: GoalSeed): Goal {
  const monthsRemaining = monthsBetween(PERSONA_MONTH, seed.targetDate);
  return {
    ...seed,
    monthsRemaining,
    percentFunded: Math.round((seed.fundedAmount / seed.targetAmount) * 100),
    monthlyNeeded: Math.round(
      monthlyContributionForGoal({ target: seed.targetAmount, saved: seed.fundedAmount, annualReturnPct: seed.assumedReturnPercent, months: monthsRemaining }),
    ),
  };
}

const goals: Goal[] = [
  goal({
    id: "home-upgrade",
    name: "Home upgrade",
    targetAmount: 3_000_000,
    fundedAmount: 840_000,
    targetDate: "2027-12",
    assumedReturnPercent: 6,
    currentMonthlyContribution: 25_000,
    contributions: [
      { kind: "fund", label: "Parag Parikh Flexi Cap", institution: "Groww", frequency: "monthly", amount: 15_000, since: "2024-04", currentValue: 550_000 },
      { kind: "recurring-deposit", institution: "HDFC", frequency: "monthly", amount: 10_000, since: "2025-08", currentValue: 150_000 },
      { kind: "savings-top-up", institution: "HDFC", frequency: "one-time", amount: 140_000, since: "2026-01", currentValue: 140_000 },
    ],
  }),
  // Cash in savings, so the maths assumes no market return.
  goal({ id: "emergency-fund", name: "Emergency fund", targetAmount: 720_000, fundedAmount: bankTotal, targetDate: "2027-03", assumedReturnPercent: 0 }),
  goal({ id: "daughters-education", name: "Daughter's education", targetAmount: 5_000_000, fundedAmount: 620_000, targetDate: "2038-06", assumedReturnPercent: 6 }),
];

/* ── Tax (financial year 2026-27) ─────────────────────────────────────────────────────────────── */

const items80C: TaxSummary["section80C"]["items"] = [
  { id: "ppf", kind: "ppf", provider: "HDFC", amount: 42_000, schedule: "auto-debit" },
  { id: "elss", kind: "elss", provider: "Parag Parikh Tax Saver", amount: 30_000, schedule: "sip", monthlyAmount: 2_500 },
  { id: "life", kind: "life-insurance", provider: "HDFC Life", amount: 22_000, schedule: "annual" },
];
const HOME_LOAN_INTEREST_PAID = 551_800;
const HOME_LOAN_INTEREST_CAP = 200_000;

const tax: TaxSummary = {
  financialYear: "2026-27",
  asOf: PERSONA_TODAY,
  deadline: "2027-03-31",
  slabPercent: 30,
  section80C: { limit: 150_000, used: items80C.reduce((sum, i) => sum + i.amount, 0), items: items80C },
  section80D: { limit: 25_000, used: 14_000 },
  homeLoanInterest: {
    paid: HOME_LOAN_INTEREST_PAID,
    cap: HOME_LOAN_INTEREST_CAP,
    deductible: Math.min(HOME_LOAN_INTEREST_PAID, HOME_LOAN_INTEREST_CAP),
  },
};

/* ── Consents ─────────────────────────────────────────────────────────────────────────────────── */

const consents: Consent[] = [
  {
    id: "consent-dashboard",
    purpose: "financial-dashboard",
    scope: "balances-transactions-holdings",
    status: "active",
    grantedOn: "2026-09-24",
    expiresOn: "2027-09-24",
    durationMonths: 12,
    refreshEveryHours: 12,
  },
  {
    id: "consent-health",
    purpose: "health-score",
    scope: "aggregated-analysis",
    status: "active",
    grantedOn: "2026-09-24",
    expiresOn: "2027-09-24",
    durationMonths: 12,
    refreshEveryHours: 12,
  },
];

/** The whole persona. mock.ts hands out deep copies, so callers can never change these. */
/**
 * Twelve months ending at today's net worth. The persona has no real history, so these are illustrative (`sample: true`):
 * the monthly gains are fixed numbers, and the last is this month's ₹1,24,000 so the line agrees with the Home caption.
 */
const SAMPLE_MONTHLY_GAINS = [95_000, 110_000, 80_000, 132_000, 101_000, 88_000, 120_000, 97_000, 115_000, 105_000, netWorth.changeThisMonth];
const netWorthHistory: NetWorthHistory = (() => {
  const [year, month] = PERSONA_TODAY.split("-").map(Number);
  const values = [netWorth.value];
  for (let i = SAMPLE_MONTHLY_GAINS.length - 1; i >= 0; i--) values.unshift(values[0] - SAMPLE_MONTHLY_GAINS[i]);
  return {
    sample: true,
    points: values.map((value, i) => {
      const index = year * 12 + (month - 1) - (values.length - 1 - i);
      return { month: `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`, value };
    }),
  };
})();

export const persona = {
  profile,
  accounts,
  allAccounts,
  transactions,
  netWorth,
  netWorthHistory,
  cashFlow,
  insights,
  home,
  health,
  goals,
  tax,
  consents,
};
