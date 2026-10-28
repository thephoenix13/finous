import { useTranslation } from "react-i18next";
import { useApiData, type Api, type HomeSummary, type LoanAccount, type Profile, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import { ButtonLink, HeroCard, Row, RowGroup } from "../components/ui";
import { formatWeekdayDate, inr } from "../lib/format";
import { insightCopy } from "../lib/insightCopy";

type HomeData = { home: HomeSummary; profile: Profile; loans: LoanAccount[] };

const loadHome = async (api: Api, options: RequestOptions): Promise<HomeData> => {
  const [home, profile, accounts] = await Promise.all([api.getHome(options), api.getProfile(options), api.listAccounts(options)]);
  return { home, profile, loans: accounts.loans };
};

/** Morning until noon, afternoon until five, evening after. `now` is the device's clock; tests pass their own. */
function daypart(now: Date): "morning" | "afternoon" | "evening" {
  const hour = now.getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

/**
 * Home: net worth, this month's cash flow and the things worth looking at.
 * The prototype draws a net-worth curve here. The Api has no history to draw it from, so there is none (see types.ts, M4).
 */
export default function Home({ now = new Date() }: { now?: Date }) {
  const result = useApiData(loadHome);
  if (result.status === "loading") return <LoadingCard />;
  if (result.status === "error") return <LoadError onRetry={result.retry} />;
  return <HomeContent data={result.data} now={now} />;
}

function HomeContent({ data, now }: { data: HomeData; now: Date }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { home, profile, loans } = data;
  const { netWorth, month } = home;
  const delta = month.savedChangeVsLastMonth;

  return (
    <div className="pb-8">
      <header className="px-5 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{formatWeekdayDate(home.asOf, lang)}</p>
        <h1 className="mt-2 font-display text-[28px] leading-[1.15] tracking-tight">{t(`home.greeting.${daypart(now)}`, { name: profile.firstName })}</h1>
      </header>

      <HeroCard
        className="mx-4 mt-4"
        eyebrow={t("home.netWorth")}
        value={inr(netWorth.value)}
        caption={t(netWorth.changeThisMonth >= 0 ? "home.changeUp" : "home.changeDown", { amount: inr(Math.abs(netWorth.changeThisMonth)) })}
      />

      <section aria-labelledby="home-month" className="px-5 pt-8">
        <h2 id="home-month" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("home.thisMonth")}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <Figure label={t("home.in")} value={inr(month.income)} />
          <Figure label={t("home.out")} value={inr(month.outflow)} />
        </dl>
        <div className="mt-5 border-t border-line pt-5">
          <dl>
            <Figure label={t("home.saved")} value={inr(month.saved)} />
          </dl>
          <p className={`mt-2 text-[13px] ${delta >= 0 ? "text-positive" : "text-ink-2"}`}>
            {delta === 0 ? t("home.savedSame") : t(delta > 0 ? "home.savedMore" : "home.savedLess", { amount: inr(Math.abs(delta)) })}
          </p>
        </div>
      </section>

      <div className="flex gap-3 px-5 pt-8">
        <ButtonLink to="/cash-flow" variant="ghost" size="sm">
          {t("home.cashFlow")}
        </ButtonLink>
        <ButtonLink to="/accounts" variant="ghost" size="sm">
          {t("home.allAccounts")}
        </ButtonLink>
      </div>

      <section aria-labelledby="home-look" className="pt-8">
        <h2 id="home-look" className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("home.lookAt")}
        </h2>
        {home.lookAt.length === 0 ? (
          <p className="px-5 text-ink-2">{t("home.lookAtNone")}</p>
        ) : (
          <RowGroup>
            {home.lookAt.map((insight, i) => {
              const loan = insight.kind === "refinance" ? loans.find((l) => l.id === insight.loanId) : undefined;
              const copy = insightCopy(insight, t, lang, loan?.name);
              return <Row key={insight.id} icon={<span className="font-mono text-[13px]">{String(i + 1).padStart(2, "0")}</span>} title={copy.title} subtitle={copy.body} />;
            })}
          </RowGroup>
        )}
      </section>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="mt-1 font-display text-[26px] leading-none tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}
