import { useTranslation } from "react-i18next";
import { useApiData, type Api, type Consent, type Profile, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { Row, RowGroup } from "../components/ui";
import { formatMonthYear, parseMonth } from "../lib/format";

type Loaded = { profile: Profile; connections: number; consents: Consent[] };

const loadYou = async (api: Api, options: RequestOptions): Promise<Loaded> => {
  const [profile, accounts, consents] = await Promise.all([api.getProfile(options), api.listAccounts(options), api.listConsents(options)]);
  return { profile, connections: accounts.bank.length + accounts.loans.length + accounts.cards.length + accounts.investments.length, consents };
};

/** Who the user is, and the places that hold their accounts, consents, privacy and language. */
export default function You() {
  const { t, i18n } = useTranslation();
  const result = useApiData(loadYou);

  if (result.status === "loading") return <LoadingCard />;
  if (result.status === "error") return <LoadError onRetry={result.retry} />;

  const { profile, connections, consents } = result.data;
  const active = consents.filter((c) => c.status === "active");
  const nextExpiry = active.map((c) => c.expiresOn).sort()[0];

  return (
    <div className="pb-8">
      <section className="flex items-center gap-4 px-5 pb-2 pt-8">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[22px] text-on-brand">
          {profile.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("you.eyebrow")}</p>
          <h1 className="font-display text-[24px] leading-tight tracking-tight">{profile.name}</h1>
          <p className="truncate text-[13px] text-ink-3">{profile.email}</p>
        </div>
      </section>

      <RowGroup className="mt-4">
        <Row to="/you/linked" title={t("you.linked.title")} subtitle={t("you.linked.count", { count: connections })} />
        <Row
          to="/you/consents"
          title={t("you.consents.title")}
          subtitle={
            active.length === 0
              ? t("you.consents.noneActive")
              : t("you.consents.summary", { count: active.length, date: formatMonthYear(parseMonth(nextExpiry.slice(0, 7)), i18n.resolvedLanguage) })
          }
        />
        <Row to="/you/privacy" title={t("you.privacy.title")} subtitle={t("you.privacy.subtitle")} />
        <Row to="/you/profile" title={t("you.profile.title")} subtitle={t("you.profile.subtitle")} />
      </RowGroup>

      <section className="mx-4 mt-8">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("language.label")}</h2>
        <LanguageSwitcher />
      </section>
    </div>
  );
}
