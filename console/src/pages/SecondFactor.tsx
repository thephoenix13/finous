import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { AuthError } from "../auth/types";
import { ROUTES } from "../routes";
import { Button, Field } from "../ui";
import AuthLayout from "./AuthLayout";
import { returnTo } from "./SignIn";

/** How long "Resend code" stays off after a code goes out, so it can't be used to flood an inbox. */
const RESEND_AFTER_SECONDS = 30;

/** I1.2: the code from their email, with a choice to remember this device. */
export default function SecondFactor() {
  const { client, state, pendingEmail, setPendingEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [wait, setWait] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  if (state.status === "signed_in") return <Navigate to={returnTo(location.state)} replace />;
  if (!pendingEmail) return <Navigate to={ROUTES.signIn} replace state={location.state} />;

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || !pendingEmail) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await client.verifySecondFactor(pendingEmail, code, remember);
      navigate(returnTo(location.state), { replace: true });
    } catch (e) {
      setError(e instanceof AuthError && e.code === "invalid_code" ? "That code isn't right, or it has expired. Check it or ask for a new one." : "We couldn't check the code just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!pendingEmail || wait > 0) return;
    setError(null);
    try {
      await client.resendCode(pendingEmail);
    } catch {
      setError("We couldn't send a new code just now. Try again in a moment.");
      return;
    }
    setResent(true);
    setWait(RESEND_AFTER_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setWait((w) => {
        if (w <= 1 && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
        return Math.max(0, w - 1);
      });
    }, 1000);
  }

  return (
    <AuthLayout title="Check your email" description={`We sent a 6-digit code to ${pendingEmail}.`}>
      <form onSubmit={verify} noValidate className="space-y-4">
        <Field label="Code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        <label className="flex items-start gap-3 text-[14px]">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-1 size-4" />
          <span>Remember this device. Skip the code next time on this computer.</span>
        </label>
        {error ? (
          <p role="alert" className="text-[14px] text-negative">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth loading={busy}>
          Sign in
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[14px]">
        <Button variant="quiet" onClick={() => void resend()} disabled={wait > 0}>
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </Button>
        <Link to={ROUTES.signIn} onClick={() => setPendingEmail(null)} className="font-medium text-brand-strong underline underline-offset-2">
          Use a different email
        </Link>
      </div>
      <p role="status" className="mt-3 text-[13px] text-ink-3">
        {resent ? "We sent you a new code." : ""}
      </p>
    </AuthLayout>
  );
}
