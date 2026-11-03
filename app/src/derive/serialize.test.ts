import { describe, expect, it } from "vitest";
import { financialYear } from "./derive";
import { aaravAccounts, aaravInput, aaravMonth, AARAV_ASOF } from "./fixture";
import { parseMemberRows, type RawRows } from "./rows";
import { accountRow, goalRow, monthlyRow, taxInputsJson, type AccountDraft } from "./serialize";
import type { MemberAccount } from "./types";

const who = { userId: "u1", email: "a@b.co", asOf: AARAV_ASOF };
const none: RawRows = { profile: null, accounts: [], transactions: [], monthly: [], goals: [], tax: [], snapshots: [], rates: [] };

const withoutId = (a: MemberAccount): AccountDraft => {
  const { id: _id, ...rest } = a;
  return rest as AccountDraft;
};

describe("saving then reading back gives the same thing", () => {
  it.each(aaravAccounts.map((a) => [`${a.kind}: ${a.name}`, a] as const))("account %s", (_name, account) => {
    const row = accountRow(withoutId(account));
    const read = parseMemberRows({ ...none, accounts: [{ id: account.id, ...row }] }, who);
    expect(read.skipped).toEqual([]);
    expect(read.input.accounts).toEqual([account]);
  });

  it("a loan with every optional figure, and one with none", () => {
    const full: MemberAccount = { kind: "loan", id: "l", name: "Car", loanType: "car", outstanding: 500000, ratePercent: 9.25, monthsLeft: 36, emi: 16000, startedOn: "2024-01", originalAmount: 700000 };
    const bare: MemberAccount = { kind: "loan", id: "l", name: "Car", loanType: "car", outstanding: 500000, ratePercent: 9.25, monthsLeft: 36 };
    for (const loan of [full, bare]) {
      const read = parseMemberRows({ ...none, accounts: [{ id: "l", ...accountRow(withoutId(loan)) }] }, who);
      expect(read.input.accounts).toEqual([loan]);
    }
  });

  it("a card with auto-pay on and a minimum due, and one with auto-pay off", () => {
    const base = { kind: "card", id: "c", name: "Card", last4: "1234", outstanding: 100, limit: 5000, statementDay: 1, dueDay: 20 } as const;
    for (const card of [{ ...base, autoPay: true, minimumDue: 50 }, { ...base, autoPay: false }] as MemberAccount[]) {
      const read = parseMemberRows({ ...none, accounts: [{ id: "c", ...accountRow(withoutId(card)) }] }, who);
      expect(read.input.accounts).toEqual([card]);
    }
  });

  it("a monthly figure", () => {
    const read = parseMemberRows({ ...none, monthly: [monthlyRow(aaravMonth)] }, who);
    expect(read.input.monthly).toEqual([aaravMonth]);
  });

  it("a goal, whose month becomes the first of that month and comes back as the month", () => {
    const goal = aaravInput().goals[0];
    const row = goalRow(goal);
    expect(row.target_date).toBe(`${goal.targetDate}-01`);
    const read = parseMemberRows({ ...none, goals: [{ id: goal.id, ...row }] }, who);
    expect(read.skipped).toEqual([]);
    expect(read.input.goals).toEqual([goal]);
  });

  it("tax inputs, for the right financial year", () => {
    const tax = aaravInput().tax!;
    const read = parseMemberRows({ ...none, tax: [{ financial_year: financialYear(AARAV_ASOF).label, inputs: taxInputsJson(tax) }] }, who);
    expect(read.input.tax).toEqual(tax);
  });
});

describe("what is left blank is left out", () => {
  it("drops figures that were not stated, and blank text, rather than saving zero or empty", () => {
    const row = accountRow({ kind: "investment", name: "  Groww  ", instrument: "mutual-funds", value: 5, institution: "   ", activeSips: undefined });
    expect(row.name).toBe("Groww");
    expect(row.details).toEqual({ instrument: "mutual-funds", value: 5 });
  });

  it("keeps a figure that really is zero", () => {
    expect(accountRow({ kind: "bank", name: "SBI", last4: "1234", balance: 0 }).details).toEqual({ last4: "1234", balance: 0 });
    expect(accountRow({ kind: "card", name: "C", last4: "1234", outstanding: 0, limit: 1, statementDay: 1, dueDay: 2, autoPay: false }).details).toMatchObject({ outstanding: 0, autoPay: false });
  });

  it("never puts an id or a kind change into the details", () => {
    const row = accountRow({ id: "x", kind: "bank", name: "B", last4: "1234", balance: 1 });
    expect(Object.keys(row.details)).toEqual(["last4", "balance"]);
    expect(row.kind).toBe("bank");
  });
});
