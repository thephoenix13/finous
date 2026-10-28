import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import { ButtonLink } from "../components/ui";

const LINES = ["balances", "valid", "control"] as const;

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 5 5 9-10" />
  </svg>
);

/** What the user is agreeing to share, in plain language, before anything is connected. */
export default function WelcomeConsent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full flex-col pb-6">
      <PageHeader title={t("welcome.consent.title")} backTo="/welcome" />
      <div className="px-5 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("welcome.step", { step: 1 })}</p>
        <p className="mt-3 text-[15px] text-ink-2">{t("welcome.consent.intro")}</p>
        <ul className="mt-6 space-y-5">
          {LINES.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-positive text-white">
                <Check />
              </span>
              <span>
                <span className="block text-[15px] font-medium text-ink">{t(`welcome.consent.${line}.title`)}</span>
                <span className="mt-0.5 block text-[13px] text-ink-2">{t(`welcome.consent.${line}.body`)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 rounded-card border border-line p-4 text-[13px] text-ink-2">{t("welcome.consent.demo")}</p>
      </div>
      <div className="mt-auto px-5 pt-8">
        <ButtonLink to="/welcome/sync">{t("welcome.consent.cta")}</ButtonLink>
      </div>
    </div>
  );
}
