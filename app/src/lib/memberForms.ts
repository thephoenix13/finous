import type { LoanType } from "../api";
import type { AccountDraft, GoalDraft } from "../derive/serialize";
import type { MemberAccount, MemberGoal, MonthlyFigures, OtherAssetKind, TaxInputs } from "../derive/types";
import { toField, type FieldSpec } from "./formFields";

/** What each "enter your details" form asks, and how its answers become what is saved. Pure: the screens only draw it. */

export type FormValues = Record<string, string | number | boolean | undefined>;

export const ACCOUNT_KINDS = ["bank", "loan", "card", "investment", "other"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];
const LOAN_TYPES: readonly LoanType[] = ["home", "car", "personal", "education", "other"];
const INSTRUMENTS = ["mutual-funds", "stocks", "ppf"] as const;
const OTHER_KINDS: readonly OtherAssetKind[] = ["property", "gold", "fixed-deposit", "other"];

const text = (key: string, required = false): FieldSpec => ({ key, type: "text", required });
const rupees = (key: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, type: "rupees", ...extra });

const KIND_SPEC: FieldSpec = { key: "kind", type: "select", required: true, options: ACCOUNT_KINDS };

/** The fields for one kind of account, with the kind itself first when it is still to be chosen. */
export function accountSpecs(kind: string, { choosingKind }: { choosingKind: boolean }): FieldSpec[] {
  const head = choosingKind ? [KIND_SPEC] : [];
  switch (kind) {
    case "bank":
      return [...head, { ...text("name", true), hint: true }, { key: "last4", type: "last4", required: true, hint: true }, rupees("balance", { required: true })];
    case "loan":
      return [
        ...head,
        { ...text("name", true), hint: true },
        { key: "loanType", type: "select", required: true, options: LOAN_TYPES },
        rupees("outstanding", { required: true, min: 1 }),
        { key: "ratePercent", type: "percent", required: true, min: 0, max: 40, hint: true },
        { key: "monthsLeft", type: "integer", required: true, min: 1, max: 600, hint: true },
        { ...rupees("emi", { min: 1 }), hint: true },
        { key: "startedOn", type: "month", hint: true },
        rupees("originalAmount", { min: 1 }),
      ];
    case "card":
      return [
        ...head,
        { ...text("name", true), hint: true },
        { key: "last4", type: "last4", required: true, hint: true },
        rupees("outstanding", { required: true }),
        rupees("limit", { required: true, min: 1 }),
        { key: "statementDay", type: "integer", required: true, min: 1, max: 31, hint: true },
        { key: "dueDay", type: "integer", required: true, min: 1, max: 31 },
        { key: "autoPay", type: "switch" },
        rupees("minimumDue"),
      ];
    case "investment":
      return [
        ...head,
        { ...text("name", true), hint: true },
        { key: "instrument", type: "select", required: true, options: INSTRUMENTS },
        rupees("value", { required: true }),
        text("institution"),
        { key: "activeSips", type: "integer", min: 0, hint: true },
        { key: "holdings", type: "integer", min: 0 },
        { key: "openedYear", type: "integer", min: 1950, max: 2100 },
      ];
    case "other":
      return [...head, { ...text("name", true), hint: true }, { key: "assetKind", type: "select", required: true, options: OTHER_KINDS }, rupees("value", { required: true })];
    default:
      return head;
  }
}

const str = (v: FormValues[string]) => v as string;
const num = (v: FormValues[string]) => v as number;
const opt = (v: FormValues[string]) => v as number | undefined;

/** Turns checked answers into what is saved. `id` is present when editing. */
export function accountDraft(kind: AccountKind, v: FormValues, id?: string): AccountDraft {
  const base = { ...(id ? { id } : {}), name: str(v.name) };
  switch (kind) {
    case "bank":
      return { kind, ...base, last4: str(v.last4), balance: num(v.balance) };
    case "loan":
      return {
        kind,
        ...base,
        loanType: str(v.loanType) as LoanType,
        outstanding: num(v.outstanding),
        ratePercent: num(v.ratePercent),
        monthsLeft: num(v.monthsLeft),
        emi: opt(v.emi),
        startedOn: v.startedOn as string | undefined,
        originalAmount: opt(v.originalAmount),
      };
    case "card":
      return {
        kind,
        ...base,
        last4: str(v.last4),
        outstanding: num(v.outstanding),
        limit: num(v.limit),
        statementDay: num(v.statementDay),
        dueDay: num(v.dueDay),
        autoPay: v.autoPay === true,
        minimumDue: opt(v.minimumDue),
      };
    case "investment":
      return {
        kind,
        ...base,
        instrument: str(v.instrument) as (typeof INSTRUMENTS)[number],
        value: num(v.value),
        institution: v.institution as string | undefined,
        activeSips: opt(v.activeSips),
        holdings: opt(v.holdings),
        openedYear: opt(v.openedYear),
      };
    case "other":
      return { kind, ...base, assetKind: str(v.assetKind) as OtherAssetKind, value: num(v.value) };
  }
}

