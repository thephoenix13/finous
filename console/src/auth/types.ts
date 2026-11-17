import type { Role } from "../lib/access";

export type Session = { staffId: string; email: string; name: string; role: Role; bank: string };

export type AuthErrorCode = "invalid_credentials" | "invalid_code" | "unavailable";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
    this.code = code;
  }
}

/** After the first step: a second factor is still needed, or this device is remembered and they are in. */
export type SignInStep = "second_factor" | "signed_in";

/** What the console needs from sign-in. A demo today, the bank's identity provider and Finous's auth later. */
export type AuthClient = {
  getSession(): Promise<Session | null>;
  onChange(listener: (session: Session | null) => void): () => void;
  /** First factor: work email and password. */
  startSignIn(email: string, password: string): Promise<SignInStep>;
  /** Second factor: the code sent to their email. `rememberDevice` skips it next time on this device. */
  verifySecondFactor(email: string, code: string, rememberDevice: boolean): Promise<void>;
  resendCode(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Only the demo has this: who you can sign in as and the code that works. Real sign-in never shows it. */
  demo?: { code: string; people: { email: string; label: string }[] };
};
