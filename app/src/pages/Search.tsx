import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions, type TransactionPage } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Field, Row, RowGroup } from "../components/ui";
import { formatWhen, signedInr } from "../lib/format";

type Found = { page: TransactionPage; asOf: string };

/** With nothing typed, the latest few; with something typed, every match. */
const LATEST = 8;

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

/** Finds a transaction by what it was for, across every account and card. */
export default function Search() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [text, setText] = useState("");
  const query = text.trim();
  // useApiData needs a stable load function; this one changes only when the search text does.
  const load = useCallback(
    async (api: Api, options: RequestOptions): Promise<Found> => {
      const [page, overview] = await Promise.all([
        api.listTransactions(query ? { search: query } : { limit: LATEST }, options),
        api.listAccounts(options),
      ]);
      return { page, asOf: overview.asOf };
    },
    [query],
  );
  const result = useApiData(load);
  // Keep showing the last answer while the next one loads, so the list does not blink on every key.
  const last = useRef<{ found: Found; query: string } | null>(null);
  if (result.status === "ready") last.current = { found: result.data, query };
  const shown = result.status === "ready" ? { found: result.data, query } : last.current;

  return (
    <>
      <PageHeader title={t("search.title")} backTo="/" />
      <div className="px-4 pt-3">
        <Field
          label={t("search.field")}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("search.placeholder")}
          icon={<SearchIcon />}
          autoComplete="off"
          hint={t("search.note")}
        />
      </div>

      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {!shown && result.status === "loading" && <LoadingCard />}
      {shown && result.status !== "error" && (
        <section aria-label={t("search.results")} className="pt-8">
          <p role="status" className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {shown.query ? t("search.count", { count: shown.found.page.total }) : t("search.recent")}
          </p>
          {shown.found.page.items.length === 0 ? (
            <p className="px-5 pt-2 text-ink-2">{t("search.none", { query: shown.query })}</p>
          ) : (
            <RowGroup>
              {shown.found.page.items.map((tx) => (
                <Row
                  key={tx.id}
                  to={`/transactions/${tx.id}`}
                  title={tx.description}
                  subtitle={formatWhen(tx.date, shown.found.asOf, { today: t("accounts.today"), yesterday: t("accounts.yesterday") }, lang)}
                  right={<span className={tx.amount > 0 ? "text-positive" : undefined}>{signedInr(tx.amount)}</span>}
                />
              ))}
            </RowGroup>
          )}
        </section>
      )}
    </>
  );
}