/** What each field starts as when editing an account: its saved figures as plain text, anything not stated left blank. */
export function accountInitial(a: MemberAccount): Record<string, string> {
  const base = { kind: a.kind, name: a.name };
  switch (a.kind) {
    case "bank":
      return { ...base, last4: a.last4, balance: toField(a.balance) };
    case "loan":
      return {
        ...base,
        loanType: a.loanType,
        outstanding: toField(a.outstanding),
        ratePercent: String(a.ratePercent),
        monthsLeft: String(a.monthsLeft),
        emi: toField(a.emi),
        startedOn: a.startedOn ?? "",
        originalAmount: toField(a.originalAmount),
      };
    case "card":
      return {
        ...base,
        last4: a.last4,
        outstanding: toField(a.outstanding),
        limit: toField(a.limit),
        statementDay: String(a.statementDay),
        dueDay: String(a.dueDay),
        autoPay: String(a.autoPay),
        minimumDue: toField(a.minimumDue),
      };
    case "investment":
      return {
        ...base,
        instrument: a.instrument,
        value: toField(a.value),
        institution: a.institution ?? "",
        activeSips: toField(a.activeSips),
        holdings: toField(a.holdings),
        openedYear: toField(a.openedYear),
      };
    case "other":
      return { ...base, assetKind: a.assetKind, value: toField(a.value) };
  }
}

export const FIGURES_SPECS: FieldSpec[] = [
  rupees("income", { required: true, min: 1 }),
  { ...rupees("rent"), hint: true },
  { ...rupees("food"), hint: true },
  { ...rupees("other"), hint: true },
  { ...rupees("sips"), hint: true },
];

/** Blank costs count as nothing spent on them; income is the one figure that has to be given. */
export const figuresDraft = (month: string, v: FormValues): MonthlyFigures => ({
  month,
  income: num(v.income),
  rent: opt(v.rent) ?? 0,
  food: opt(v.food) ?? 0,
  other: opt(v.other) ?? 0,
  sips: opt(v.sips) ?? 0,
});

export const figuresInitial = (f: MonthlyFigures | undefined): Record<string, string> =>
  f ? { income: toField(f.income), rent: toField(f.rent), food: toField(f.food), other: toField(f.other), sips: toField(f.sips) } : {};

export const GOAL_SPECS: FieldSpec[] = [
  text("goalName", true),
  rupees("targetAmount", { required: true, min: 1 }),
  { ...rupees("fundedAmount"), hint: true },
  { key: "targetDate", type: "month", required: true },
  { key: "assumedReturnPercent", type: "percent", min: 0, max: 30, hint: true },
];

export const goalDraft = (v: FormValues, id?: string): GoalDraft => ({
  ...(id ? { id } : {}),
  name: str(v.goalName),
  targetAmount: num(v.targetAmount),
  fundedAmount: opt(v.fundedAmount) ?? 0,
  targetDate: str(v.targetDate),
  assumedReturnPercent: opt(v.assumedReturnPercent) ?? 0,
});

export const goalInitial = (g: MemberGoal | undefined): Record<string, string> =>
  g ? { goalName: g.name, targetAmount: toField(g.targetAmount), fundedAmount: toField(g.fundedAmount), targetDate: g.targetDate, assumedReturnPercent: String(g.assumedReturnPercent) } : { assumedReturnPercent: "" };

export const TAX_SPECS: FieldSpec[] = [
  { key: "slabPercent", type: "percent", min: 0, max: 45, hint: true },
  { ...rupees("ppf"), hint: true },
  rupees("elss"),
  rupees("lifeInsurance"),
  { ...rupees("health80D"), hint: true },
  { ...rupees("homeLoanInterestPaid"), hint: true },
];

export const taxDraft = (v: FormValues): TaxInputs => ({
  slabPercent: opt(v.slabPercent) ?? 0,
  ppf: opt(v.ppf) ?? 0,
  elss: opt(v.elss) ?? 0,
  lifeInsurance: opt(v.lifeInsurance) ?? 0,
  health80D: opt(v.health80D) ?? 0,
  homeLoanInterestPaid: opt(v.homeLoanInterestPaid) ?? 0,
});

/** A figure of 0 means "not stated" for tax, so it goes back into the form blank. */
const blankIfZero = (n: number) => (n === 0 ? "" : String(n));
export const taxInitial = (t: TaxInputs | undefined): Record<string, string> =>
  t
    ? {
        slabPercent: blankIfZero(t.slabPercent),
        ppf: blankIfZero(t.ppf),
        elss: blankIfZero(t.elss),
        lifeInsurance: blankIfZero(t.lifeInsurance),
        health80D: blankIfZero(t.health80D),
        homeLoanInterestPaid: blankIfZero(t.homeLoanInterestPaid),
      }
    : {};

export const PROFILE_SPECS: FieldSpec[] = [text("fullName", true), text("city")];
