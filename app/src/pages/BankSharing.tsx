import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import type { SharingState } from "../api/bankSharing";
import { useMemberData } from "../api/memberContext";
import { useAuth } from "../auth/AuthProvider";
import { rememberNotNow } from "../bank/asked";
import { useBank } from "../bank/BankProvider";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Button, Switch } from "../components/ui";
import { formatDateTime } from "../lib/format";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; state: SharingState };

/**
 * Whether the bank whose address this is can see the accounts it supplied. Off until the person turns it on, and turning it off takes
 * effect at once. Opened first as the question (from the front door, until it has been answered once), and afterwards from You.
 */
export default function BankSharing() {
  const { t, i18n } = useTranslation();
  const bank = useBank();
  const data = useMemberData();
  const auth = useAuth();
  const navigate = useNavigate();
  const userId = auth.session?.userId;
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Whether this opened as the question, before any answer: decided once, so answering does not change where Done goes.
  const [firstTime, setFirstTime] = useState<boolean | null>(null);

  const bankId = bank?.id;
  const sharing = data?.bankSharing;
  const refresh = useCallback(async () => {
    if (!sharing || !bankId) return;
    try {
      const state = await sharing.read(bankId);
      setFirstTime((was) => was ?? state.history.length === 0);
      setLoad({ status: "ready", state });
    } catch {
      setLoad({ status: "error" });
    }
  }, [sharing, bankId]);

  useEffect(() => {
    setLoad({ status: "loading" });
    void refresh();
  }, [refresh]);

  // Only a member at a bank's own address has anything to choose. Anywhere else this is not a screen.
  if (!bank || !data || !userId) return <Navigate to="/you" replace />;
  if (load.status === "loading") return <LoadingCard />;
  if (load.status === "error") return <LoadError onRetry={() => void refresh()} />;

  const { state } = load;
  const first = firstTime === true;
  const locale = i18n.resolvedLanguage;

  const change = async (next: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      await data.bankSharing.set(bank.id, next);
      setLoad({ status: "ready", state: await data.bankSharing.read(bank.id) });
    } catch {
      // Whatever the person sees must be what the database holds: ask it again rather than guess.
      setFailed(true);
      await refresh();
    }
    setBusy(false);
  };

  const leave = () => {
    // "Not now" is remembered, so the question is not put again at every visit. It is still there under You.
    if (!state.sharing && state.history.length === 0) rememberNotNow(userId, bank.id);
    navigate(first ? "/" : "/you", { replace: true });
  };

  const p = { bank: bank.name };
  return (
    <>
      <PageHeader title={t("bank.share.title", p)} backTo="/you" />
      <div className="space-y-8 px-5 pb-10 pt-4">
        <p className="max-w-[40ch] text-[15px] text-ink-2">{t("bank.share.intro", p)}</p>

        <section aria-labelledby="share-sees">
          <h2 id="share-sees" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t("bank.share.sees.title", p)}
          </h2>
          <ul className="mt-3 space-y-3">
            {(["point1", "point2"] as const).map((point) => (
              <li key={point} className="flex gap-3 text-[15px] text-ink">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                <span>{t(`bank.share.sees.${point}`, p)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="share-never">
          <h2 id="share-never" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t("bank.share.never.title", p)}
          </h2>
          <p className="mt-3 max-w-[40ch] text-[15px] text-ink">{t("bank.share.never.body")}</p>
          <p className="mt-3 max-w-[40ch] text-[13px] text-ink-3">{t("bank.share.logged", p)}</p>
        </section>

        <div className="rounded-btn bg-tint p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[15px] font-medium text-ink">
              {t("bank.share.switch", p)}
            </span>
            <Switch label={t("bank.share.switch", p)} checked={state.sharing} disabled={busy} onCheckedChange={(next) => void change(next)} />
          </div>
          <p role="status" className="mt-3 text-[13px] text-ink-2">
            {t(state.sharing ? "bank.share.on" : "bank.share.off", p)}
          </p>
          <p className="mt-1 text-[13px] text-ink-3">{t("bank.share.stop")}</p>
          {failed && (
            <p role="alert" className="mt-3 text-[13px] text-negative">
              {t("bank.share.error")}
            </p>
          )}
        </div>

        {state.history.length > 0 && (
          <section aria-labelledby="share-history">
            <h2 id="share-history" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {t("bank.share.history.title")}
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {state.history.map((change) => (
                <li key={change.at} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                  <span className="text-ink">{t(change.sharing ? "bank.share.history.on" : "bank.share.history.off")}</span>
                  <time dateTime={change.at} className="text-[13px] text-ink-3">
                    {formatDateTime(change.at, locale)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Button variant={state.sharing ? "primary" : "quiet"} disabled={busy} onClick={leave}>
          {t(state.sharing || !first ? "bank.share.done" : "bank.share.notNow")}
        </Button>
      </div>
    </>
  );
}
