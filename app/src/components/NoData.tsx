import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isApiError } from "../api";
import { ROUTES } from "../routes";
import { LoadError } from "./DataState";
import { ButtonLink } from "./ui";

/** "Nothing here yet", with the one thing to do about it. Shown when something cannot be worked out until the person adds their details. */
export function NoData({ title, body, to, cta }: { title: string; body: string; to: string; cta: string }) {
  return (
    <section className="px-5 pt-16 text-center">
      <h2 className="font-display text-[20px] leading-snug tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-[32ch] text-[15px] text-ink-2">{body}</p>
      <ButtonLink to={to} fullWidth={false} className="mt-8">
        {cta}
      </ButtonLink>
    </section>
  );
}

/** Asks for the monthly figures. `reason` says what they will fill in. */
export function NeedsFigures({ reason }: { reason: "cashFlow" | "recap" | "health" | "afford" | "prepay" }) {
  const { t } = useTranslation();
  return <NoData title={t("empty.figures.title")} body={t(`empty.figures.${reason}`)} to={ROUTES.figures} cta={t("empty.figures.cta")} />;
}

/** A failed load: the plain error with a retry, unless the failure is "nothing to work this out from yet", which shows `noData` instead. */
export function LoadFailure({ error, onRetry, noData }: { error: unknown; onRetry: () => void; noData?: ReactNode }) {
  if (noData && isApiError(error) && error.code === "no_data") return <>{noData}</>;
  return <LoadError onRetry={onRetry} />;
}
