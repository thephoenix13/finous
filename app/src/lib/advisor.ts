import type { TFunction } from "i18next";
import type { AccountsOverview, CashFlow } from "../api";
import { formatMonthYear, inr, parseMonth, percent } from "./format";

/** What the advisor can speak to. Each answer is worked out from the user's own figures, not from a model. */
export type Topic = "biggest" | "food" | "prepay" | "afford";

export type AdvisorData = { cashFlow: CashFlow; accounts: AccountsOverview };

export type Reply = {
  text: string;
  /** The accounts and figures the answer used, each worded for display. */
  sources: string[];
  link?: { to: string; label: string };
};

// English words are matched whole ("car" must not match "card"). Hindi has no word boundary the engine knows, so it is matched as text.
const ENGLISH: [Topic, RegExp][] = [
  ["prepay", /\bpre-?pay(ing|ment)?\b/i],
  ["afford", /\b(afford|car)\b/i],
  ["food", /\b(food|dining|swiggy|zomato|eat|eating)\b/i],
  ["biggest", /\b(biggest|largest|most)\b/i],
];
const HINDI: [Topic, string[]][] = [
  ["prepay", ["प्रीपे", "प्रीपेमेंट"]],
  ["afford", ["कार", "खरीद"]],
  ["food", ["खाने", "खाना", "खान-पान"]],
  ["biggest", ["सबसे बड़ा", "सबसे ज़्यादा"]],
];

/** Which topic a typed question is about, or nothing when it is about none of them. */
export function topicFor(text: string): Topic | undefined {
  for (const [topic, pattern] of ENGLISH) if (pattern.test(text)) return topic;
  for (const [topic, words] of HINDI) if (words.some((w) => text.includes(w))) return topic;
  return undefined;
}

const amountOf = (flow: CashFlow, category: string) => flow.categories.find((c) => c.category === category)?.amount ?? 0;

export function reply(topic: Topic | undefined, { cashFlow, accounts }: AdvisorData, t: TFunction, lang: string | undefined): Reply {
  const month = formatMonthYear(parseMonth(cashFlow.month), lang);
  const flowSource = t("advisor.src.cashFlow", { month });

  switch (topic) {
    case "biggest": {
      const top = cashFlow.categories.reduce((a, b) => (b.amount > a.amount ? b : a), cashFlow.categories[0]);
      if (!top) return { text: t("advisor.reply.fallback"), sources: [] };
      return {
        text: t("advisor.reply.biggest", { category: t(`cashFlow.categories.${top.category}`), amount: inr(top.amount), outflow: inr(cashFlow.outflow) }),
        sources: [flowSource],
      };
    }
    case "food": {
      const dining = cashFlow.insight?.kind === "dining-above-average" ? cashFlow.insight : undefined;
      return {
        text:
          t("advisor.reply.food", { amount: inr(amountOf(cashFlow, "food")) }) +
          (dining ? t("advisor.reply.foodAbove", { percent: dining.percentAboveAverage, months: dining.baselineMonths }) : ""),
        sources: [flowSource],
      };
    }
    case "prepay": {
      const loan = accounts.loans[0];
      if (!loan) return { text: t("advisor.reply.prepayNoLoan"), sources: [] };
      const savings = accounts.bank.reduce((sum, b) => sum + b.balance, 0);
      const essentials = amountOf(cashFlow, "emi") + amountOf(cashFlow, "rent") + amountOf(cashFlow, "food");
      const months = essentials > 0 ? Number((savings / essentials).toFixed(1)) : 0;
      return {
        text:
          t("advisor.reply.prepay", { loan: loan.name, outstanding: inr(loan.outstanding), rate: percent(loan.ratePercent), savings: inr(savings) }) +
          (essentials > 0 ? t("advisor.reply.prepayBuffer", { months }) : ""),
        sources: [loan.name, ...accounts.bank.map((b) => `${b.name} •${b.last4}`), ...(essentials > 0 ? [t("advisor.src.essentials", { amount: inr(essentials) })] : [])],
        link: { to: "/plans/prepay", label: t("advisor.openPrepay") },
      };
    }
    case "afford":
      return {
        text: t("advisor.reply.afford", { saved: inr(cashFlow.saved) }),
        sources: [flowSource],
        link: { to: "/plans/afford", label: t("advisor.openAfford") },
      };
    default:
      return { text: t("advisor.reply.fallback"), sources: [] };
  }
}

/** The user's figures, as the server sends them to the model: names, amounts and rates only, nothing about the app. */
export function buildContext({ cashFlow, accounts }: AdvisorData, lang: string | undefined): Record<string, unknown> {
  return {
    month: formatMonthYear(parseMonth(cashFlow.month), lang),
    income: cashFlow.income,
    outflow: cashFlow.outflow,
    saved: cashFlow.saved,
    savedChangeVsLastMonth: cashFlow.savedChangeVsLastMonth,
    spendByCategory: cashFlow.categories.map((c) => ({ category: c.category, amount: c.amount })),
    diningAboveAverage: cashFlow.insight ? { percent: cashFlow.insight.percentAboveAverage, months: cashFlow.insight.baselineMonths } : undefined,
    bankAccounts: accounts.bank.map((b) => ({ name: `${b.name} •${b.last4}`, balance: b.balance })),
    loans: accounts.loans.map((l) => ({ name: l.name, outstanding: l.outstanding, ratePercent: l.ratePercent, monthsLeft: l.monthsLeft, emi: l.emi })),
    cards: accounts.cards.map((c) => ({ name: c.name, outstanding: c.outstanding, limit: c.limit })),
    investments: accounts.investments.map((i) => ({ name: i.name, kind: i.instrument, value: i.value })),
  };
}
