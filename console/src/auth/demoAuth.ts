import type { Role } from "../lib/access";
import { AuthError, type AuthClient, type AuthErrorCode, type Session } from "./types";

type Person = { email: string; name: string; role: Role; label: string };

/** The people you can try the console as. One per role, so every "no access" screen can be reached. */
const PEOPLE: Person[] = [
  { email: "admin@demobank.example", name: "Meera Joshi", role: "admin", label: "Admin" },
  { email: "compliance@demobank.example", name: "Imran Shaikh", role: "compliance", label: "Compliance" },
  { email: "marketing@demobank.example", name: "Neha Patil", role: "marketing", label: "Marketing" },
  { email: "branch@demobank.example", name: "Suresh Pawar", role: "branch", label: "Branch" },
  { email: "readonly@demobank.example", name: "Kavita Rao", role: "readonly", label: "Read-only" },
];

const DEMO_CODE = "123456";
const SESSION_KEY = "console.demo.session";
const DEVICES_KEY = "console.demo.devices";

type Options = {
  /** Already signed in when the console opens. */
  session?: Session | null;
  /** Make the next call to a method fail with this error. */
  failNext?: Partial<Record<"startSignIn" | "verifySecondFactor" | "resendCode" | "signOut", AuthErrorCode>>;
};

const toSession = (p: Person): Session => ({ staffId: p.email, email: p.email, name: p.name, role: p.role, bank: "Demo Co-operative Bank" });

/** The demo person with this role, already signed in. For tests and for starting the console as someone. */
export const demoSession = (role: Role): Session => toSession(PEOPLE.find((p) => p.role === role)!);

function readList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * A stand-in for staff sign-in. Any password works for the five demo people, and the code is always 123456.
 * It keeps the session for the tab, and remembers devices when asked, so the second step is skipped next time.
 */
export function createDemoAuth(options: Options = {}): AuthClient & { calls: { sent: string[]; signedOut: number } } {
  const failures = { ...options.failNext };
  const listeners = new Set<(s: Session | null) => void>();
  const calls = { sent: [] as string[], signedOut: 0 };

  let session: Session | null = options.session ?? null;
  if (session === null && options.session === undefined) {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      const person = PEOPLE.find((p) => p.email === stored);
      if (person) session = toSession(person);
    } catch {
      // Storage can be blocked. Signing in again is fine.
    }
  }

  const maybeFail = (method: keyof typeof failures) => {
    const failure = failures[method];
    if (failure) {
      delete failures[method];
      throw new AuthError(failure);
    }
  };
  const personFor = (email: string) => PEOPLE.find((p) => p.email === email.trim().toLowerCase());
  const open = (person: Person) => {
    session = toSession(person);
    try {
      sessionStorage.setItem(SESSION_KEY, person.email);
    } catch {
      // Not remembered across reloads; the console still works.
    }
    listeners.forEach((l) => l(session));
  };

  return {
    calls,
    demo: { code: DEMO_CODE, people: PEOPLE.map(({ email, label }) => ({ email, label })) },

    getSession: async () => session,

    onChange(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    async startSignIn(email, password) {
      maybeFail("startSignIn");
      const person = personFor(email);
      if (!person || password === "") throw new AuthError("invalid_credentials");
      if (readList(DEVICES_KEY).includes(person.email)) {
        open(person);
        return "signed_in";
      }
      calls.sent.push(person.email);
      return "second_factor";
    },

    async verifySecondFactor(email, code, rememberDevice) {
      maybeFail("verifySecondFactor");
      const person = personFor(email);
      if (!person || code !== DEMO_CODE) throw new AuthError("invalid_code");
      if (rememberDevice) {
        try {
          localStorage.setItem(DEVICES_KEY, JSON.stringify([...new Set([...readList(DEVICES_KEY), person.email])]));
        } catch {
          // The device just isn't remembered.
        }
      }
      open(person);
    },

    async resendCode(email) {
      maybeFail("resendCode");
      calls.sent.push(email.trim().toLowerCase());
    },

    async signOut() {
      maybeFail("signOut");
      calls.signedOut += 1;
      session = null;
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // Nothing to clear.
      }
      listeners.forEach((l) => l(null));
    },
  };
}
