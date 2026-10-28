import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonLink } from "../components/ui";

const SPLASH_MS = 1200;

/** The brand mark for a moment, then the promise in one sentence and one way forward. */
export default function Welcome() {
  const { t } = useTranslation();
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setSplash(false), SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  if (splash) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-6">
        <h1 className="font-display text-[40px] tracking-tight">Finous</h1>
        <span aria-hidden="true" className="h-[3px] w-16 animate-pulse rounded-full bg-brand" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("welcome.eyebrow")}</p>
      <h1 className="mt-4 font-display text-[40px] leading-[1.1] tracking-tight">{t("welcome.title")}</h1>
      <p className="mt-5 max-w-[32ch] text-[15px] text-ink-2">{t("welcome.body")}</p>
      <div className="mt-auto pt-10">
        <ButtonLink to="/welcome/consent">{t("welcome.cta")}</ButtonLink>
        <p className="mt-4 text-center text-[12px] text-ink-3">{t("welcome.time")}</p>
      </div>
    </div>
  );
}
