import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions, type TaxSummary } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Card, HeroCard, Progress, Row, RowGroup } from "../components/ui";
import { taxSaving } from "../lib/finance";
import { formatDayMonth, inr, percent } from "../lib/format";

const loadTax = (api: Api, options: RequestOptions): Promise<TaxSummary> => api.getTaxSummary(options);

/** "What's left to do" this financial year: Section 80C, 80D and home loan interest. For information only. */
export default function Tax() {
  const { t } = useTranslation();
  const result = useApiData(loadTax);
  // The year is in the title once it is known; until then the title is just "Tax".
  const title = result.status === "ready" ? t("tax.titleFy", { fy: result.data.financialYear.replace("-", "–") }) : t("tax.title");

  return (
    <>
      <PageHeader title={title} backTo="/plans" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && <Summary tax={result.data} />}
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="pb-6">
      <h2 id={id} className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {title}
      </h2>
      <RowGroup>{children}</RowGroup>
    </section>
  );
}

function Summary({ tax }: { tax: TaxSummary }) {
  const { t, i18n } = useTranslation();
  const { section80C: c, section80D: d, homeLoanInterest: h } = tax;

  // Only the limit is deductible, so putting in more than it leaves no room, not negative room.
  const room = Math.max(0, c.limit - c.used);
  const saving = Math.round(taxSaving(room, tax.slabPercent));
  const left =
    room === 0
      ? t("tax.leftNone")
      : saving > 0
        ? t("tax.leftSaving", { room: inr(room), saving: inr(saving), slab: percent(tax.slabPercent) })
        : t("tax.leftNoSaving", { room: inr(room) });

  return (
    <>
      <div className="px-4 pb-8 pt-3">
        <HeroCard
          domain="tax"
          size="md"
          eyebrow={t("tax.section80C", { used: inr(c.used), limit: inr(c.limit) })}
          value={inr(room)}
          caption={t("tax.leftToInvest", { date: formatDayMonth(tax.deadline, i18n.resolvedLanguage) })}
        >
          <Progress className="mt-5" value={(c.used / c.limit) * 100} label={t("tax.progress")} valueText={t("tax.progressText", { used: inr(c.used), limit: inr(c.limit) })} />
        </HeroCard>
      </div>

      <Section id="tax-80c" title={t("tax.breakdown")}>
        <p className="px-5 pb-2 text-[13px] text-ink-3">{t("tax.breakdownNote")}</p>
        {c.items.map((item) => (
          <Row
            key={item.id}
            title={t(`tax.kind.${item.kind}`)}
            subtitle={t(`tax.schedule.${item.schedule}`, { provider: item.provider, monthly: inr(item.monthlyAmount ?? 0) })}
            right={inr(item.amount)}
          />
        ))}
      </Section>

      <Section id="tax-80d" title={t("tax.health")}>
        <Row title={t("tax.selfFamily")} subtitle={t("tax.limitNote", { limit: inr(d.limit) })} right={inr(d.used)} />
      </Section>

      <Section id="tax-24b" title={t("tax.homeLoan")}>
        <Row
          title={t("tax.deductible")}
          subtitle={h.paid > h.cap ? t("tax.interestCapped", { paid: inr(h.paid), cap: inr(h.cap) }) : t("tax.interestPaid", { paid: inr(h.paid) })}
          right={<span className="text-positive">{inr(h.deductible)}</span>}
        />
      </Section>

      <div className="px-4 pb-6">
        <Card variant="outline">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("tax.leftTitle")}</h2>
          <p className="mt-2 text-ink">{left}</p>
        </Card>
      </div>
    </>
  );
}
