import type { MemberAccount, MemberGoal, MonthlyFigures, TaxInputs } from "./types";

/**
 * What a form saves, as the database stores it: the inverse of `rows.ts`. A value that was left blank is left out of the row
 * (never written as 0 or ""), so reading it back gives "not stated" rather than a made-up figure.
 */
export type AccountDraft = (MemberAccount extends infer A ? (A extends { id: string } ? Omit<A, "id"> : never) : never) & { id?: string };
export type GoalDraft = Omit<MemberGoal, "id"> & { id?: string };

const clean = (details: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined && v !== ""));

export function accountRow(account: AccountDraft): { kind: MemberAccount["kind"]; name: string; details: Record<string, unknown> } {
  const name = account.name.trim();
  switch (account.kind) {
    case "bank":
      return { kind: "bank", name, details: clean({ last4: account.last4, balance: account.balance }) };
    case "loan":
      return {
        kind: "loan",
        name,
        details: clean({
          loanType: account.loanType,
          outstanding: account.outstanding,
          ratePercent: account.ratePercent,
          monthsLeft: account.monthsLeft,
          emi: account.emi,
          startedOn: account.startedOn,
          originalAmount: account.originalAmount,
        }),
      };
    case "card":
      return {
        kind: "card",
        name,
        details: clean({
          last4: account.last4,
          outstanding: account.outstanding,
          limit: account.limit,
          statementDay: account.statementDay,
          dueDay: account.dueDay,
          autoPay: account.autoPay,
          minimumDue: account.minimumDue,
        }),
      };
    case "investment":
      return {
        kind: "investment",
        name,
        details: clean({
          instrument: account.instrument,
          value: account.value,
          institution: account.institution?.trim(),
          activeSips: account.activeSips,
          holdings: account.holdings,
          openedYear: account.openedYear,
        }),
      };
    case "other":
      return { kind: "other", name, details: clean({ assetKind: account.assetKind, value: account.value }) };
  }
}

/** A goal's date is a month; the database wants a day, so it is the first of that month. Reading takes the month back. */
export function goalRow(goal: GoalDraft) {
  return {
    name: goal.name.trim(),
    target_amount: goal.targetAmount,
    funded_amount: goal.fundedAmount,
    target_date: `${goal.targetDate}-01`,
    assumed_return_percent: goal.assumedReturnPercent,
  };
}

export const monthlyRow = (m: MonthlyFigures) => ({ month: m.month, income: m.income, rent: m.rent, food: m.food, other: m.other, sips: m.sips });

export const taxInputsJson = (t: TaxInputs): Record<string, number> => ({
  slabPercent: t.slabPercent,
  ppf: t.ppf,
  elss: t.elss,
  lifeInsurance: t.lifeInsurance,
  health80D: t.health80D,
  homeLoanInterestPaid: t.homeLoanInterestPaid,
});
