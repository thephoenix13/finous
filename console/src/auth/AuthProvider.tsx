import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthClient, Session } from "./types";

export type AuthState = { status: "loading" } | { status: "signed_out" } | { status: "signed_in"; session: Session };

type AuthContextValue = {
  client: AuthClient;
  state: AuthState;
  /** The email waiting for its second factor, between the two sign-in screens. */
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Keeps the signed-in staff member for every screen below it, and follows sign-in and sign-out as they happen. */
export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const apply = (session: Session | null) => setState(session ? { status: "signed_in", session } : { status: "signed_out" });
    client.getSession().then(
      (session) => live && apply(session),
      () => live && apply(null),
    );
    const stop = client.onChange((session) => {
      if (live) {
        apply(session);
        if (session) setPendingEmail(null);
      }
    });
    return () => {
      live = false;
      stop();
    };
  }, [client]);

  const value = useMemo(() => ({ client, state, pendingEmail, setPendingEmail }), [client, state, pendingEmail]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

/** The signed-in staff member. Only call this below the sign-in guard. */
export function useSession(): Session {
  const { state } = useAuth();
  if (state.status !== "signed_in") throw new Error("useSession was called with nobody signed in");
  return state.session;
}
