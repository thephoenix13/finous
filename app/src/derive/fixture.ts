import { persona } from "../api/persona";
import type { MarketRates, MemberAccount, MemberInput, MonthlyFigures } from "./types";

/** Aarav's data as a member would have entered it. Used to check the member Api and the derivation against the sample customer. */
export const AARAV_ASOF = "2026-09-29";

export const aaravAccounts: MemberAccount[] = [
  { kind: "bank", id: "hdfc", name: "HDFC Bank", last4: "4821", balance: 284_000 },
  { kind: "bank", id: "sbi", name: "State Bank of India", last4: "7723", balance: 136_000 },
  { kind: "loan", id: "hdfc-home", name: "HDFC Home Loan", loanType: "home", outstanding: 6_200_000, ratePercent: 8.9, monthsLeft: 210, originalAmount: 10_000_000, startedOn: "2025-03" },
  { kind: "card", id: "icici-cc", name: "ICICI Amazon Pay", last4: "4419", outstanding: 18_400, limit: 300_000, statementDay: 28, dueDay: 15, autoPay: false },
  { kind: "investment", id: "groww", name: "Groww Mutual Funds", instrument: "mutual-funds", value: 2_480_000, activeSips: 9 },
  { kind: "investment", id: "zerodha", name: "Zerodha Holdings", instrument: "stocks", value: 840_000, holdings: 14 },
  { kind: "investment", id: "ppf", name: "PPF Account", instrument: "ppf", value: 620_000, institution: "HDFC", openedYear: 2019 },
  { kind: "other", id: "home", name: "Flat", assetKind: "property", value: 9_500_000 },
];

export const aaravMonth: MonthlyFigures = { month: "2026-09", income: 240_000, rent: 42_600, food: 18_200, other: 32_255, sips: 35_000 };
export const aaravRates: MarketRates = { homeLoan: 8.5, fixedDeposit12m: 7.1, savings: 3, asOf: AARAV_ASOF };

export const aaravInput = (over: Partial<MemberInput> = {}): MemberInput => ({
  asOf: AARAV_ASOF,
  profile: persona.profile,
  accounts: aaravAccounts,
  transactions: persona.transactions,
  monthly: [aaravMonth],
  goals: persona.goals.map((g) => ({ id: g.id, name: g.name, targetAmount: g.targetAmount, fundedAmount: g.fundedAmount, targetDate: g.targetDate, assumedReturnPercent: g.assumedReturnPercent })),
  tax: { slabPercent: 30, ppf: 42_000, elss: 30_000, lifeInsurance: 22_000, health80D: 14_000, homeLoanInterestPaid: 551_800 },
  rates: aaravRates,
  snapshots: [],
  ...over,
});

export const emptyMember = (over: Partial<MemberInput> = {}): MemberInput => ({
  asOf: AARAV_ASOF,
  profile: { id: "u1", name: "alice@example.com", firstName: "", city: "", email: "alice@example.com" },
  accounts: [],
  transactions: [],
  monthly: [],
  goals: [],
  rates: {},
  snapshots: [],
  ...over,
});
