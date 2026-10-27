import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { isApiError, useApiData, type Account, type Api, type CardAccount, type RequestOptions, type Transaction } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { HeroCard, Progress, Row, RowGroup } from "../components/ui";
import { cardCycle } from "../lib/cardCycle";
import { formatClock, formatDayMonth, formatWhen, inr, ordinalDay, signedInr } from "../lib/format";

type Detail = { account: Account; asOf: string; recent: Transaction[] };

const RECENT = 5;

/**
 * One account: its balance and what happened lately. A bank account shows its month and recent transactions, a card shows its
 * limit, statement cycle and auto-pay. A loan or an investment, which nothing links here yet, shows just what it is worth.
 */
export default function AccountDetail() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  // useApiData needs a stable load function; this one changes only when the account in the address does.
  const load = useCallback(
    async (api: Api, options: RequestOptions): Promise<Detail> => {
      const [account, overview, page] = await Promise.all([
        api.getAccount(id, options),
        api.listAccounts(options),
        api.listTransactions({ accountId: id, limit: RECENT }, options),
      ]);
      return { account, asOf: overview.asOf, recent: page.items };
    },
    [id],
  );
  const result = useApiData(load);

  return (
    <>
      <PageHeader title={result.status === "ready" ? result.data.account.name : t("accounts.title")} backTo="/accounts" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" &&
        (isApiError(result.error) && result.error.code === "not_found" ? (
          <p className="px-5 pt-16 text-center text-ink-2">{t("accounts.notFound")}</p>
        ) : (
          <LoadError onRetry={result.retry} />
        ))}
      {result.status === "ready" && <Body detail={result.data} />}
    </>
  );
}

function Body({ detail }: { detail: Detail }) {
  const { t } = useTranslation();
  const { account } = detail;

  switch (account.kind) {
    case "bank":
      return (
        <div className="pb-8">
          <HeroCard
            className="mx-4 mt-4"
            eyebrow={t("accounts.sub.bank", { last4: account.last4 })}
            value={inr(account.balance)}
            size="md"
            caption={
              account.changeThisMonth === undefined
                ? undefined
                : t(account.changeThisMonth >= 0 ? "home.changeUp" : "home.changeDown", { amount: inr(Math.abs(account.changeThisMonth)) })
            }
          />
          <Recent detail={detail} />
        </div>
      );
    case "card":
      return (
        <div className="pb-8">
          <CardBody card={account} asOf={detail.asOf} />
          <Recent detail={detail} />
        </div>
      );
    case "loan":
      return <Plain eyebrow={t("accounts.eyebrow.loan")} amount={account.outstanding} />;
    case "investment":
      return <Plain eyebrow={t(`accounts.eyebrow.${account.instrument}`)} amount={account.value} />;
  }
}

function Plain({ eyebrow, amount }: { eyebrow: string; amount: number }) {
  return <HeroCard className="mx-4 mt-4" eyebrow={eyebrow} value={inr(amount)} size="md" />;
}

function CardBody({ card, asOf }: { card: CardAccount; asOf: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const cycle = cardCycle(asOf, card.statementDay, card.dueDay);
  const used = card.limit > 0 ? (card.outstanding / card.limit) * 100 : 0;

  return (
    <>
      <HeroCard
        className="mx-4 mt-4"
        eyebrow={t("accounts.card.outstanding")}
        value={inr(card.outstanding)}
        size="md"
        caption={t("accounts.card.usedOfLimit", { limit: inr(card.limit), percent: Math.round(used) })}
      >
        <Progress className="mt-4" value={used} label={t("accounts.card.used")} valueText={`${Math.round(used)}%`} />
      </HeroCard>

      <section aria-labelledby="card-cycle" className="pt-8">
        <h2 id="card-cycle" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("accounts.card.cycle")}
        </h2>
        <RowGroup>
          <Row
            title={t("accounts.card.statementDate")}
            subtitle={t("accounts.card.everyMonth", { day: ordinalDay(card.statementDay, lang) })}
            right={formatDayMonth(cycle.statement, lang)}
          />
          <Row
            title={t("accounts.card.paymentDue")}
            subtitle={t("accounts.card.everyMonth", { day: ordinalDay(card.dueDay, lang) })}
            right={formatDayMonth(cycle.due, lang)}
          />
          <Row title={t("accounts.card.minimumDue")} right={inr(card.minimumDue)} />
          <Row title={t("accounts.card.autoPay")} right={card.autoPay ? t("accounts.card.autoPayOn") : t("accounts.card.autoPayOff")} />
        </RowGroup>
      </section>
    </>
  );
}

function Recent({ detail }: { detail: Detail }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  return (
    <section aria-labelledby="account-recent" className="pt-8">
      <h2 id="account-recent" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {t("accounts.recent")}
      </h2>
      {detail.recent.length === 0 ? (
        <p className="px-5 pt-2 text-ink-2">{t("accounts.noRecent")}</p>
      ) : (
        <RowGroup>
          {detail.recent.map((tx) => {
            const day = formatWhen(tx.date, detail.asOf, { today: t("accounts.today"), yesterday: t("accounts.yesterday") }, lang);
            return (
              <Row
                key={tx.id}
                title={tx.description}
                subtitle={tx.time ? `${day} · ${formatClock(tx.time, lang)}` : day}
                right={<span className={tx.amount > 0 ? "text-positive" : undefined}>{signedInr(tx.amount)}</span>}
              />
            );
          })}
        </RowGroup>
      )}
    </section>
  );
}
