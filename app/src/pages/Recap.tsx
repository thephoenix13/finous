import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { ButtonLink, HeroCard, Row, RowGroup } from "../components/ui";
import { formatMonthYear, inr, parseMonth } from "../lib/format";

const load = async (api: Api, options: RequestOptions) => {
  const [flow, overview] = await Promise.all([api.getCashFlow(options), api.listAccounts(options)]);
  return { flow, cards: overview.cards };
};

/** The month in one page: what was saved, what changed, and how the spending divided. Everything is from the user's own figures. */
export default function Recap() {
  const { t, i18n } = useTranslation();
  const result = useApiData(load);
  const lang = i18n.resolvedLanguage;

  return (
    <>
      <PageHeader
        title={result.status === "ready" ? t("recap.title", { month: formatMonthYear(parseMonth(result.data.flow.month), lang) }) : t("recap.fallbackTitle")}
        backTo="/"
      />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" &&
        (() => {
          const { flow, cards } = result.data;
          const delta = flow.savedChangeVsLastMonth;
          const dining = flow.insight;
          const changes = [
            ...cards
              .filter((c) => c.limit > 0)
              .map((c) => ({
                id: c.id,
                good: true,
                title: t("recap.utilisation", { percent: Math.round((c.outstanding / c.limit) * 100) }),
                body: t("recap.utilisationBody", { card: c.name, amount: inr(c.outstanding) }),
              })),
            ...(dining
              ? [
                  {
                    id: "dining",
                    good: false,
                    title: t("recap.diningAbove", { percent: dining.percentAboveAverage, months: dining.baselineMonths }),
                    body: t("recap.diningBody", { amount: inr(flow.categories.find((c) => c.category === "food")?.amount ?? 0) }),
                  },
                ]
              : []),
          ];
          const total = flow.categories.reduce((sum, c) => sum + c.amount, 0);
          return (
            <div className="pb-8">
              <HeroCard
                className="mx-4 mt-4"
                eyebrow={t("recap.saved")}
                value={inr(flow.saved)}
                size="lg"
                caption={delta === 0 ? t("home.savedSame") : t(delta > 0 ? "home.savedMore" : "home.savedLess", { amount: inr(Math.abs(delta)) })}
              />

              <dl className="grid grid-cols-2 gap-4 px-5 pt-8">
                <div>
                  <dt className="text-[13px] text-ink-3">{t("home.in")}</dt>
                  <dd className="mt-1 font-display text-[26px] leading-none tracking-tight tabular-nums">{inr(flow.income)}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-ink-3">{t("home.out")}</dt>
                  <dd className="mt-1 font-display text-[26px] leading-none tracking-tight tabular-nums">{inr(flow.outflow)}</dd>
                </div>
              </dl>

              {changes.length > 0 && (
                <section aria-labelledby="recap-changed" className="pt-8">
                  <h2 id="recap-changed" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {t("recap.changed")}
                  </h2>
                  <RowGroup>
                    {changes.map((c) => (
                      <Row
                        key={c.id}
                        icon={<span className={`size-2 rounded-full ${c.good ? "bg-positive" : "bg-warning"}`} />}
                        title={c.title}
                        subtitle={c.body}
                      />
                    ))}
                  </RowGroup>
                </section>
              )}

              <section aria-labelledby="recap-spend" className="px-5 pt-8">
                <h2 id="recap-spend" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {t("recap.spend")}
                </h2>
                <div aria-hidden="true" className="mt-4 flex h-3 gap-[3px] overflow-hidden rounded-full">
                  {flow.categories.map((c, i) => (
                    <span key={c.category} className="h-full bg-ink" style={{ flex: Math.max(c.amount, 1), opacity: 1 - i * 0.16 }} />
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {flow.categories.map((c) => (
                    <li key={c.category} className="flex justify-between text-[14px]">
                      <span>{t(`cashFlow.categories.${c.category}`)}</span>
                      <span className="tabular-nums text-ink-2">{total > 0 ? Math.round((c.amount / total) * 100) : 0}%</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="px-4 pt-8">
                <ButtonLink to="/plans/recommendations" variant="ghost">
                  {t("recap.next")}
                </ButtonLink>
              </div>
            </div>
          );
        })()}
    </>
  );
}
