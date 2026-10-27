import { useTranslation } from "react-i18next";
import { useApiData, type HealthScore } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Progress } from "../components/ui";
import { formatList, percent } from "../lib/format";
import { loadHealth } from "./healthData";

/** The six numbers behind the score, each with a bar, and what is dragging it down. */
export default function HealthBreakdown() {
  const { t } = useTranslation();
  const result = useApiData(loadHealth);

  return (
    <>
      <PageHeader title={t("health.breakdown")} backTo="/plans/health" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && <Components health={result.data} />}
    </>
  );
}

/** Capitalises the first letter, for a list that opens a sentence ("Emergency fund and diversification."). Hindi has no case. */
const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Components({ health }: { health: HealthScore }) {
  const { t, i18n } = useTranslation();

  const dragging = health.drags.map((id) => t(`health.phrase.${id}`));

  return (
    <>
      <ul className="divide-y divide-line">
        {health.components.map((c) => {
          const label = t(`health.component.${c.id}`);
          const value = c.unit === "months" ? t("health.months", { value: c.value.toFixed(1) }) : percent(c.value, 0);
          return (
            <li key={c.id} className="grid grid-cols-[1fr_72px_52px] items-center gap-3.5 px-5 py-4">
              {/* The bar carries the name and the value for assistive technology, so the visible text is not read twice. */}
              <span aria-hidden="true" className="text-[14px] font-medium text-ink">
                {label}
              </span>
              <Progress value={c.score} label={label} valueText={value} />
              <span aria-hidden="true" className="text-right text-[13px] font-medium tabular-nums text-ink-2">
                {value}
              </span>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="health-dragging" className="px-5 pb-8 pt-8">
        <h2 id="health-dragging" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("health.whatsDragging")}
        </h2>
        <p className="mt-3 text-ink">
          {dragging.length === 0 ? t("health.noDrags") : `${sentenceCase(formatList(dragging, i18n.resolvedLanguage))}${i18n.resolvedLanguage === "hi" ? "।" : "."}`}
        </p>
      </section>
    </>
  );
}
