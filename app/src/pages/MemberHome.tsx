import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui";

/**
 * What a signed-in beta member sees until their own data screens exist: the account is ready, the demo shows what is coming.
 * They never see the sample customer's figures as if they were their own.
 */
export default function MemberHome() {
  const { t } = useTranslation();
  const auth = useAuth();
  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col px-5 pb-8 pt-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{auth.session?.email}</p>
      <h1 className="mt-3 font-display text-[28px] leading-[1.15] tracking-tight">{t("beta.title")}</h1>
      <p className="mt-4 max-w-[34ch] text-[15px] text-ink-2">{t("beta.intro")}</p>
      <div className="mt-auto space-y-3 pt-12">
        <Button onClick={auth.enterDemo}>{t("beta.demo")}</Button>
        <Button variant="quiet" onClick={() => void auth.signOut()}>
          {t("beta.signOut")}
        </Button>
      </div>
    </div>
  );
}
