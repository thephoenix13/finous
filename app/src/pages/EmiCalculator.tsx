import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import { HeroCard, Slider } from "../components/ui";
import { emi } from "../lib/finance";
import { inr } from "../lib/format";

/** Starts on the persona's home loan, as the prototype does: ₹62L at 8.9% for 17.5 years is ₹58,345 a month. */
export const EMI_DEFAULTS = { principal: 6_200_000, ratePct: 8.9, years: 17.5 };

/** Any loan, any rate: three sliders and the maths live. Ranges are the prototype's. */
export default function EmiCalculator() {
  const { t } = useTranslation();
  const [principal, setPrincipal] = useState(EMI_DEFAULTS.principal);
  const [ratePct, setRatePct] = useState(EMI_DEFAULTS.ratePct);
  const [years, setYears] = useState(EMI_DEFAULTS.years);

  const { monthly, total } = useMemo(() => {
    const months = Math.round(years * 12);
    const monthly = emi(principal, ratePct, months);
    return { monthly, total: monthly * months };
  }, [principal, ratePct, years]);

  return (
    <>
      <PageHeader title={t("emi.title")} backTo="/plans" />
      <div className="px-4 pb-6 pt-3">
        {/* Polite, so someone dragging a slider hears the EMI change without being interrupted. */}
        <div aria-live="polite" aria-atomic="true">
          <HeroCard domain="emi" size="md" eyebrow={t("emi.monthly")} value={inr(monthly)}>
            {/* Three columns when the card is wide enough for the largest amounts (₹6,39,83,075), stacked rows when not. */}
            <div className="@container mt-5">
              <dl className="grid gap-2 @[18rem]:grid-cols-3">
                <Figure label={t("emi.principal")} value={inr(principal)} align="left" />
                <Figure label={t("emi.interest")} value={inr(total - principal)} align="center" />
                <Figure label={t("emi.total")} value={inr(total)} align="right" />
              </dl>
            </div>
          </HeroCard>
        </div>

        <div data-domain="emi" className="mt-8 space-y-6">
          <Slider label={t("emi.loanAmount")} value={principal} min={500_000} max={15_000_000} step={50_000} onChange={setPrincipal} format={inr} />
          <Slider label={t("emi.rate")} value={ratePct} min={6} max={14} step={0.1} onChange={setRatePct} format={(v) => `${v.toFixed(1)}%`} />
          <Slider label={t("emi.tenure")} value={years} min={1} max={30} step={0.5} onChange={setYears} format={(v) => t("emi.tenureValue", { count: v })} />
        </div>
      </div>
    </>
  );
}

// Full class names, so Tailwind can see them. Narrow: label left, value right. Wide: stacked in a column.
const ALIGN = { left: "@[18rem]:text-left", center: "@[18rem]:text-center", right: "@[18rem]:text-right" } as const;

function Figure({ label, value, align }: { label: string; value: string; align: keyof typeof ALIGN }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 @[18rem]:block ${ALIGN[align]}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{label}</dt>
      <dd className="text-[15px] font-medium tabular-nums @[18rem]:mt-1">{value}</dd>
    </div>
  );
}
