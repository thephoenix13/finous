import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { cardCycle } from "../lib/cardCycle";
import { formatDayMonth, formatWhen, inr } from "../lib/format";
import { insightCopy } from "../lib/insightCopy";

const load = async (api: Api, options: RequestOptions) => {
  const [insights, overview, income] = await Promise.all([api.listInsights(options), api.listAccounts(options), api.listTransactions({}, options)]);
  return { insights, overview, latestIncome: income.items.find((tx) => tx.amount > 0) };
};

type Item = { id: string; to: string; eyebrow: string; title: string; body: string };

/**
 * What needs the user's attention, worked out from their own data: the Api has no notification feed, so each item is a fact
 * it already returns (an insight, a card statement, the latest income). Nothing here is a feed; it is only what is open.
 */
export default function Notifications() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const result = useApiData(load);

  return (
    <>
      <PageHeader title={t("notifications.title")} backTo="/" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" &&
        (() => {
          const { insights, overview, latestIncome } = result.data;
          const when = (date: string) => formatWhen(date, overview.asOf, { today: t("accounts.today"), yesterday: t("accounts.yesterday") }, lang);
          const items: Item[] = [
            ...insights.map((insight): Item => {
              const loan = insight.kind === "refinance" ? overview.loans.find((l) => l.id === insight.loanId) : undefined;
              const copy = insightCopy(insight, t, lang, loan?.name);
              return { id: insight.id, to: `/plans/recommendations/${insight.id}`, eyebrow: t("notifications.worthLook"), ...copy };
            }),
            ...overview.cards
              .filter((card) => card.outstanding > 0)
              .map((card): Item => {
                const cycle = cardCycle(overview.asOf, card.statementDay, card.dueDay);
                return {
                  id: `statement-${card.id}`,
                  to: `/accounts/${card.id}`,
                  eyebrow: when(cycle.statement),
                  title: t("notifications.statementReady", { card: card.name }),
                  body: t(card.autoPay ? "notifications.dueAutoPayOn" : "notifications.dueAutoPayOff", {
                    amount: inr(card.outstanding),
                    date: formatDayMonth(cycle.due, lang),
                  }),
                };
              }),
            ...(latestIncome
              ? [
                  {
                    id: `income-${latestIncome.id}`,
                    to: `/transactions/${latestIncome.id}`,
                    eyebrow: when(latestIncome.date),
                    title: latestIncome.description,
                    body: t("notifications.credited", {
                      amount: inr(latestIncome.amount),
                      account: (() => {
                        const bank = overview.bank.find((b) => b.id === latestIncome.accountId);
                        return bank ? `${bank.name} •${bank.last4}` : latestIncome.accountId;
                      })(),
                    }),
                  },
                ]
              : []),
          ];
          return items.length === 0 ? (
            <p className="px-5 pt-10 text-center text-ink-2">{t("notifications.none")}</p>
          ) : (
            <ul className="divide-y divide-line pb-8 pt-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} className="block px-5 py-4 active:bg-tint">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{item.eyebrow}</span>
                    <span className="mt-2 block text-[15px] font-medium text-ink">{item.title}</span>
                    <span className="mt-1 block text-[13px] text-ink-2">{item.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          );
        })()}
    </>
  );
}
