import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import { HeroCard, Row, RowGroup } from "../components/ui";
import { monthlyContributionForGoal } from "../lib/finance";
import { inr, percent, roundTo } from "../lib/format";

/** The prototype's worked example: a ₹30L house down payment in 5 years, ₹6L already saved, an assumed 6% return. */
const GOAL = { target: 3_000_000, saved: 600_000, annualReturnPct: 6, months: 60 };

/**
 * "How much do I put away each month to reach a target?" A read-out of one fixed example, as in the prototype:
 * no inputs, so nothing to load. There is no "Create this goal" yet; that arrives with the Goals screens and the Api write for it.
 */
export default function GoalCalculator() {
  const { t } = useTranslation();
  const monthly = monthlyContributionForGoal({ target: GOAL.target, saved: GOAL.saved, annualReturnPct: GOAL.annualReturnPct, months: GOAL.months });
  // To one decimal, so a term that is not a whole number of years reads "4.9 years", not "4.916666666666667".
  const duration = t("goalCalc.years", { count: Number((GOAL.months / 12).toFixed(1)) });

  return (
    <>
      <PageHeader title={t("goalCalc.title")} backTo="/plans" />

      <div className="px-4 pb-8 pt-3">
        {/* The answer is an estimate, so it is shown to the nearest ₹100, as the footnote says. */}
        <HeroCard
          domain="goal"
          size="md"
          eyebrow={t("goalCalc.monthly")}
          value={inr(roundTo(monthly, 100))}
          caption={t("goalCalc.caption", { target: inr(GOAL.target), duration })}
        />
      </div>

      <section aria-labelledby="goal-calc-name" className="pb-4">
        <h2 id="goal-calc-name" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("goalCalc.goalName")}
        </h2>
        <RowGroup>
          <Row title={t("goalCalc.target")} subtitle={t("goalCalc.targetNote", { duration })} right={inr(GOAL.target)} />
          <Row title={t("goalCalc.saved")} subtitle={t("goalCalc.savedNote")} right={inr(GOAL.saved)} />
          <Row title={t("goalCalc.returnRate")} subtitle={t("goalCalc.returnNote")} right={percent(GOAL.annualReturnPct)} />
          <Row title={t("goalCalc.time")} subtitle={duration} right={t("goalCalc.months", { count: GOAL.months })} />
        </RowGroup>
      </section>

      <p className="px-5 pb-8 text-[12px] leading-relaxed text-ink-3">{t("goalCalc.footnote")}</p>
    </>
  );
}
