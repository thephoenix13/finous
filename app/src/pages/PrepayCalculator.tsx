import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiData, type Api, type LoanAccount, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Card, HeroCard, Slider } from "../components/ui";
import { addMonths, bufferMonths, emi, prepay } from "../lib/finance";
import { formatMonthYear, inr } from "../lib/format";

/** The prototype's slider: ₹10,000 to ₹2,00,000 in steps of ₹10,000, starting at ₹50,000. */
const PREPAY = { min: 10_000, max: 200_000, step: 10_000, start: 50_000 };
/** Months of essential expenses the prototype calls healthy. */
const BUFFER_BENCHMARK_MONTHS = 6;
/** What "essential" means on this screen, as in the prototype: EMI, rent, food. */
const ESSENTIAL = ["emi", "rent", "food"];

type Inputs = { loan: LoanAccount; savings: number; banks: number; essentials: number };

/** The home loan, the savings across banks, and the monthly essentials. Null when there is no home loan. */
async function loadInputs(api: Api, options: RequestOptions): Promise<Inputs | null> {
  const [accounts, cashFlow] = await Promise.all([api.listAccounts(options), api.getCashFlow(options)]);
  const loan = accounts.loans.find((l) => l.loanType === "home");
  if (!loan) return null;
  return {
    loan,
    savings: accounts.bank.reduce((sum, b) => sum + b.balance, 0),
    banks: accounts.bank.length,
    essentials: cashFlow.categories.filter((c) => ESSENTIAL.includes(c.category)).reduce((sum, c) => sum + c.amount, 0),
  };
}

/** "What if I pay extra today?" on the user's own home loan, with the same EMI. */
export default function PrepayCalculator() {
  const { t } = useTranslation();
  const result = useApiData(loadInputs);

  return (
    <>
      <PageHeader title={t("prepay.title")} backTo="/plans" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" &&
        (result.data ? (
          <PrepayForm inputs={result.data} />
        ) : (
          <p className="px-5 pt-16 text-center text-ink-2">{t("common.noHomeLoan")}</p>
        ))}
    </>
  );
}

function PrepayForm({ inputs: { loan, savings, banks, essentials } }: { inputs: Inputs }) {
  const { t, i18n } = useTranslation();
  const max = Math.max(PREPAY.min, Math.min(PREPAY.max, Math.floor(loan.outstanding / PREPAY.step) * PREPAY.step));
  const [amount, setAmount] = useState(Math.min(PREPAY.start, max));

  const { interestSaved, monthsSaved, newClose, bufferAfter } = useMemo(() => {
    // The EMI comes from the loan's schedule (balance, rate, months left), not from the whole-rupee instalment the bank
    // debits: that matches the prototype to the rupee, where the rounded EMI would move the headline by about ₹4.
    const scheduleEmi = emi(loan.outstanding, loan.ratePercent, loan.monthsLeft);
    const r = prepay({ balance: loan.outstanding, annualRatePct: loan.ratePercent, emi: scheduleEmi, amount });
    const monthsSaved = Math.round(r.monthsSaved);
    const [endYear, endMonth] = loan.endsOn.split("-").map(Number);
    return {
      interestSaved: r.interestSaved,
      monthsSaved,
      newClose: addMonths({ year: endYear, month: endMonth }, -monthsSaved),
      bufferAfter: bufferMonths(Math.max(0, savings - amount), essentials),
    };
  }, [loan, amount, savings, essentials]);

  return (
    <div className="px-4 pb-6 pt-3">
      {/* Polite, so someone dragging the slider hears the result change without being interrupted. */}
      <div aria-live="polite" aria-atomic="true">
        <HeroCard domain="loan" size="md" eyebrow={t("prepay.interestSaved")} value={inr(interestSaved)}>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{t("prepay.monthsSaved")}</dt>
              <dd className="mt-1 text-[15px] font-medium tabular-nums">{monthsSaved}</dd>
            </div>
            <div className="text-right">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{t("prepay.newClose")}</dt>
              <dd className="mt-1 text-[15px] font-medium tabular-nums">{formatMonthYear(newClose, i18n.resolvedLanguage)}</dd>
            </div>
          </dl>
        </HeroCard>
      </div>

      <Slider
        domain="loan"
        className="mt-8"
        label={t("prepay.amount")}
        value={amount}
        min={PREPAY.min}
        max={max}
        step={PREPAY.step}
        onChange={setAmount}
        format={inr}
      />

      <Card variant="outline" className="mt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("prepay.whereTitle")}</h2>
        <p className="mt-2 text-ink">
          {t("prepay.whereBody", { count: banks, savings: inr(savings), amount: inr(amount), months: bufferAfter.toFixed(1), benchmark: BUFFER_BENCHMARK_MONTHS })}
        </p>
      </Card>
    </div>
  );
}
