import { useTranslation } from "react-i18next";
import { useApiData, type Api, type LoanAccount, type RefinanceInsight, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { HeroCard, Row, RowGroup } from "../components/ui";
import { inr, percent } from "../lib/format";

type Inputs = {
  loan: LoanAccount;
  /** The backend's offer for this loan. Null when switching would not save anything. */
  offer: RefinanceInsight | null;
};

/** The home loan and the refinance offer for it. Null when there is no home loan. */
async function loadInputs(api: Api, options: RequestOptions): Promise<Inputs | null> {
  const [accounts, insights] = await Promise.all([api.listAccounts(options), api.listInsights(options)]);
  const loan = accounts.loans.find((l) => l.loanType === "home");
  if (!loan) return null;
  const offer = insights.find((i): i is RefinanceInsight => i.kind === "refinance" && i.loanId === loan.id) ?? null;
  return { loan, offer };
}

/** "Should I switch my home loan?" A read-out of what the backend found, with the costs spelled out. */
export default function RefinanceCheck() {
  const { t } = useTranslation();
  const result = useApiData(loadInputs);

  return (
    <>
      <PageHeader title={t("refinance.title")} backTo="/plans" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" &&
        (!result.data ? (
          <p className="px-5 pt-16 text-center text-ink-2">{t("common.noHomeLoan")}</p>
        ) : result.data.offer ? (
          <Offer loan={result.data.loan} offer={result.data.offer} />
        ) : (
          <p className="mx-auto max-w-[32ch] px-5 pt-16 text-center text-ink-2">{t("refinance.noSaving")}</p>
        ))}
    </>
  );
}

function Offer({ loan, offer }: { loan: LoanAccount; offer: RefinanceInsight }) {
  const { t } = useTranslation();
  const { processingFee, documentation } = offer.costs;

  return (
    <>
      <div className="px-4 pb-8 pt-3">
        <HeroCard domain="loan" size="md" eyebrow={t("refinance.monthlySaving")} value={inr(offer.monthlySaving)}>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            <Figure label={t("refinance.yourRate")} value={percent(offer.currentRatePercent)} align="left" />
            <Figure label={t("refinance.market")} value={percent(offer.marketRatePercent)} align="center" />
            <Figure label={t("refinance.breakEven")} value={t("refinance.breakEvenValue", { months: offer.breakEvenMonths })} align="right" />
          </dl>
        </HeroCard>
      </div>

      <section aria-labelledby="refinance-involves" className="pb-6">
        <h2 id="refinance-involves" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("refinance.involves")}
        </h2>
        <RowGroup>
          <Row
            title={t("refinance.processingFee")}
            subtitle={t("refinance.processingFeeNote", { percent: percent((processingFee / loan.outstanding) * 100, 1) })}
            right={inr(processingFee)}
          />
          <Row title={t("refinance.documentation")} subtitle={t("refinance.documentationNote")} right={inr(documentation)} />
          <Row title={t("refinance.totalUpfront")} subtitle={t("refinance.recoveredIn", { count: offer.breakEvenMonths })} right={inr(offer.upfrontCost)} />
        </RowGroup>
      </section>
    </>
  );
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

function Figure({ label, value, align }: { label: string; value: string; align: keyof typeof ALIGN }) {
  return (
    <div className={ALIGN[align]}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{label}</dt>
      <dd className="mt-1 text-[15px] font-medium tabular-nums">{value}</dd>
    </div>
  );
}
