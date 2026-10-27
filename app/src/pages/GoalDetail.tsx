import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { isApiError, useApiData, type Api, type Goal, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Card, HeroCard, Progress, Row, RowGroup } from "../components/ui";
import { addMonths, futureValue, monthlyContributionForGoal } from "../lib/finance";
import { formatMonthYear, inr, parseMonth, percent, roundSig } from "../lib/format";

/** The "what if" on the card: how much a month the goal needs if its date moves this far out. The prototype moves it two years. */
const LATER_BY_MONTHS = 24;

/** One goal: how much is in it, where it came from, and whether today's saving gets there in time. */
export default function GoalDetail() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  // useApiData needs a stable load function; this one changes only when the goal in the address does.
  const load = useCallback((api: Api, options: RequestOptions) => api.getGoal(id, options), [id]);
  const result = useApiData(load);

  const title = result.status === "ready" ? result.data.name : t("goals.detailTitle");

  return (
    <>
      <PageHeader title={title} backTo="/plans/goals" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" &&
        (isApiError(result.error) && result.error.code === "not_found" ? (
          <p className="px-5 pt-16 text-center text-ink-2">{t("goals.notFound")}</p>
        ) : (
          <LoadError onRetry={result.retry} />
        ))}
      {result.status === "ready" && <Detail goal={result.data} />}
    </>
  );
}

type Outlook =
  | { kind: "none" }
  | { kind: "reached" }
  | { kind: "unknown"; needed: number }
  | { kind: "ahead"; current: number; projected: number }
  | { kind: "behind"; current: number; projected: number; needed: number; neededLater: number };

/** Whether today's saving reaches the target in time. Without a known monthly saving all there is to say is what it would take. */
function outlookFor(goal: Goal): Outlook {
  const { targetAmount: target, fundedAmount: saved, assumedReturnPercent: annualReturnPct, monthsRemaining: months } = goal;
  if (saved >= target) return { kind: "reached" };
  if (months < 1) return { kind: "none" }; // the date is here or gone; the maths needs a month to work with
  const current = goal.currentMonthlyContribution;
  if (current === undefined) return { kind: "unknown", needed: goal.monthlyNeeded };
  const projected = futureValue(saved, current, annualReturnPct, months);
  if (projected >= target) return { kind: "ahead", current, projected };
  return {
    kind: "behind",
    current,
    projected,
    needed: goal.monthlyNeeded,
    neededLater: monthlyContributionForGoal({ target, saved, annualReturnPct, months: months + LATER_BY_MONTHS }),
  };
}

function Detail({ goal }: { goal: Goal }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const targetMonth = parseMonth(goal.targetDate);
  const date = formatMonthYear(targetMonth, lang);
  const outlook = useMemo(() => outlookFor(goal), [goal]);

  const assumes = goal.assumedReturnPercent === 0 ? t("goals.assumesNone") : t("goals.assumesReturn", { rate: percent(goal.assumedReturnPercent) });
  const target = inr(goal.targetAmount);
  // Estimates are said to be about that much, and rounded to three figures.
  const about = (amount: number) => inr(roundSig(amount));

  const outlookText =
    outlook.kind === "reached"
      ? t("goals.reached", { target })
      : outlook.kind === "none"
        ? null
        : outlook.kind === "unknown"
          ? t("goals.unknown", { target, date, needed: about(outlook.needed), assumes })
          : outlook.kind === "ahead"
            ? t("goals.ahead", { current: inr(outlook.current), projected: about(outlook.projected), date, assumes })
            : t("goals.behind", {
                current: inr(outlook.current),
                projected: about(outlook.projected),
                date,
                target,
                needed: about(outlook.needed),
                laterDate: formatMonthYear(addMonths(targetMonth, LATER_BY_MONTHS), lang),
                neededLater: about(outlook.neededLater),
                assumes,
              });

  return (
    <>
      <div className="px-4 pb-8 pt-3">
        <HeroCard domain="goal" size="md" eyebrow={t("goals.funded")} value={inr(goal.fundedAmount)} caption={t("goals.ofTargetBy", { target, date })}>
          <Progress className="mt-5" value={goal.percentFunded} label={t("goals.progress", { name: goal.name })} valueText={percent(goal.percentFunded, 0)} />
          <div className="mt-2 flex items-baseline justify-between gap-3 text-[12px] font-medium">
            <span>{t("goals.percentFunded", { percent: goal.percentFunded })}</span>
            <span className="text-right">{t("goals.monthsRemaining", { count: goal.monthsRemaining })}</span>
          </div>
        </HeroCard>
      </div>

      {goal.contributions && goal.contributions.length > 0 && (
        <section aria-labelledby="goal-contributions" className="pb-6">
          <h2 id="goal-contributions" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t("goals.contributions")}
          </h2>
          <RowGroup>
            {goal.contributions.map((c, i) => {
              const since = formatMonthYear(parseMonth(c.since), lang);
              return (
                <Row
                  key={i}
                  title={t(`goals.contribution.${c.kind}`, { institution: c.institution, label: c.label ?? "" })}
                  subtitle={c.frequency === "monthly" ? t("goals.monthlySince", { amount: inr(c.amount), since }) : t("goals.oneTimeSince", { since })}
                  right={inr(c.currentValue)}
                />
              );
            })}
          </RowGroup>
        </section>
      )}

      {outlookText && (
        <div className="px-4 pb-6">
          <Card variant="outline">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("goals.onTrack")}</h2>
            <p className="mt-2 text-ink">{outlookText}</p>
          </Card>
        </div>
      )}
    </>
  );
}
