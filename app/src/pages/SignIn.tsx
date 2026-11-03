import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { AuthError } from "../auth/types";
import { Button, Field } from "../components/ui";
import BrandSplash from "../components/BrandSplash";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERRORS = {
  invalid_code: "signIn.errors.invalidCode",
  rate_limited: "signIn.errors.rateLimited",
  network: "signIn.errors.network",
  unknown: "signIn.errors.unknown",
} as const;

/** Email, then the 6-digit code we mail. The same two steps create the account the first time and sign in after that. */
export default function SignIn() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const codeField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code") codeField.current?.focus();
  }, [step]);

  if (!auth.canSignIn || auth.access === "demo" || auth.access === "member") return <Navigate to="/" replace />;
  if (auth.access === "needs-consent") return <Navigate to="/join" replace />;
  if (auth.access === "loading") return <BrandSplash />;

  const say = (e: unknown) => {
    const code = e instanceof AuthError ? e.code : "unknown";
    setError(t(ERRORS[code]));
  };

  const send = async (event?: FormEvent, again = false) => {
    event?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) return setError(t("signIn.errors.invalidEmail"));
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await auth.sendCode(clean);
      setEmail(clean);
      setStep("code");
      if (again) setNotice(t("signIn.resent"));
    } catch (e) {
      say(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await auth.verifyCode(email, code);
      // Signing in changes `auth.access`, and this screen then sends the person on.
    } catch (e) {
      say(e);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Finous</p>
      <h1 className="mt-3 font-display text-[28px] leading-[1.15] tracking-tight">{step === "email" ? t("signIn.title") : t("signIn.codeTitle")}</h1>
      <p className="mt-4 max-w-[34ch] text-[15px] text-ink-2">{step === "email" ? t("signIn.intro") : t("signIn.codeIntro", { email })}</p>

      {step === "email" ? (
        <form onSubmit={send} className="mt-8 space-y-4" noValidate>
          <Field label={t("signIn.emailLabel")} type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" loading={busy}>
            {t(busy ? "signIn.sending" : "signIn.send")}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8 space-y-4" noValidate>
          <Field
            ref={codeField}
            label={t("signIn.codeLabel")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            error={error}
          />
          {notice && (
            <p role="status" className="text-[13px] text-positive">
              {notice}
            </p>
          )}
          <Button type="submit" loading={busy} disabled={code.length !== 6}>
            {t(busy ? "signIn.verifying" : "signIn.verify")}
          </Button>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="quiet" size="sm" fullWidth={false} disabled={busy} onClick={() => void send(undefined, true)}>
              {t("signIn.resend")}
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              fullWidth={false}
              onClick={() => {
                setStep("email");
                setCode("");
                setError(undefined);
                setNotice(undefined);
              }}
            >
              {t("signIn.otherEmail")}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-auto pt-12">
        <p className="text-[13px] text-ink-3">{t("signIn.demoNote")}</p>
        <Button variant="ghost" className="mt-3" onClick={auth.enterDemo}>
          {t("signIn.demo")}
        </Button>
      </div>
    </div>
  );
}
