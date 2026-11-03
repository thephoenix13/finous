import type { LoanType, Profile, Transaction, TransactionCategory } from "../api";
import { financialYear } from "./derive";
import type { MarketRates, MemberAccount, MemberGoal, MemberInput, MonthlyFigures, OtherAssetKind, Snapshot, TaxInputs } from "./types";

/**
 * The database rows as they arrive, and the conversion to what the derivation works from. A row that does not make sense (a balance
 * that is not a number, a loan with no months left) is skipped and reported, never trusted and never allowed to break the screen.
 */
export type RawRows = {
  profile: { first_name: string | null; full_name: string | null; city: string | null } | null;
  accounts: { id: string; kind: string; name: string; details: unknown }[];
  transactions: { id: string; account_id: string | null; occurred_on: string; occurred_at: string | null; description: string; amount: number | string; category: string }[];
  monthly: { month: string; income: number | string; rent: number | string; food: number | string; other: number | string; sips: number | string }[];
  goals: { id: string; name: string; target_amount: number | string; funded_amount: number | string; target_date: string; assumed_return_percent: number | string }[];
  tax: { financial_year: string; inputs: unknown }[];
  snapshots: { taken_on: string; value: number | string }[];
  rates: { key: string; value: number | string; as_of: string }[];
};

export type ParsedRows = { input: MemberInput; skipped: string[] };

const LOAN_TYPES: LoanType[] = ["home", "car", "personal", "education", "other"];
const INSTRUMENTS = ["mutual-funds", "stocks", "ppf"] as const;
const OTHER_KINDS: OtherAssetKind[] = ["property", "gold", "fixed-deposit", "other"];
const CATEGORIES: TransactionCategory[] = ["emi", "sip", "rent", "food", "income", "other"];

type Bag = Record<string, unknown>;
const isBag = (v: unknown): v is Bag => typeof v === "object" && v !== null && !Array.isArray(v);

/** A number from a JSON number or a numeric string, or undefined if it is neither. */
function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

class Bad extends Error {}
const need = <T,>(value: T | undefined, field: string): T => {
  if (value === undefined) throw new Bad(field);
  return value;
};
const num = (bag: Bag, field: string, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = true } = {}): number => {
  const n = toNumber(bag[field]);
  if (n === undefined || n < min || n > max || (integer && !Number.isInteger(n))) throw new Bad(field);
  return n;
};
const optNum = (bag: Bag, field: string, opts?: Parameters<typeof num>[2]): number | undefined => (bag[field] === undefined || bag[field] === null ? undefined : num(bag, field, opts));
const optText = (bag: Bag, field: string): string | undefined => (typeof bag[field] === "string" && bag[field].trim() !== "" ? (bag[field] as string).trim() : undefined);
const last4 = (bag: Bag): string => {
  const v = bag.last4;
  if (typeof v !== "string" || !/^\d{4}$/.test(v)) throw new Bad("last4");
  return v;
};
const monthText = (v: unknown, field: string): string => {
  if (typeof v !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw new Bad(field);
  return v;
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], field: string): T => {
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new Bad(field);
  return v as T;
};

function parseAccount(row: RawRows["accounts"][number]): MemberAccount {
  const name = need(row.name?.trim() || undefined, "name");
  const d = isBag(row.details) ? row.details : (() => { throw new Bad("details"); })();
  const base = { id: row.id, name };
  switch (row.kind) {
    case "bank":
      return { kind: "bank", ...base, last4: last4(d), balance: num(d, "balance") };
    case "loan": {
      const startedOn = d.startedOn === undefined || d.startedOn === null ? undefined : monthText(d.startedOn, "startedOn");
      return {
        kind: "loan",
        ...base,
        loanType: oneOf(d.loanType, LOAN_TYPES, "loanType"),
        outstanding: num(d, "outstanding", { min: 1 }),
        ratePercent: num(d, "ratePercent", { min: 0, max: 40, integer: false }),
        monthsLeft: num(d, "monthsLeft", { min: 1, max: 600 }),
        emi: optNum(d, "emi", { min: 1 }),
        startedOn,
        originalAmount: optNum(d, "originalAmount", { min: 1 }),
      };
    }
    case "card":
      return {
        kind: "card",
        ...base,
        last4: last4(d),
        outstanding: num(d, "outstanding"),
        limit: num(d, "limit"),
        statementDay: num(d, "statementDay", { min: 1, max: 31 }),
        dueDay: num(d, "dueDay", { min: 1, max: 31 }),
        autoPay: d.autoPay === true,
        minimumDue: optNum(d, "minimumDue"),
      };
    case "investment":
      return {
        kind: "investment",
        ...base,
        instrument: oneOf(d.instrument, INSTRUMENTS, "instrument"),
        value: num(d, "value"),
        institution: optText(d, "institution"),
        activeSips: optNum(d, "activeSips"),
        holdings: optNum(d, "holdings"),
        openedYear: optNum(d, "openedYear", { min: 1950, max: 2100 }),
      };
    case "other":
      return { kind: "other", ...base, assetKind: oneOf(d.assetKind, OTHER_KINDS, "assetKind"), value: num(d, "value") };
    default:
      throw new Bad("kind");
  }
}

