import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Card, HeroCard, Row, RowGroup } from "../components/ui";
import { formatMonthYear, inr, parseMonth } from "../lib/format";

const loadCashFlow = (api: Api, options: RequestOptions) => api.getCashFlow(options);

/** The current month: what was saved, what came in and went out, where it went, and one thing worth noticing. */
export default function CashFlow() {
  const { t, i18n } = useTranslation();
  const result = useApiData(loadCashFlow);

  return (
    <>
      <PageHeader title={t("cashFlow.title")} backTo="/" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && (() => {
        const flow = result.data;
        const delta = flow.savedChangeVsLastMonth;
        return (
          <div className="pb-8">
            <HeroCard
              className="mx-4 mt-4"
              eyebrow={t("cashFlow.saved", { month: formatMonthYear(parseMonth(flow.month), i18n.resolvedLanguage) })}
              value={inr(flow.saved)}
              size="lg"
              caption={delta === 0 ? t("home.savedSame") : t(delta > 0 ? "home.savedMore" : "home.savedLess", { amount: inr(Math.abs(delta)) })}
            />

            <section aria-labelledby="cf-totals" className="px-5 pt-8">
              <h2 id="cf-totals" className="sr-only">
                {t("cashFlow.totals")}
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[13px] text-ink-3">{t("home.in")}</dt>
                  <dd className="mt-1 font-display text-[26px] leading-none tracking-tight tabular-nums text-positive">{inr(flow.income)}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-ink-3">{t("home.out")}</dt>
                  <dd className="mt-1 font-display text-[26px] leading-none tracking-tight tabular-nums">{inr(flow.outflow)}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="cf-where" className="pt-8">
              <h2 id="cf-where" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                {t("cashFlow.where")}
              </h2>
              <RowGroup>
                {flow.categories.map((c) => (
                  <Row key={c.category} title={t(`cashFlow.categories.${c.category}`)} right={inr(c.amount)} />
                ))}
              </RowGroup>
            </section>

            {flow.insight && (
              <section aria-labelledby="cf-insight" className="px-4 pt-8">
                <Card variant="outline">
                  <h2 id="cf-insight" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {t("cashFlow.insight")}
                  </h2>
                  <p className="mt-2 text-[15px] text-ink">
                    {t("cashFlow.diningAbove", { percent: flow.insight.percentAboveAverage, months: flow.insight.baselineMonths })}
                  </p>
                </Card>
              </section>
            )}
          </div>
        );
      })()}
    </>
  );
}
