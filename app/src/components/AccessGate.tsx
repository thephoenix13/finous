import { useEffect, useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { ApiProvider } from "../api";
import { MemberDataProvider } from "../api/memberContext";
import { createMemberEnv, type MemberEnv } from "../api/memberEnv";
import { useAuth } from "../auth/AuthProvider";
import BankArrival from "../bank/BankArrival";
import { sharedSupabase } from "../auth/supabaseClient";
import type { Session } from "../auth/types";
import { rememberReturn } from "../lib/returnTo";
import BrandSplash from "./BrandSplash";

/** How a member's screens get their data. Tests pass their own; the app builds it over Supabase. */
export type MemberEnvFactory = (session: Session) => MemberEnv;

const overSupabase: MemberEnvFactory = (session) => {
  const supabase = sharedSupabase();
  if (!supabase) throw new Error("A member cannot be signed in without Supabase settings");
  return createMemberEnv(supabase, session);
};

/** Sends people to the right place: sign in, consent, their own space, or the demo. Wraps every screen of the app proper. */
export default function AccessGate({ memberEnv = overSupabase }: { memberEnv?: MemberEnvFactory }) {
  const { access, session } = useAuth();
  const location = useLocation();
  // A link to a screen survives signing in: sign-in and the beta terms send the person on to where it pointed.
  const state = rememberReturn(location);
  switch (access) {
    case "loading":
      return <BrandSplash />;
    case "needs-signin":
      return <Navigate to="/signin" replace state={state} />;
    case "needs-consent":
      return <Navigate to="/join" replace state={state} />;
    case "member":
      return session ? <MemberSpace session={session} make={memberEnv} /> : <BrandSplash />;
    case "demo":
      return <Outlet />;
  }
}

/** A signed-in member's screens, running on their own data rather than the sample customer's. */
function MemberSpace({ session, make }: { session: Session; make: MemberEnvFactory }) {
  // A refreshed sign-in is a new session object for the same person: keep their data, drop it only for someone else.
  const { userId, email } = session;
  const who = useMemo(() => ({ userId, email }), [userId, email]);
  const env = useMemo(() => make(who), [make, who]);
  return (
    <ApiProvider api={env.api}>
      <MemberDataProvider data={env.data}>
        <BankArrival />
        <Outlet />
      </MemberDataProvider>
    </ApiProvider>
  );
}

/** /demo: turns the demo on and goes to Home. A link to share with partners. */
export function EnterDemo() {
  const { enterDemo, canSignIn, access } = useAuth();
  useEffect(() => {
    if (canSignIn) enterDemo();
  }, [canSignIn, enterDemo]);
  // Wait until the demo is on, or the gate would bounce the person to sign-in first.
  return access === "demo" ? <Navigate to="/" replace /> : <BrandSplash />;
}
