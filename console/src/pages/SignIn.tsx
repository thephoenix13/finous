import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { AuthError } from "../auth/types";
import { ROUTES } from "../routes";
import { Button, Field } from "../ui";
import AuthLayout from "./AuthLayout";

/**
 * Where to go after signing in: the screen they were sent away from, if it is a path inside the console.
 * A web address, a protocol-relative "//host" or a backslash trick would send them off the site, so those go to the overview.
 */
export const returnTo = (state: unknown): string => {
  const from = (state as { from?: unknown } | null)?.from;
  const local = typeof from === "string" && /^\/(?![/\\])/.test(from);
  return local && !from.startsWith("/sign-in") ? from : ROUTES.overview;
};

function describe(error: unknown): string {
  if (error instanceof AuthError && error.code === "invalid_credentials") return "That email and password don't match. Check them and try again.";
  return "We couldn't reach sign-in just now. Try again in a moment.";
}

/** I1.1: the first step of signing in, with a work email and a password. */
export default function SignIn() {
  const { client, state, setPendingEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "signed_in") return <Navigate to={returnTo(location.state)} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (email.trim() === "" || password === "") {
      setError("Enter your work email and your password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const step = await client.startSignIn(email, password);
      if (step === "second_factor") {
        setPendingEmail(email.trim().toLowerCase());
        navigate(ROUTES.verify, { state: location.state });
      } else {
        navigate(returnTo(location.state), { replace: true });
      }
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in" description="Use your work email. We'll ask for a code from your email next.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Work email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? (
          <p role="alert" className="text-[14px] text-negative">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth loading={busy}>
          Continue
        </Button>
      </form>

      {client.demo ? (
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-[13px] text-ink-2">
            This is a demo. Any password works, and the code is {client.demo.code}. Try a role:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {client.demo.people.map((p) => (
              <li key={p.email}>
                <button type="button" onClick={() => setEmail(p.email)} className="h-9 rounded-btn border border-line px-3 text-[13px] font-medium hover:bg-tint">
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AuthLayout>
  );
}
