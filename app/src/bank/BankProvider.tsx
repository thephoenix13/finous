import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { sharedSupabase } from "../auth/supabaseClient";
import BrandSplash from "../components/BrandSplash";
import { buttonClasses } from "../components/ui";
import { APP_DOMAIN } from "../config";
import { isLanguage, LANGUAGES, type Language } from "../i18n";
import { applyBank } from "./apply";
import { bankSubdomainFromHost, type AdvisorMode, type BankBranding } from "./branding";
import { DEV_BANKS } from "./devBanks";
import { supabaseBankLookup, type BankLookup } from "./lookup";

const BankContext = createContext<BankBranding | null>(null);

/** The bank whose address this is, or null on Finous's own address. Nothing in the app needs to know more than this. */
export function useBank(): BankBranding | null {
  return useContext(BankContext);
}

/** The languages this app may be shown in: both on Finous's own address, and only what a bank has switched on at a bank's. */
export function useAllowedLanguages(): readonly Language[] {
  const bank = useBank();
  return useMemo(() => (bank ? languagesFor(bank) : LANGUAGES), [bank]);
}

/** Who answers questions here. On Finous's own address, as it always has been: the AI, with the fixed rules when it cannot. */
export function useAdvisorMode(): AdvisorMode {
  return useBank()?.advisor ?? "ai";
}

const languagesFor = (bank: BankBranding): Language[] => LANGUAGES.filter((lng) => (lng === "en" ? bank.english : bank.hindi));

function defaultLookup(): BankLookup | null {
  const supabase = sharedSupabase();
  const real = supabase ? supabaseBankLookup(supabase) : null;
  // In development a few sample banks work with no database. This branch is removed from production builds.
  if (import.meta.env.DEV) return async (subdomain) => DEV_BANKS[subdomain] ?? (real ? real(subdomain) : null);
  return real;
}

type Props = {
  /** The address the page was opened at. Tests pass their own. */
  host?: string;
  appDomain?: string;
  /** How to find a bank. Tests pass a stand-in; the app uses the database. Null means there is no way to look. */
  lookup?: BankLookup | null;
  children: ReactNode;
};

/**
 * Makes the app a bank's when the address is a bank's, and leaves it exactly as it is otherwise. Nothing of the app shows until
 * the bank is known, so a customer never sees Finous blue flash to green. An address with no live bank gets a plain "not
 * available" page, never the app.
 */
export function BankProvider({ host = window.location.hostname, appDomain = APP_DOMAIN, lookup, children }: Props) {
  const subdomain = bankSubdomainFromHost(host, appDomain);
  const find = useMemo(() => (lookup === undefined ? defaultLookup() : lookup), [lookup]);
  if (!subdomain) return <BankContext.Provider value={null}>{children}</BankContext.Provider>;
  return (
    <BankLoader key={subdomain} subdomain={subdomain} find={find}>
      {children}
    </BankLoader>
  );
}

type State = { kind: "loading" } | { kind: "ready"; bank: BankBranding } | { kind: "unavailable" } | { kind: "error" };

function BankLoader({ subdomain, find, children }: { subdomain: string; find: BankLookup | null; children: ReactNode }) {
  const [state, setState] = useState<State>(find ? { kind: "loading" } : { kind: "unavailable" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!find) return;
    let current = true;
    setState({ kind: "loading" });
    find(subdomain).then(
      (bank) => current && setState(bank ? { kind: "ready", bank } : { kind: "unavailable" }),
      () => current && setState({ kind: "error" }),
    );
    return () => {
      current = false;
    };
  }, [find, subdomain, attempt]);

  switch (state.kind) {
    case "loading":
      return <BrandSplash />;
    case "unavailable":
      return <Notice />;
    case "error":
      return <Notice retry={() => setAttempt((n) => n + 1)} />;
    case "ready":
      return <BankReady bank={state.bank}>{children}</BankReady>;
  }
}

function BankReady({ bank, children }: { bank: BankBranding; children: ReactNode }) {
  const { i18n } = useTranslation();
  useEffect(() => applyBank(bank), [bank]);

  // A bank that has switched a language off is never shown in it, even if the browser or an earlier visit asked for it.
  const allowed = useMemo(() => languagesFor(bank), [bank]);
  const current = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";
  const fine = allowed.includes(current);
  useEffect(() => {
    if (!fine) void i18n.changeLanguage(allowed[0]);
  }, [fine, i18n, allowed]);
  if (!fine) return <BrandSplash />;

  return <BankContext.Provider value={bank}>{children}</BankContext.Provider>;
}

/** No live bank at this address, or (with `retry`) the lookup could not be made. */
function Notice({ retry }: { retry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-[480px] px-5 pt-24 text-center">
      <h1 className="font-display text-[24px] leading-tight tracking-tight">{retry ? t("bank.error.title") : t("bank.unavailable.title")}</h1>
      <p className="mx-auto mt-3 max-w-[30ch] text-ink-2">{retry ? t("common.loadError") : t("bank.unavailable.body")}</p>
      {retry && (
        <button type="button" onClick={retry} className={buttonClasses("ghost", "md", false, "mt-8")}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
