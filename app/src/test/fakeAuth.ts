import { AuthError, type AuthClient, type AuthErrorCode, type Session } from "../auth/types";

type Options = {
  /** Already signed in when the app opens. */
  session?: Session | null;
  /** Has already accepted the beta terms. */
  consented?: boolean;
  /** The code that works. */
  code?: string;
  /** Make the next call to a method fail with this error. */
  failNext?: Partial<Record<"sendCode" | "verifyCode" | "recordConsents" | "signOut", AuthErrorCode>>;
};

export const ALICE: Session = { userId: "11111111-1111-1111-1111-111111111111", email: "alice@example.com" };

/** A stand-in for sign-in: remembers who is signed in, which codes were sent, and whether consent was recorded. */
export function createFakeAuth(options: Options = {}) {
  let session: Session | null = options.session ?? null;
  let consented = options.consented ?? false;
  const code = options.code ?? "123456";
  const failures = { ...options.failNext };
  const listeners = new Set<(s: Session | null) => void>();
  const calls = { sent: [] as string[], verified: [] as [string, string][], consentsRecorded: 0, signedOut: 0 };

  const maybeFail = (method: keyof typeof failures) => {
    const failure = failures[method];
    if (failure) {
      delete failures[method];
      throw new AuthError(failure);
    }
  };
  const emit = () => listeners.forEach((l) => l(session));

  const client: AuthClient = {
    getSession: async () => session,
    onChange(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async sendCode(email) {
      maybeFail("sendCode");
      calls.sent.push(email);
    },
    async verifyCode(email, given) {
      maybeFail("verifyCode");
      calls.verified.push([email, given]);
      if (given !== code) throw new AuthError("invalid_code");
      session = { userId: ALICE.userId, email };
      emit();
    },
    async signOut() {
      maybeFail("signOut");
      calls.signedOut += 1;
      session = null;
      emit();
    },
    hasConsents: async () => consented,
    async recordConsents() {
      maybeFail("recordConsents");
      calls.consentsRecorded += 1;
      consented = true;
    },
  };
  return { client, calls, isConsented: () => consented, currentSession: () => session };
}
