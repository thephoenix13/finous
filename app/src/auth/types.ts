/** Who is signed in. */
export type Session = { userId: string; email: string };

export type AuthErrorCode = "invalid_code" | "rate_limited" | "network" | "unknown";

/** Why a sign-in step failed, in terms the screen can word. Never carries the provider's raw message. */
export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
  }
}

/**
 * Everything the app needs from sign-in, so the screens do not know about Supabase and tests can use a fake.
 * Sign-in is by email code: `sendCode` mails a 6-digit code (creating the account on first use), `verifyCode` trades it for a session.
 */
export interface AuthClient {
  getSession(): Promise<Session | null>;
  /** Called whenever the person signs in or out, including from another tab. Returns a function that stops listening. */
  onChange(listener: (session: Session | null) => void): () => void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  /** Whether this person has accepted the current beta-trial terms and privacy notice. */
  hasConsents(session: Session): Promise<boolean>;
  /** Records acceptance of the current beta-trial terms and privacy notice. Safe to call twice. */
  recordConsents(session: Session): Promise<void>;
}
