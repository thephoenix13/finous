import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Card, HeroCard, Row, RowGroup } from "../components/ui";
import { carAffordability } from "../lib/finance";
import { inr, percent, roundTo, toLakhs } from "../lib/format";

/** The prototype's scenario: a ₹40L car, 20% down, a 9.5% loan over 60 months, ₹4,800 a month of insurance. */
const CAR = { price: 4_000_000, downPaymentPct: 20, annualRatePct: 9.5, months: 60, insurancePerMonth: 4_800 };

/** What is left each month after EMIs, SIPs and living expenses. */
async function loadHeadroom(api: Api, options: RequestOptions): Promise<number> {
  return (await api.getCashFlow(options)).saved;
}

/** "Can I buy a ₹40L car?" Compares what the car adds to every month with the headroom the user has. */
export default function AffordabilityCheck() {
  const { t } = useTranslation();
  const result = useApiData(loadHeadroom);

  return (
    <>
      <PageHeader title={t("afford.title")} backTo="/plans" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && <Assessment headroom={result.data} />}
    </>
  );
}

/** A planning estimate, rounded to the nearest ₹100, as the prototype shows them: ₹67,200, not ₹67,206. */
const estimate = (amount: number) => inr(roundTo(amount, 100));

function Assessment({ headroom }: { headroom: number }) {
  const { t } = useTranslation();
  const car = useMemo(() => carAffordability({ ...CAR, monthlyHeadroom: headroom }), [headroom]);
  const lakhs = toLakhs(CAR.price);

  // The verdict uses the exact figures; only what is shown is rounded. A gap is never shown as ₹0.
  const gap = inr(Math.max(100, roundTo(car.shortfall, 100)));
  const sentence = car.affordable
    ? t("afford.spare", { spare: estimate(car.spare) })
    : car.extraDownPayment === null
      ? t("afford.shortfallOnly", { gap })
      : t("afford.shortfall", { gap, lakhs: toLakhs(Math.max(10_000, car.extraDownPayment)) });

  return (
    <>
      <div className="px-4 pb-8 pt-3">
        <HeroCard
          domain="emi"
          size="md"
          eyebrow={t("afford.eyebrow", { lakhs })}
          value={car.affordable ? t("afford.yes") : t("afford.notYet")}
          caption={<span className="block max-w-[32ch]">{sentence}</span>}
        />
      </div>

      <section aria-labelledby="afford-assumptions" className="pb-6">
        <h2 id="afford-assumptions" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("afford.assumptions")}
        </h2>
        <RowGroup>
          <Row
            title={t("afford.downPayment")}
            subtitle={t("afford.downPaymentNote", { percent: percent(CAR.downPaymentPct), lakhs })}
            right={inr(car.downPayment)}
          />
          <Row title={t("afford.loan", { rate: percent(CAR.annualRatePct) })} subtitle={t("afford.loanNote", { count: CAR.months })} right={estimate(car.emi)} />
          <Row title={t("afford.outflow")} subtitle={t("afford.outflowNote")} right={estimate(car.monthlyOutflow)} />
        </RowGroup>
      </section>

      <div className="px-4 pb-6">
        <Card variant="outline">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("afford.headroomTitle")}</h2>
          <p className="mt-2 text-ink">{t("afford.headroomBody", { free: inr(headroom), lakhs, needs: estimate(car.monthlyOutflow) })}</p>
        </Card>
      </div>
    </>
  );
}
