import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useApiData, type Api, type Goal, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Card, Progress } from "../components/ui";
import { formatMonthYear, inr, parseMonth, percent, roundSig } from "../lib/format";

const loadGoals = (api: Api, options: RequestOptions): Promise<Goal[]> => api.listGoals(options);

/**
 * The user's goals, each with how far along it is and about what it needs a month. There is no "new goal" here yet:
 * that is a write, and the Api does not have one.
 */
export default function Goals() {
  const { t } = useTranslation();
  const result = useApiData(loadGoals);

  return (
    <>
      <PageHeader title={t("goals.title")} backTo="/plans" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && <GoalList goals={result.data} />}
    </>
  );
}

function GoalList({ goals }: { goals: Goal[] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  if (goals.length === 0) return <p className="px-5 pt-16 text-center text-ink-2">{t("goals.none")}</p>;

  return (
    <div data-domain="goal">
      <p className="px-5 text-ink-2">{t("goals.summary", { count: goals.length })}</p>
      <ul className="mt-6 space-y-4 px-4 pb-8">
        {goals.map((g) => (
          <li key={g.id}>
            <Link to={`/plans/goals/${g.id}`} className="block rounded-[26px]">
              <Card>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {t("goals.eyebrow", { name: g.name, date: formatMonthYear(parseMonth(g.targetDate), lang) })}
                </p>
                <p className="mt-3 font-display text-[20px] leading-snug tracking-tight">
                  {t("goals.ofTarget", { funded: inr(g.fundedAmount), target: inr(g.targetAmount) })}
                </p>
                <Progress className="mt-4" value={g.percentFunded} label={t("goals.progress", { name: g.name })} valueText={percent(g.percentFunded, 0)} />
                <div className="mt-2 flex items-baseline justify-between gap-3 text-[12px] text-ink-3">
                  <span>{t("goals.percentFunded", { percent: g.percentFunded })}</span>
                  {/* An estimate at the assumed return, so rounded to three figures and said to be about that. Nothing is needed once it is reached. */}
                  {g.monthlyNeeded > 0 && <span className="text-right">{t("goals.needed", { amount: inr(roundSig(g.monthlyNeeded)) })}</span>}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
