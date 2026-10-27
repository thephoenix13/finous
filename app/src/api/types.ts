/**
 * The contract between the app and its backend. The mock (mock.ts) and the future HTTP client both
 * implement `Api`; contract.suite.ts is the shared test that any implementation must pass.
 *
 * Conventions
 *  - Money is a whole number of rupees (never paise). Spending is negative, income is positive.
 *  - Dates are ISO ("2026-09-28"), months are "2026-09". The backend never sends formatted text:
 *    amounts, rates and `kind` discriminants only. The client formats and translates (see src/i18n).
 *  - Names of banks, funds and cards are proper nouns and arrive ready to display.
 *  - Reads only for now. Mutations (revoke consent, add a manual asset) arrive with the milestones that need them.
 */

export type Rupees = number;
/** ISO calendar date, for example "2026-09-28". */
export type IsoDate = string;
/** Calendar month, for example "2026-09". */
export type MonthString = string;

/** GET /v1/me */
export type Profile = {
  id: string;
  name: string;
  firstName: string;
  city: string;
  email: string;
};

/* ── Accounts ─────────────────────────────────────────────────────────────────────────────────── */

export type BankAccount = {
  kind: "bank";
  id: string;
  name: string;
  accountType: "savings";
  last4: string;
  balance: Rupees;
  /** Net movement this month. Absent when the bank has not shared enough history. */
  changeThisMonth?: Rupees;
};

export type LoanAccount = {
  kind: "loan";
  id: string;
  name: string;
  loanType: "home";
  outstanding: Rupees;
  ratePercent: number;
  startedOn: MonthString;
  endsOn: MonthString;
  monthsLeft: number;
  emi: Rupees;
  /** 0 to 100. */
  repaidPercent: number;
};

export type CardAccount = {
  kind: "card";
  id: string;
  name: string;
  last4: string;
  outstanding: Rupees;
  limit: Rupees;
  minimumDue: Rupees;
  /** Day of the month. */
  statementDay: number;
  dueDay: number;
  autoPay: boolean;
};

export type InvestmentAccount = {
  kind: "investment";
  id: string;
  name: string;
  instrument: "mutual-funds" | "stocks" | "ppf";
  /** Who holds it, when that is not in the name. */
  institution?: string;
  value: Rupees;
  activeSips?: number;
  holdings?: number;
  openedYear?: number;
};

export type Account = BankAccount | LoanAccount | CardAccount | InvestmentAccount;

/** GET /v1/accounts */
export type AccountsOverview = {
  asOf: IsoDate;
  bank: BankAccount[];
  loans: LoanAccount[];
  cards: CardAccount[];
  investments: InvestmentAccount[];
};

/* ── Transactions ─────────────────────────────────────────────────────────────────────────────── */

export type TransactionCategory = "emi" | "sip" | "rent" | "food" | "income" | "other";

export type Transaction = {
  id: string;
  accountId: string;
  date: IsoDate;
  /** 24-hour "21:12" in India time, when the bank reports it. */
  time?: string;
  description: string;
  /** Negative is money out. */
  amount: Rupees;
  category: TransactionCategory;
};

export type TransactionQuery = {
  /** Case-insensitive match on the description. */
  search?: string;
  accountId?: string;
  limit?: number;
};

/** GET /v1/transactions. Newest first. */
export type TransactionPage = {
  items: Transaction[];
  /** Matches before `limit` was applied. */
  total: number;
};

/* ── Net worth, cash flow, home ───────────────────────────────────────────────────────────────── */

export type AllocationCategory = "investments" | "savings" | "property-and-other";

/** GET /v1/net-worth. A 12-month history arrives with M4; the prototype only draws a decorative curve. */
export type NetWorth = {
  asOf: IsoDate;
  value: Rupees;
  changeThisMonth: Rupees;
  assets: Rupees;
  liabilities: Rupees;
  allocation: { category: AllocationCategory; amount: Rupees; percent: number }[];
};

export type CashFlowCategory = "emi" | "sips" | "rent" | "food" | "other";

/** GET /v1/cash-flow. The current month. */
export type CashFlow = {
  month: MonthString;
  income: Rupees;
  outflow: Rupees;
  saved: Rupees;
  savedChangeVsLastMonth: Rupees;
  categories: { category: CashFlowCategory; amount: Rupees }[];
  insight?: { kind: "dining-above-average"; percentAboveAverage: number; baselineMonths: number };
};

/* ── Insights ─────────────────────────────────────────────────────────────────────────────────── */

export type RefinanceInsight = {
  id: string;
  kind: "refinance";
  loanId: string;
  currentRatePercent: number;
  marketRatePercent: number;
  monthlySaving: Rupees;
  annualSaving: Rupees;
  upfrontCost: Rupees;
  breakEvenMonths: number;
};

