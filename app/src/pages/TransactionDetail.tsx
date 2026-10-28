import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ApiError, isApiError, useApiData, type Api, type RequestOptions, type Transaction } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { HeroCard, Row, RowGroup } from "../components/ui";
import { formatClock, formatDayMonth, formatWhen, inr, signedInr } from "../lib/format";

type Detail = { transaction: Transaction; accountLabel: string; asOf: string; similar: Transaction[] };

const SIMILAR = 3;

/** One transaction: the amount, who it was with, when, how it is categorised, and a few like it. */
export default function TransactionDetail() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const load = useCallback(
    async (api: Api, options: RequestOptions): Promise<Detail> => {
      const [page, overview] = await Promise.all([api.listTransactions({}, options), api.listAccounts(options)]);
      const transaction = page.items.find((item) => item.id === id);
      if (!transaction) throw new ApiError("not_found");
      const account = [...overview.bank, ...overview.cards].find((a) => a.id === transaction.accountId);
      return {
        transaction,
        accountLabel: account ? `${account.name} •${account.last4}` : transaction.accountId,
        asOf: overview.asOf,
        similar: page.items.filter((item) => item.id !== id && item.category === transaction.category).slice(0, SIMILAR),
      };
    },
    [id],
  );
  const result = useApiData(load);
  const backTo = result.status === "ready" ? `/accounts/${result.data.transaction.accountId}` : "/accounts";

  return (
    <>
      <PageHeader title={t("transaction.title")} backTo={backTo} />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" &&
        (isApiError(result.error) && result.error.code === "not_found" ? (
          <p className="px-5 pt-16 text-center text-ink-2">{t("transaction.notFound")}</p>
        ) : (
          <LoadError onRetry={result.retry} />
        ))}
      {result.status === "ready" && <Body detail={result.data} />}
    </>
  );
}

function Body({ detail }: { detail: Detail }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { transaction: tx } = detail;
  const money = tx.amount > 0;
  const year = tx.date.slice(0, 4);
  const when = `${formatDayMonth(tx.date, lang)} ${year}`;

  return (
    <div className="pb-8">
      <HeroCard
        className="mx-4 mt-4"
        eyebrow={t(money ? "transaction.received" : "transaction.amount")}
        value={inr(Math.abs(tx.amount))}
        size="lg"
        caption={t(money ? "transaction.credited" : "transaction.debited", { account: detail.accountLabel })}
      />

      <section aria-labelledby="txn-facts" className="pt-8">
        <h2 id="txn-facts" className="sr-only">
          {t("transaction.title")}
        </h2>
        <RowGroup>
          <Row title={t("transaction.counterparty")} subtitle={tx.description} />
          <Row title={t("transaction.date")} subtitle={tx.time ? `${when} · ${formatClock(tx.time, lang)}` : when} />
          <Row title={t("transaction.category")} subtitle={t(`transaction.categories.${tx.category}`)} />
        </RowGroup>
      </section>

      {detail.similar.length > 0 && (
        <section aria-labelledby="txn-similar" className="pt-8">
          <h2 id="txn-similar" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t("transaction.similar")}
          </h2>
          <RowGroup>
            {detail.similar.map((item) => (
              <Row
                key={item.id}
                to={`/transactions/${item.id}`}
                title={item.description}
                subtitle={formatWhen(item.date, detail.asOf, { today: t("accounts.today"), yesterday: t("accounts.yesterday") }, lang)}
                right={<span className={item.amount > 0 ? "text-positive" : undefined}>{signedInr(item.amount)}</span>}
              />
            ))}
          </RowGroup>
        </section>
      )}
    </div>
  );
}
