import type { TFunction } from "i18next";
import type { Insight } from "../api";
import { formatMonthYear, inr, parseMonth, percent } from "./format";

/**
 * The words for an insight: the Api sends figures and a `kind`, never display copy.
 * `loanName` is the linked loan's own name ("HDFC Home Loan"), when it is known.
 */
export function insightCopy(insight: Insight, t: TFunction, lang: string | undefined, loanName?: string): { title: string; body: string } {
  switch (insight.kind) {
    case "refinance":
      return {
        title: t("insights.refinance.title", { loan: loanName ?? t("insights.homeLoanFallback") }),
        body: t("insights.refinance.body", {
          current: percent(insight.currentRatePercent),
          market: percent(insight.marketRatePercent),
          saving: inr(insight.monthlySaving),
        }),
      };
    case "deposit":
      return {
        title: t("insights.deposit.title", { amount: inr(insight.amount) }),
        body: t("insights.deposit.body", { extra: inr(insight.extraPerYear) }),
      };
    case "emergency-fund":
      return {
        title: t("insights.emergencyFund.title"),
        body: t("insights.emergencyFund.body", {
          held: inr(insight.heldAmount),
          target: inr(insight.targetAmount),
          monthly: inr(insight.monthlyAmount),
          date: formatMonthYear(parseMonth(insight.targetDate), lang),
        }),
      };
  }
}