export type DepositInsight = {
  id: string;
  kind: "deposit";
  /** The part of savings that could earn more. */
  amount: Rupees;
  /** Left in savings as the buffer. */
  bufferLeft: Rupees;
  savingsRatePercent: number;
  depositRatePercent: number;
  termMonths: number;
  extraPerYear: Rupees;
};

export type EmergencyFundInsight = {
  id: string;
  kind: "emergency-fund";
  monthlyAmount: Rupees;
  heldAmount: Rupees;
  targetAmount: Rupees;
  targetMonths: number;
  essentialsPerMonth: Rupees;
  monthsHeld: number;
  targetDate: MonthString;
};

export type Insight = RefinanceInsight | DepositInsight | EmergencyFundInsight;

/** GET /v1/home. Everything the Home screen needs in one call. */
export type HomeSummary = {
  asOf: IsoDate;
  netWorth: { value: Rupees; changeThisMonth: Rupees };
  month: { month: MonthString; income: Rupees; outflow: Rupees; saved: Rupees; savedChangeVsLastMonth: Rupees };
  /** The two things worth looking at. A subset of GET /v1/insights. */
  lookAt: Insight[];
};

/* ── Plans: health, goals ─────────────────────────────────────────────────────────────────────── */

export type HealthComponentId =
  | "debt-to-income"
  | "savings-rate"
  | "emergency-fund"
  | "card-utilisation"
  | "diversification"
  | "repayment-track";

export type HealthComponent = {
  id: HealthComponentId;
  value: number;
  unit: "percent" | "months";
  /** 0 to 100, how full the bar is. */
  score: number;
};

/** GET /v1/health-score */
export type HealthScore = {
  score: number;
  outOf: number;
  changeThisMonth: number;
  /** "Top 22% for your income band" is 22. */
  topPercentForIncomeBand: number;
  components: HealthComponent[];
  drags: HealthComponentId[];
};

export type GoalContribution = {
  label: string;
  institution: string;
  frequency: "monthly" | "one-time";
  /** Per month, or the single amount. */
  amount: Rupees;
  since: MonthString;
  /** What it is worth today. */
  currentValue: Rupees;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: Rupees;
  fundedAmount: Rupees;
  targetDate: MonthString;
  monthsRemaining: number;
  /** 0 to 100. */
  percentFunded: number;
  /** The return the maths assumes, shown to the user so the number is honest. */
  assumedReturnPercent: number;
  monthlyNeeded: Rupees;
  /** Present when the linked contributions are known. */
  contributions?: GoalContribution[];
  currentMonthlyContribution?: Rupees;
};

/* ── Consent ──────────────────────────────────────────────────────────────────────────────────── */

export type Consent = {
  id: string;
  purpose: "financial-dashboard" | "health-score";
  scope: "balances-transactions-holdings" | "aggregated-analysis";
  status: "active" | "revoked" | "expired";
  grantedOn: IsoDate;
  expiresOn: IsoDate;
  durationMonths: number;
  refreshEveryHours: number;
};

/* ── The API ──────────────────────────────────────────────────────────────────────────────────── */

export type RequestOptions = {
  /** Cancels the request. The promise rejects with an AbortError. */
  signal?: AbortSignal;
};

export interface Api {
  /** GET /v1/me */
  getProfile(options?: RequestOptions): Promise<Profile>;
  /** GET /v1/home */
  getHome(options?: RequestOptions): Promise<HomeSummary>;
  /** GET /v1/accounts */
  listAccounts(options?: RequestOptions): Promise<AccountsOverview>;
  /** GET /v1/accounts/:id. Rejects with ApiError "not_found" for an unknown id. */
  getAccount(id: string, options?: RequestOptions): Promise<Account>;
  /** GET /v1/transactions */
  listTransactions(query?: TransactionQuery, options?: RequestOptions): Promise<TransactionPage>;
  /** GET /v1/net-worth */
  getNetWorth(options?: RequestOptions): Promise<NetWorth>;
  /** GET /v1/cash-flow */
  getCashFlow(options?: RequestOptions): Promise<CashFlow>;
  /** GET /v1/insights */
  listInsights(options?: RequestOptions): Promise<Insight[]>;
  /** GET /v1/health-score */
  getHealthScore(options?: RequestOptions): Promise<HealthScore>;
  /** GET /v1/goals */
  listGoals(options?: RequestOptions): Promise<Goal[]>;
  /** GET /v1/goals/:id. Rejects with ApiError "not_found" for an unknown id. */
  getGoal(id: string, options?: RequestOptions): Promise<Goal>;
  /** GET /v1/consents */
  listConsents(options?: RequestOptions): Promise<Consent[]>;
}
