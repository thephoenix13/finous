import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import BrandSplash from "../components/BrandSplash";
import { Button } from "../components/ui";
import { PRIVACY_NOTICE_URL } from "../config";

const POINTS = ["point1", "point2", "point3"] as const;

/** Joining the beta: the terms in plain words, and a tick that is recorded against the person's account. */
export default function Join() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const boxId = useId();

  if (auth.access === "needs-signin") return <Navigate to="/signin" replace />;
  if (auth.access === "member" || auth.access === "demo") return <Navigate to="/" replace />;
  if (auth.access === "loading") return <BrandSplash />;

  const join = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await auth.acceptConsents();
      // Accepting changes `auth.access` to member, and this screen then sends the person on.
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{auth.session?.email}</p>
      <h1 className="mt-3 font-display text-[28px] leading-[1.15] tracking-tight">{t("join.title")}</h1>
      <p className="mt-4 text-[15px] text-ink-2">{t("join.intro")}</p>

      <ul className="mt-6 space-y-4">
        {POINTS.map((p) => (
          <li key={p} className="flex gap-3 text-[15px] text-ink">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
            <span>{t(`join.${p}`)}</span>
          </li>
        ))}
      </ul>

      {PRIVACY_NOTICE_URL && (
        <a href={PRIVACY_NOTICE_URL} target="_blank" rel="noopener noreferrer" className="mt-5 text-[15px] font-medium text-brand underline underline-offset-4">
          {t("join.privacy")}
        </a>
      )}

      <div className="mt-8 flex items-start gap-3">
        <input id={boxId} type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-[var(--brand)]" />
        <label htmlFor={boxId} className="text-[15px] text-ink">
          {t("join.agree")}
        </label>
      </div>

      {failed && (
        <p role="alert" className="mt-4 text-[13px] text-negative">
          {t("join.error")}
        </p>
      )}

      <div className="mt-auto space-y-3 pt-10">
        <Button disabled={!agreed} loading={busy} onClick={() => void join()}>
          {t(busy ? "join.saving" : "join.accept")}
        </Button>
        <Button variant="quiet" disabled={busy} onClick={() => void auth.signOut()}>
          {t("join.notNow")}
        </Button>
      </div>
    </div>
  );
}
