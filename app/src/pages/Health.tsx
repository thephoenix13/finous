import { useTranslation } from "react-i18next";
import { useApiData, type HealthScore } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { ButtonLink, HeroCard } from "../components/ui";
import { formatList, percent } from "../lib/format";
import { loadHealth } from "./healthData";

/** Where the user stands: one number out of 900, how it moved, and the one or two things holding it back. */
export default function Health() {
  const { t } = useTranslation();
  const result = useApiData(loadHealth);

  return (
    <>
      <PageHeader title={t("health.title")} backTo="/plans" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && <Score health={result.data} />}
    </>
  );
}

function Score({ health }: { health: HealthScore }) {
  const { t, i18n } = useTranslation();

  const change = health.changeThisMonth;
  const changeText = change > 0 ? t("health.changeUp", { count: change }) : change < 0 ? t("health.changeDown", { count: -change }) : t("health.noChange");

  const drags = health.drags.map((id) => t(`health.phrase.${id}`));
  const dragText =
    drags.length === 0
      ? t("health.noDrags")
      : t(drags.length === 1 ? "health.dragOne" : "health.dragMany", { list: formatList(drags, i18n.resolvedLanguage) });

  return (
    <>
      <div className="px-4 pb-6 pt-3">
        <HeroCard size="xl" align="center" eyebrow={t("health.eyebrow")} value={health.score}>
          <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.06em] opacity-80">{t("health.outOf", { max: health.outOf })}</p>
          <p className="mt-5 text-[13px] font-medium">{changeText}</p>
        </HeroCard>
      </div>

      <p className="px-5 text-ink-2">
        {t("health.standing", { percent: percent(health.topPercentForIncomeBand) })} {dragText}
      </p>

      <div className="px-4 pb-8 pt-6">
        <ButtonLink to="/plans/health/breakdown">{t("health.seeComponents")}</ButtonLink>
      </div>
    </>
  );
}
