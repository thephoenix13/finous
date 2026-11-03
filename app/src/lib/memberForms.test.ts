import { describe, expect, it } from "vitest";
import { aaravAccounts, aaravInput, aaravMonth } from "../derive/fixture";
import type { MemberAccount } from "../derive/types";
import { readFields } from "./formFields";
import {
  ACCOUNT_KINDS,
  FIGURES_SPECS,
  GOAL_SPECS,
  TAX_SPECS,
  accountDraft,
  accountInitial,
  accountSpecs,
  figuresDraft,
  figuresInitial,
  goalDraft,
  goalInitial,
  taxDraft,
  taxInitial,
  type AccountKind,
} from "./memberForms";

const read = (specs: Parameters<typeof readFields>[0], raw: Record<string, string>) => {
  const r = readFields(specs, raw);
  if (!r.ok) throw new Error(`not valid: ${JSON.stringify(r.errors)}`);
  return r.values;
};

describe("account fields", () => {
  it("ask for the kind first when it is still to be chosen, and not when editing", () => {
    for (const kind of ACCOUNT_KINDS) {
      expect(accountSpecs(kind, { choosingKind: true })[0].key).toBe("kind");
      expect(accountSpecs(kind, { choosingKind: false }).map((s) => s.key)).not.toContain("kind");
    }
    expect(accountSpecs("", { choosingKind: true }).map((s) => s.key)).toEqual(["kind"]);
  });

  it("require what the screens cannot do without, and nothing more", () => {
    const required = (kind: string) =>
      accountSpecs(kind, { choosingKind: false })
        .filter((s) => s.required)
        .map((s) => s.key);
    expect(required("bank")).toEqual(["name", "last4", "balance"]);
    expect(required("loan")).toEqual(["name", "loanType", "outstanding", "ratePercent", "monthsLeft"]);
    expect(required("card")).toEqual(["name", "last4", "outstanding", "limit", "statementDay", "dueDay"]);
    expect(required("investment")).toEqual(["name", "instrument", "value"]);
    expect(required("other")).toEqual(["name", "assetKind", "value"]);
  });

  it("refuse a loan that no screen could work with", () => {
    const specs = accountSpecs("loan", { choosingKind: false });
    const base = { name: "Car", loanType: "car", outstanding: "100000", ratePercent: "9", monthsLeft: "24" };
    expect(readFields(specs, base).ok).toBe(true);
    expect(readFields(specs, { ...base, outstanding: "0" }).ok).toBe(false);
    expect(readFields(specs, { ...base, monthsLeft: "0" }).ok).toBe(false);
    expect(readFields(specs, { ...base, monthsLeft: "601" }).ok).toBe(false);
    expect(readFields(specs, { ...base, ratePercent: "41" }).ok).toBe(false);
  });

  it("refuse a card day outside the month", () => {
    const specs = accountSpecs("card", { choosingKind: false });
    const base = { name: "C", last4: "1234", outstanding: "0", limit: "5000", statementDay: "28", dueDay: "15" };
    expect(readFields(specs, base).ok).toBe(true);
    expect(readFields(specs, { ...base, statementDay: "32" }).ok).toBe(false);
    expect(readFields(specs, { ...base, dueDay: "0" }).ok).toBe(false);
  });
});

describe("editing an account puts back exactly what was saved", () => {
  it.each(aaravAccounts.map((a) => [`${a.kind}: ${a.name}`, a] as const))("%s", (_name, account) => {
    const values = read(accountSpecs(account.kind, { choosingKind: false }), accountInitial(account));
    expect(accountDraft(account.kind as AccountKind, values, account.id)).toEqual(account);
  });

  it("keeps what was never stated as not stated", () => {
    const loan: MemberAccount = { kind: "loan", id: "l", name: "Car", loanType: "car", outstanding: 500000, ratePercent: 9.5, monthsLeft: 36 };
    const initial = accountInitial(loan);
    expect(initial.emi).toBe("");
    expect(initial.startedOn).toBe("");
    const draft = accountDraft("loan", read(accountSpecs("loan", { choosingKind: false }), initial), "l");
    expect(draft).toMatchObject({ emi: undefined, startedOn: undefined, originalAmount: undefined });
  });

  it("does not put an id on a new account", () => {
    expect(accountDraft("bank", { name: "B", last4: "1234", balance: 5 })).not.toHaveProperty("id");
  });
});

describe("monthly figures", () => {
  it("need an income, and treat a blank cost as nothing spent", () => {
    expect(readFields(FIGURES_SPECS, { rent: "5" }).ok).toBe(false);
    expect(readFields(FIGURES_SPECS, { income: "0" }).ok).toBe(false);
    const values = read(FIGURES_SPECS, { income: "2,40,000", rent: "42,600" });
    expect(figuresDraft("2026-11", values)).toEqual({ month: "2026-11", income: 240000, rent: 42600, food: 0, other: 0, sips: 0 });
    expect(figuresDraft("2026-11", read(FIGURES_SPECS, { income: "1" }))).toEqual({ month: "2026-11", income: 1, rent: 0, food: 0, other: 0, sips: 0 });
  });

  it("start from what was saved", () => {
    const values = read(FIGURES_SPECS, figuresInitial(aaravMonth));
    expect(figuresDraft(aaravMonth.month, values)).toEqual(aaravMonth);
    expect(figuresInitial(undefined)).toEqual({});
  });
});

describe("goals", () => {
  const goal = aaravInput().goals[0];

  it("start from what was saved and save the same", () => {
    const values = read(GOAL_SPECS, goalInitial(goal));
    expect(goalDraft(values, goal.id)).toEqual(goal);
  });

  it("need a name, an amount and a month; money already saved and return default to nothing", () => {
    expect(readFields(GOAL_SPECS, { goalName: "Car", targetAmount: "600000" }).ok).toBe(false);
    const values = read(GOAL_SPECS, { goalName: "Car", targetAmount: "6,00,000", targetDate: "2028-03" });
    expect(goalDraft(values)).toEqual({ name: "Car", targetAmount: 600000, fundedAmount: 0, targetDate: "2028-03", assumedReturnPercent: 0 });
  });

  it("will not take a return over 30%", () => {
    expect(readFields(GOAL_SPECS, { goalName: "Car", targetAmount: "1", targetDate: "2028-03", assumedReturnPercent: "31" }).ok).toBe(false);
  });
});

describe("tax details", () => {
  it("treat blank as not stated (0), and put 0 back as blank", () => {
    expect(taxDraft(read(TAX_SPECS, {}))).toEqual({ slabPercent: 0, ppf: 0, elss: 0, lifeInsurance: 0, health80D: 0, homeLoanInterestPaid: 0 });
    expect(taxInitial({ slabPercent: 30, ppf: 0, elss: 5, lifeInsurance: 0, health80D: 0, homeLoanInterestPaid: 0 })).toMatchObject({ slabPercent: "30", ppf: "", elss: "5" });
    expect(taxInitial(undefined)).toEqual({});
  });

  it("start from what was saved and save the same", () => {
    const tax = aaravInput().tax!;
    expect(taxDraft(read(TAX_SPECS, taxInitial(tax)))).toEqual(tax);
  });

  it("will not take a slab over 45%", () => {
    expect(readFields(TAX_SPECS, { slabPercent: "46" }).ok).toBe(false);
  });
});