function parseTransaction(row: RawRows["transactions"][number]): Transaction {
  const amount = toNumber(row.amount);
  if (amount === undefined || amount === 0 || !Number.isInteger(amount)) throw new Bad("amount");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.occurred_on)) throw new Bad("occurred_on");
  const description = row.description?.trim();
  if (!description) throw new Bad("description");
  return {
    id: row.id,
    accountId: row.account_id ?? "",
    date: row.occurred_on,
    time: row.occurred_at ? row.occurred_at.slice(0, 5) : undefined,
    description,
    amount,
    category: oneOf(row.category, CATEGORIES, "category"),
  };
}

function parseMonthly(row: RawRows["monthly"][number]): MonthlyFigures {
  const bag = row as unknown as Bag;
  return { month: monthText(row.month, "month"), income: num(bag, "income"), rent: num(bag, "rent"), food: num(bag, "food"), other: num(bag, "other"), sips: num(bag, "sips") };
}

function parseGoal(row: RawRows["goals"][number]): MemberGoal {
  const bag = row as unknown as Bag;
  if (!row.name?.trim()) throw new Bad("name");
  return {
    id: row.id,
    name: row.name.trim(),
    targetAmount: num(bag, "target_amount", { min: 1 }),
    fundedAmount: num(bag, "funded_amount"),
    targetDate: monthText(typeof row.target_date === "string" ? row.target_date.slice(0, 7) : undefined, "target_date"),
    assumedReturnPercent: num(bag, "assumed_return_percent", { min: 0, max: 30, integer: false }),
  };
}

function parseTax(inputs: unknown): TaxInputs {
  const d = isBag(inputs) ? inputs : {};
  // A figure that is missing or not sensible counts as zero: the person simply has not told us.
  const get = (field: string, opts?: Parameters<typeof num>[2]) => {
    try {
      return optNum(d, field, opts) ?? 0;
    } catch {
      return 0;
    }
  };
  return {
    slabPercent: get("slabPercent", { min: 0, max: 45, integer: false }),
    ppf: get("ppf"),
    elss: get("elss"),
    lifeInsurance: get("lifeInsurance"),
    health80D: get("health80D"),
    homeLoanInterestPaid: get("homeLoanInterestPaid"),
  };
}

const RATE_KEYS: Record<string, keyof Omit<MarketRates, "asOf">> = { "home-loan-market": "homeLoan", "fd-12m": "fixedDeposit12m", "savings-rate": "savings" };

export function parseRates(rows: RawRows["rates"]): MarketRates {
  const rates: MarketRates = {};
  for (const row of rows) {
    const field = RATE_KEYS[row.key];
    const value = toNumber(row.value);
    if (!field || value === undefined || value < 0 || value > 50) continue;
    rates[field] = value;
    if (!rates.asOf || row.as_of > rates.asOf) rates.asOf = row.as_of;
  }
  return rates;
}

export function parseProfile(row: RawRows["profile"], who: { userId: string; email: string }): Profile {
  const first = row?.first_name?.trim() || undefined;
  const full = row?.full_name?.trim() || undefined;
  return {
    id: who.userId,
    name: full ?? first ?? who.email,
    firstName: first ?? full?.split(/\s+/)[0] ?? "",
    city: row?.city?.trim() ?? "",
    email: who.email,
  };
}

/** Turns the rows into the derivation's input. Rows that do not parse are left out and named in `skipped`. */
export function parseMemberRows(raw: RawRows, who: { userId: string; email: string; asOf: string }): ParsedRows {
  const skipped: string[] = [];
  const each = <R, T>(rows: R[], label: (r: R) => string, parse: (r: R) => T): T[] =>
    rows.flatMap((r) => {
      try {
        return [parse(r)];
      } catch (e) {
        skipped.push(`${label(r)}: ${e instanceof Bad ? e.message : "unreadable"}`);
        return [];
      }
    });

  const taxRow = raw.tax.find((t) => t.financial_year === financialYear(who.asOf).label);
  const snapshots: Snapshot[] = each(
    raw.snapshots,
    (s) => `snapshot ${s.taken_on}`,
    (s) => {
      const value = toNumber(s.value);
      if (value === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(s.taken_on)) throw new Bad("value");
      return { takenOn: s.taken_on, value };
    },
  );

  return {
    skipped,
    input: {
      asOf: who.asOf,
      profile: parseProfile(raw.profile, who),
      accounts: each(raw.accounts, (a) => `account ${a.name ?? a.id}`, parseAccount),
      transactions: each(raw.transactions, (t) => `transaction ${t.id}`, parseTransaction),
      monthly: each(raw.monthly, (m) => `month ${m.month}`, parseMonthly),
      goals: each(raw.goals, (g) => `goal ${g.name ?? g.id}`, parseGoal),
      tax: taxRow ? parseTax(taxRow.inputs) : undefined,
      rates: parseRates(raw.rates),
      snapshots,
    },
  };
}
