import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui";
import { markFirstRunDone } from "../lib/firstRun";

const STEP_MS = 500;
const LAST_MS = 800;

const loadNames = async (api: Api, options: RequestOptions): Promise<string[]> => {
  const a = await api.listAccounts(options);
  return [...a.bank, ...a.cards, ...a.loans, ...a.investments].map((x) => x.name);
};

/**
 * Fetching the accounts, shown honestly: each account is listed and turns from waiting to done as it arrives, with no made-up
 * percentage. When the last one is done the user lands on Home, and this device remembers the welcome is over.
 */
export default function WelcomeSync() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const result = useApiData(loadNames);
  const [done, setDone] = useState(0);

  const finish = useCallback(() => {
    markFirstRunDone();
    navigate("/", { replace: true });
  }, [navigate]);

  const names = result.status === "ready" ? result.data : undefined;
  useEffect(() => {
    if (!names) return;
    const id = setTimeout(() => (done < names.length ? setDone(done + 1) : finish()), done < names.length ? STEP_MS : LAST_MS);
    return () => clearTimeout(id);
  }, [names, done, finish]);

  return (
    <div className="flex min-h-full flex-col pb-6">
      <PageHeader title={t("welcome.sync.title")} backTo="/welcome/consent" />
      <div className="px-5 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("welcome.step", { step: 2 })}</p>
        <p className="mt-3 text-[15px] text-ink-2">{t("welcome.sync.body")}</p>
      </div>
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {names && (
        <ul className="mt-6 divide-y divide-line px-5" aria-live="polite">
          {names.map((name, i) => (
            <li key={name} className="flex items-center justify-between py-3 text-[15px]">
              <span className={i < done ? "text-ink" : "text-ink-3"}>{name}</span>
              <span className={`text-[13px] ${i < done ? "text-positive" : "text-ink-3"}`}>{t(i < done ? "welcome.sync.done" : "welcome.sync.waiting")}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto px-5 pt-8">
        <Button variant="quiet" onClick={finish}>
          {t("welcome.sync.skip")}
        </Button>
      </div>
    </div>
  );
}
