import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useApiData, type Api, type Insight, type LoanAccount, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { inr } from "../lib/format";
import { insightCopy } from "../lib/insightCopy";

type Loaded = { insights: Insight[]; loans: LoanAccount[] };

const loadRecommendations = async (api: Api, options: RequestOptions): Promise<Loaded> => {
  const [insights, overview] = await Promise.all([api.listInsights(options), api.listAccounts(options)]);
  return { insights, loans: overview.loans };
};

/** The one figure each kind of recommendation is judged by. */
function headline(insight: Insight, t: TFunction): { label: string; value: string } {
  switch (insight.kind) {
    case "refinance":
      return { label: t("recommendations.saveYear"), value: inr(insight.annualSaving) };
    case "deposit":
      return { label: t("recommendations.gainYear"), value: inr(insight.extraPerYear) };
    case "emergency-fund":
      return { label: t("recommendations.target"), value: inr(insight.targetAmount) };
  }
}

/** What the Api's insights suggest, ranked in the order it sends them, each with its reason and its headline figure. */
export default function Recommendations() {
  const { t, i18n } = useTranslation();
  const result = useApiData(loadRecommendations);

  return (
    <>
      <PageHeader title={t("recommendations.title")} backTo="/plans" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && (
        <div className="px-4 pb-8 pt-3">
          {result.data.insights.length === 0 ? (
            <p className="px-1 pt-4 text-ink-2">{t("recommendations.none")}</p>
          ) : (
            <ol className="space-y-4">
              {result.data.insights.map((insight, i) => {
                const loan = insight.kind === "refinance" ? result.data.loans.find((l) => l.id === insight.loanId) : undefined;
                const copy = insightCopy(insight, t, i18n.resolvedLanguage, loan?.name);
                const figure = headline(insight, t);
                return (
                  <li key={insight.id}>
                    <Link to={`/plans/recommendations/${insight.id}`} className="block rounded-[26px] bg-surface p-5 shadow-card active:bg-tint">
                      <span aria-hidden="true" className="font-mono text-[13px] text-ink-3">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-2 block text-[17px] font-medium text-ink">{copy.title}</span>
                      <span className="mt-2 block text-[14px] text-ink-2">{copy.body}</span>
                      <span className="mt-4 block border-t border-line pt-4">
                        <span className="block text-[13px] text-ink-3">{figure.label}</span>
                        <span className="mt-1 block font-display text-[22px] leading-none tabular-nums text-ink">{figure.value}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="px-1 pt-6 text-[12px] leading-relaxed text-ink-3">{t("recommendations.disclaimer")}</p>
        </div>
      )}
    </>
  );
}
