import { useTranslation } from "react-i18next";
import { useBank } from "./BankProvider";

/** A bank's name and logo along the top of every screen. Nothing on Finous's own address. */
export function BankBar() {
  const bank = useBank();
  if (!bank) return null;
  return (
    <header data-testid="bank-bar" className="flex shrink-0 items-center gap-3 bg-brand px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] text-on-brand">
      {bank.logo && (
        // Shown as an image only (never placed into the page), on white so a dark logo never disappears into the brand colour.
        <img src={bank.logo} alt="" className="h-8 w-auto max-w-[96px] shrink-0 rounded-[8px] bg-white object-contain p-1" />
      )}
      <span className="min-w-0 truncate text-[15px] font-medium">{bank.name}</span>
    </header>
  );
}

/** The bank's disclaimer, and "Powered by Finous". The second always stays, so nobody can mistake a bank's page for the whole of Finous. */
export function BankFooter() {
  const bank = useBank();
  const { t } = useTranslation();
  if (!bank) return null;
  return (
    <footer className="px-5 pb-6 pt-8 text-center text-[12px] leading-relaxed text-ink-3">
      <p>{bank.disclaimer}</p>
      <p className="mt-2 font-medium">{t("bank.poweredBy")}</p>
    </footer>
  );
}
