import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useApiData, type AccountsOverview, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Row, RowGroup } from "../components/ui";
import { formatMonthYear, inr, parseMonth } from "../lib/format";

const loadAccounts = (api: Api, options: RequestOptions): Promise<AccountsOverview> => api.listAccounts(options);

const Icon = ({ children }: { children: ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const BANK = (
  <Icon>
    <path d="M3 10 12 4l9 6" />
    <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
  </Icon>
);
const HOME = (
  <Icon>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
  </Icon>
);
const CARD = (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" />
  </Icon>
);
const TREND = (
  <Icon>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Icon>
);

/**
 * Every linked account, grouped as the prototype groups them: banks, loans, cards, investments.
 * Banks and cards open their own page; a loan opens the refinance check, as in the prototype.
 * Investments are not links yet: the prototype's holdings screens need data the Api does not have.
 */
export default function Accounts() {
  const { t } = useTranslation();
  const result = useApiData(loadAccounts);

  return (
    <>
      <PageHeader title={t("accounts.title")} backTo="/" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && <Groups overview={result.data} />}
    </>
  );
}

function Groups({ overview }: { overview: AccountsOverview }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const month = (value: string) => formatMonthYear(parseMonth(value), lang);

  return (
    <div className="pb-8">
      <Group title={t("accounts.groups.bank")} show={overview.bank.length > 0}>
        {overview.bank.map((a) => (
          <Row key={a.id} to={`/accounts/${a.id}`} icon={BANK} title={a.name} subtitle={t("accounts.sub.bank", { last4: a.last4 })} right={inr(a.balance)} />
        ))}
      </Group>
      <Group title={t("accounts.groups.loans")} show={overview.loans.length > 0}>
        {overview.loans.map((l) => (
          <Row
            key={l.id}
            to="/plans/refinance"
            icon={HOME}
            title={l.name}
            subtitle={t("accounts.sub.loan", { end: month(l.endsOn), start: month(l.startedOn) })}
            right={inr(l.outstanding)}
          />
        ))}
      </Group>
      <Group title={t("accounts.groups.cards")} show={overview.cards.length > 0}>
        {overview.cards.map((c) => (
          <Row key={c.id} to={`/accounts/${c.id}`} icon={CARD} title={c.name} subtitle={t("accounts.sub.card", { limit: inr(c.limit) })} right={inr(c.outstanding)} />
        ))}
      </Group>
      <Group title={t("accounts.groups.investments")} show={overview.investments.length > 0}>
        {overview.investments.map((i) => {
          const subtitle =
            i.instrument === "mutual-funds"
              ? t("accounts.sub.sips", { count: i.activeSips ?? 0 })
              : i.instrument === "stocks"
                ? t("accounts.sub.stocks", { count: i.holdings ?? 0 })
                : i.institution
                  ? t("accounts.sub.ppf", { institution: i.institution, year: i.openedYear })
                  : t("accounts.sub.ppfNoInstitution", { year: i.openedYear });
          return <Row key={i.id} icon={TREND} title={i.name} subtitle={subtitle} right={inr(i.value)} />;
        })}
      </Group>
    </div>
  );
}

function Group({ title, show, children }: { title: string; show: boolean; children: ReactNode }) {
  const id = useId();
  if (!show) return null;
  return (
    <section aria-labelledby={id} className="pt-6">
      <h2 id={id} className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {title}
      </h2>
      <RowGroup>{children}</RowGroup>
    </section>
  );
}
