import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { sharedAuthClient } from "./supabaseClient";
import type { AuthClient, Session } from "./types";

/**
 * What the app should show someone right now:
 *  - loading: still finding out
 *  - demo: the sample customer (no sign-in needed, nothing is saved). Also the only mode when this build has no sign-in.
 *  - needs-signin: not signed in and not in the demo
 *  - needs-consent: signed in but has not accepted the beta terms and privacy notice
 *  - member: signed in and consented
 */
export type Access = "loading" | "demo" | "needs-signin" | "needs-consent" | "member";

type AuthContextValue = {
  access: Access;
  session: Session | null;
  /** False when this build has no sign-in (it then runs as the demo). */
  canSignIn: boolean;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  acceptConsents(): Promise<void>;
  signOut(): Promise<void>;
  enterDemo(): void;
  leaveDemo(): void;
};

/** Outside a provider (most component tests) the app is the demo and there is no sign-in. */
const DEMO_ONLY: AuthContextValue = {
  access: "demo",
  session: null,
  canSignIn: false,
  sendCode: () => Promise.reject(new Error("no sign-in")),
  verifyCode: () => Promise.reject(new Error("no sign-in")),
  acceptConsents: () => Promise.reject(new Error("no sign-in")),
  signOut: () => Promise.resolve(),
  enterDemo: () => {},
  leaveDemo: () => {},
};

const AuthContext = createContext<AuthContextValue>(DEMO_ONLY);

const DEMO_KEY = "finous.demo";
const readDemo = () => {
  try {
    return localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
};
const writeDemo = (on: boolean) => {
  try {
    if (on) localStorage.setItem(DEMO_KEY, "1");
    else localStorage.removeItem(DEMO_KEY);
  } catch {
    // Nothing to remember it with; the demo then lasts until the page is closed.
  }
};

type Props = { client?: AuthClient | null; children: ReactNode };

/** Holds who is signed in and whether they have consented. `client` is for tests; the app uses the shared Supabase one. */
export function AuthProvider({ client: given, children }: Props) {
  const client = given === undefined ? sharedAuthClient() : given;
  const [session, setSession] = useState<Session | null | undefined>(client ? undefined : null);
  const [consented, setConsented] = useState<boolean | undefined>(undefined);
  const [demo, setDemo] = useState(readDemo);

  // Find the current session, then keep following sign-ins and sign-outs.
  useEffect(() => {
    if (!client) return;
    let live = true;
    void client.getSession().then((s) => live && setSession(s), () => live && setSession(null));
    const stop = client.onChange((s) => live && setSession(s));
    return () => {
      live = false;
      stop();
    };
  }, [client]);

  // Whenever the person changes, find out whether they have consented.
  useEffect(() => {
    if (!client || !session) {
      setConsented(undefined);
      return;
    }
    let live = true;
    setConsented(undefined);
    void client.hasConsents(session).then((ok) => live && setConsented(ok), () => live && setConsented(false));
    return () => {
      live = false;
    };
  }, [client, session]);

  const sendCode = useCallback((email: string) => (client ? client.sendCode(email) : Promise.reject(new Error("no sign-in in this build"))), [client]);
  const verifyCode = useCallback((email: string, code: string) => (client ? client.verifyCode(email, code) : Promise.reject(new Error("no sign-in in this build"))), [client]);

  const acceptConsents = useCallback(async () => {
    if (!client || !session) throw new Error("not signed in");
    await client.recordConsents(session);
    setConsented(true);
  }, [client, session]);

  const signOut = useCallback(async () => {
    writeDemo(false);
    setDemo(false);
    await client?.signOut();
    setSession(null);
  }, [client]);

  const enterDemo = useCallback(() => {
    writeDemo(true);
    setDemo(true);
  }, []);
  const leaveDemo = useCallback(() => {
    writeDemo(false);
    setDemo(false);
  }, []);

  const access: Access = !client
    ? "demo"
    : demo
      ? "demo"
      : session === undefined
        ? "loading"
        : session === null
          ? "needs-signin"
          : consented === undefined
            ? "loading"
            : consented
              ? "member"
              : "needs-consent";

  const value = useMemo<AuthContextValue>(
    () => ({ access, session: session ?? null, canSignIn: client !== null, sendCode, verifyCode, acceptConsents, signOut, enterDemo, leaveDemo }),
    [access, session, client, sendCode, verifyCode, acceptConsents, signOut, enterDemo, leaveDemo],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
