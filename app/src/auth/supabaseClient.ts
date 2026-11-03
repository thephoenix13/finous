import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BETA_CONSENT_VERSION, PRIVACY_NOTICE_VERSION, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { AuthError, type AuthClient, type Session } from "./types";

type Failure = { status?: number; code?: string; message?: string; name?: string };

/** Turns whatever Supabase threw into one of our error codes. */
export function toAuthError(error: unknown): AuthError {
  const e = (error ?? {}) as Failure;
  if (e.status === 429 || e.code === "over_email_send_rate_limit" || e.code === "over_request_rate_limit") return new AuthError("rate_limited");
  if (e.code === "otp_expired" || e.code === "invalid_credentials" || (e.status === 400 && /token|otp|expired|invalid/i.test(e.message ?? ""))) return new AuthError("invalid_code");
  if (e.name === "AuthRetryableFetchError" || e.status === 0 || /fetch|network/i.test(e.message ?? "")) return new AuthError("network");
  return new AuthError("unknown");
}

const toSession = (s: { user: { id: string; email?: string | null } } | null): Session | null => (s ? { userId: s.user.id, email: s.user.email ?? "" } : null);

/** The sign-in client over a Supabase project. Takes the client so tests can hand it a stand-in. */
export function authClientFor(supabase: SupabaseClient): AuthClient {
  return {
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return toSession(data.session);
    },

    onChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(toSession(session)));
      return () => data.subscription.unsubscribe();
    },

    async sendCode(email) {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw toAuthError(error);
    },

    async verifyCode(email, code) {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw toAuthError(error);
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async hasConsents(session) {
      const { data, error } = await supabase.from("consents").select("kind, version").eq("user_id", session.userId);
      if (error) throw toAuthError(error);
      const has = (kind: string, version: string) => data.some((row) => row.kind === kind && row.version === version);
      return has("beta-trial", BETA_CONSENT_VERSION) && has("privacy-notice", PRIVACY_NOTICE_VERSION);
    },

    async recordConsents(session) {
      const rows = [
        { user_id: session.userId, kind: "beta-trial", version: BETA_CONSENT_VERSION },
        { user_id: session.userId, kind: "privacy-notice", version: PRIVACY_NOTICE_VERSION },
      ];
      for (const row of rows) {
        const { error } = await supabase.from("consents").insert(row);
        // 23505 is "already recorded": accepting twice is fine.
        if (error && error.code !== "23505") throw toAuthError(error);
      }
    },
  };
}

let shared: AuthClient | null | undefined;

/** The app's client, or null when this build has no Supabase settings (local work, tests): the app then runs as the demo only. */
export function sharedAuthClient(): AuthClient | null {
  if (shared === undefined) {
    shared = SUPABASE_URL && SUPABASE_ANON_KEY
      ? authClientFor(createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }))
      : null;
  }
  return shared;
}
