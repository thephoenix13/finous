import { useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ApiError, isApiError, useApiData, type Api, type Insight, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { ButtonLink, Row, RowGroup } from "../components/ui";
import { formatMonthYear, inr, parseMonth, percent } from "../lib/format";
import { insightCopy } from "../lib/insightCopy";

type Detail = { insight: Insight; loanName?: string };

/** One recommendation: why it is suggested, what it costs or takes, and the tool that works it out with the user's own figures. */
export default function RecommendationDetail() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const load = useCallback(
    async (api: Api, options: RequestOptions): Promise<Detail> => {
      const [insights, overview] = await Promise.all([api.listInsights(options), api.listAccounts(options)]);
      const insight = insights.find((i) => i.id === id);
      if (!insight) throw new ApiError("not_found");
      return { insight, loanName: insight.kind === "refinance" ? overview.loans.find((l) => l.id === insight.loanId)?.name : undefined };
    },
    [id],
  );
  const result = useApiData(load);

  return (
    <>
      <PageHeader title={t("recommendations.detail.nav")} backTo="/plans/recommendations" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" &&
        (isApiError(result.error) && result.error.code === "not_found" ? (
          <p className="px-5 pt-16 text-center text-ink-2">{t("recommendations.notFound")}</p>
        ) : (
          <LoadError onRetry={result.retry} />
        ))}
      {result.status === "ready" && <Body detail={result.data} />}
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="pt-8">
      <h2 id={id} className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {title}
      </h2>
      <RowGroup>{children}</RowGroup>
    </section>
  );
}

function Body({ detail }: { detail: Detail }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { insight } = detail;
  const copy = insightCopy(insight, t, lang, detail.loanName);
  // The key is built from the insight's kind, so the typed key list cannot check it; the catalog tests do.
  const d = (key: string, options?: Record<string, string | number>) => String(t(`recommendations.detail.${insight.kind}.${key}` as never, options as never));

  let why: ReactNode;
  let costs: ReactNode;
  let costsTitle: string;
  let tool: { to: string; label: string } | undefined;

  switch (insight.kind) {
    case "refinance":
      why = (
        <>
          <Row title={d("yourRate")} right={percent(insight.currentRatePercent)} />
          <Row title={d("marketRate")} right={percent(insight.marketRatePercent)} />
          <Row title={d("monthlySaving")} right={<span className="text-positive">{inr(insight.monthlySaving)}</span>} />
        </>
      );
      costsTitle = d("costsHead");
      costs = (
        <>
          <Row title={d("processing")} right={inr(insight.costs.processingFee)} />
          <Row title={d("documentation")} right={inr(insight.costs.documentation)} />
          <Row title={d("total")} subtitle={d("totalSub", { months: insight.breakEvenMonths })} right={inr(insight.upfrontCost)} />
        </>
      );
      tool = { to: "/plans/refinance", label: d("cta") };
      break;
    case "deposit":
      why = (
        <>
          <Row title={d("savingsRate")} right={percent(insight.savingsRatePercent)} />
          <Row title={d("depositRate")} right={percent(insight.depositRatePercent)} />
          <Row title={d("extra")} subtitle={d("extraSub", { amount: inr(insight.amount) })} right={<span className="text-positive">{inr(insight.extraPerYear)}</span>} />
        </>
      );
      costsTitle = d("costsHead");
      costs = (
        <>
          <Row title={d("lockIn")} subtitle={d("lockInSub")} right={d("lockInValue", { months: insight.termMonths })} />
          <Row title={d("buffer")} subtitle={d("bufferSub")} right={inr(insight.bufferLeft)} />
        </>
      );
      break;
    case "emergency-fund":
      why = (
        <>
          <Row title={d("essentials")} right={d("perMonth", { amount: inr(insight.essentialsPerMonth) })} />
          <Row title={d("held")} right={inr(insight.heldAmount)} />
          <Row
            title={d("gap", { months: insight.targetMonths })}
            subtitle={d("gapSub", { target: inr(insight.targetAmount) })}
            right={<span className="text-positive">{inr(Math.max(0, insight.targetAmount - insight.heldAmount))}</span>}
          />
        </>
      );
      costsTitle = d("costsHead");
      costs = (
        <>
          <Row title={d("monthly")} right={inr(insight.monthlyAmount)} />
          <Row title={d("byWhen")} right={formatMonthYear(parseMonth(insight.targetDate), lang)} />
        </>
      );
      tool = { to: "/plans/goal-calc", label: d("cta") };
      break;
  }

  return (
    <div className="pb-8">
      <div className="px-5 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("recommendations.detail.eyebrow")}</p>
        <h2 className="mt-3 font-display text-[22px] leading-tight text-ink">{copy.title}</h2>
        <p className="mt-4 text-[15px] text-ink-2">{copy.body}</p>
      </div>
      <Section id="rec-why" title={t("recommendations.detail.why")}>
        {why}
      </Section>
      <Section id="rec-costs" title={costsTitle}>
        {costs}
      </Section>
      <p className="px-5 pt-6 text-[12px] leading-relaxed text-ink-3">{t("recommendations.disclaimer")}</p>
      <div className="space-y-3 px-5 pt-6">
        {tool && <ButtonLink to={tool.to}>{tool.label}</ButtonLink>}
        <ButtonLink to="/plans/recommendations" variant="ghost">
          {t("recommendations.detail.notNow")}
        </ButtonLink>
      </div>
    </div>
  );
}
