import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Row, RowGroup } from "../components/ui";
import { inr } from "../lib/format";

const load = async (api: Api, options: RequestOptions) => {
  const [accounts, consents] = await Promise.all([api.listAccounts(options), api.listConsents(options)]);
  return { accounts, consents };
};

/** Every connection Finous reads, and whether the consent that lets it read them is still in force. */
export default function LinkedAccounts() {
  const { t } = useTranslation();
  const result = useApiData(load);

  return (
    <>
      <PageHeader title={t("you.linked.title")} backTo="/you" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" &&
        (() => {
          const { accounts, consents } = result.data;
          // Balances, transactions and holdings are what every account here is read for.
          const dashboard = consents.find((c) => c.purpose === "financial-dashboard");
          const status = t(`you.status.${dashboard?.status ?? "revoked"}`);
          const rows = [
            ...accounts.bank.map((a) => ({ id: a.id, name: a.name, sub: t("accounts.sub.bank", { last4: a.last4 }) })),
            ...accounts.loans.map((a) => ({ id: a.id, name: a.name, sub: t("accounts.eyebrow.loan") })),
            ...accounts.cards.map((a) => ({ id: a.id, name: a.name, sub: t("accounts.sub.card", { limit: inr(a.limit) }) })),
            ...accounts.investments.map((a) => ({ id: a.id, name: a.name, sub: t(`accounts.eyebrow.${a.instrument}`) })),
          ];
          return (
            <div className="pb-8">
              <p className="px-5 pb-2 pt-3 text-[15px] text-ink-2">{t("you.linked.note")}</p>
              <RowGroup>
                {rows.map((r) => (
                  <Row key={r.id} to="/you/consents" title={r.name} subtitle={r.sub} right={<span className="text-[13px] text-ink-3">{status}</span>} />
                ))}
              </RowGroup>
            </div>
          );
        })()}
    </>
  );
}
