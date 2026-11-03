import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { BETA_CONSENT_VERSION, PRIVACY_NOTICE_VERSION } from "../config";
import { authClientFor, toAuthError } from "./supabaseClient";
import { AuthError, type Session } from "./types";

const session: Session = { userId: "u1", email: "a@example.com" };

/** A stand-in for the pieces of supabase-js the client touches. */
function fakeSupabase(over: { otp?: unknown; verify?: unknown; select?: { data: unknown; error: unknown }; insert?: (row: unknown) => { error: unknown } } = {}) {
  const inserted: unknown[] = [];
  const listeners: ((e: string, s: unknown) => void)[] = [];
  const unsubscribe = vi.fn();
  const supabase = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: "u1", email: "a@example.com" } } } })),
      onAuthStateChange: vi.fn((cb: (e: string, s: unknown) => void) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe } } };
      }),
      signInWithOtp: vi.fn(async () => ({ error: over.otp ?? null })),
      verifyOtp: vi.fn(async () => ({ error: over.verify ?? null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => ({
      select: () => ({ eq: async () => over.select ?? { data: [], error: null } }),
      insert: async (row: unknown) => {
        inserted.push(row);
        return over.insert ? over.insert(row) : { error: null };
      },
    })),
  };
  return { supabase: supabase as unknown as SupabaseClient, mocks: supabase, inserted, listeners, unsubscribe };
}

describe("toAuthError", () => {
  it.each([
    [{ status: 429 }, "rate_limited"],
    [{ code: "over_email_send_rate_limit" }, "rate_limited"],
    [{ code: "otp_expired" }, "invalid_code"],
    [{ status: 400, message: "Token has expired or is invalid" }, "invalid_code"],
    [{ name: "AuthRetryableFetchError" }, "network"],
    [{ message: "Failed to fetch" }, "network"],
    [{ status: 500, message: "boom" }, "unknown"],
    [undefined, "unknown"],
  ] as const)("reads %j as %s", (error, code) => {
    expect(toAuthError(error)).toBeInstanceOf(AuthError);
    expect(toAuthError(error).code).toBe(code);
  });

  it("never carries the provider's own message", () => {
    expect(toAuthError({ status: 500, message: "secret internals" }).message).toBe("unknown");
  });
});

describe("the Supabase auth client", () => {
  it("maps a session to the user's id and email", async () => {
    expect(await authClientFor(fakeSupabase().supabase).getSession()).toEqual(session);
  });

  it("sends the code asking for the account to be created on first use", async () => {
    const { supabase, mocks } = fakeSupabase();
    await authClientFor(supabase).sendCode("a@example.com");
    expect(mocks.auth.signInWithOtp).toHaveBeenCalledWith({ email: "a@example.com", options: { shouldCreateUser: true } });
  });

  it("verifies the code as an email code", async () => {
    const { supabase, mocks } = fakeSupabase();
    await authClientFor(supabase).verifyCode("a@example.com", "123456");
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ email: "a@example.com", token: "123456", type: "email" });
  });

  it("turns provider failures into our error codes", async () => {
    await expect(authClientFor(fakeSupabase({ otp: { status: 429 } }).supabase).sendCode("a@example.com")).rejects.toMatchObject({ code: "rate_limited" });
    await expect(authClientFor(fakeSupabase({ verify: { code: "otp_expired" } }).supabase).verifyCode("a@example.com", "000000")).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("passes session changes on and can stop listening", async () => {
    const { supabase, listeners, unsubscribe } = fakeSupabase();
    const seen: (Session | null)[] = [];
    const stop = authClientFor(supabase).onChange((s) => seen.push(s));
    listeners[0]("SIGNED_IN", { user: { id: "u2", email: "b@example.com" } });
    listeners[0]("SIGNED_OUT", null);
    expect(seen).toEqual([{ userId: "u2", email: "b@example.com" }, null]);
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("signs out", async () => {
    const { supabase, mocks } = fakeSupabase();
    await authClientFor(supabase).signOut();
    expect(mocks.auth.signOut).toHaveBeenCalled();
  });
});

describe("consents", () => {
  const rows = (...pairs: [string, string][]) => ({ data: pairs.map(([kind, version]) => ({ kind, version })), error: null });

  it("count only when both the beta terms and the privacy notice are recorded at the current versions", async () => {
    const both = rows(["beta-trial", BETA_CONSENT_VERSION], ["privacy-notice", PRIVACY_NOTICE_VERSION]);
    expect(await authClientFor(fakeSupabase({ select: both }).supabase).hasConsents(session)).toBe(true);
    expect(await authClientFor(fakeSupabase({ select: rows(["beta-trial", BETA_CONSENT_VERSION]) }).supabase).hasConsents(session)).toBe(false);
    expect(await authClientFor(fakeSupabase({ select: rows(["privacy-notice", PRIVACY_NOTICE_VERSION]) }).supabase).hasConsents(session)).toBe(false);
    expect(await authClientFor(fakeSupabase().supabase).hasConsents(session)).toBe(false);
  });

  it("do not count when only an older version was accepted, so changed wording asks again", async () => {
    const old = rows(["beta-trial", "2020-01-old"], ["privacy-notice", "2020-01-old"]);
    expect(await authClientFor(fakeSupabase({ select: old }).supabase).hasConsents(session)).toBe(false);
  });

  it("are recorded for this user, both kinds, at the current versions", async () => {
    const { supabase, inserted } = fakeSupabase();
    await authClientFor(supabase).recordConsents(session);
    expect(inserted).toEqual([
      { user_id: "u1", kind: "beta-trial", version: BETA_CONSENT_VERSION },
      { user_id: "u1", kind: "privacy-notice", version: PRIVACY_NOTICE_VERSION },
    ]);
  });

  it("accepting twice is fine: 'already recorded' is not an error", async () => {
    const { supabase } = fakeSupabase({ insert: () => ({ error: { code: "23505" } }) });
    await expect(authClientFor(supabase).recordConsents(session)).resolves.toBeUndefined();
  });

  it("any other failure to record is an error", async () => {
    const { supabase } = fakeSupabase({ insert: () => ({ error: { status: 500 } }) });
    await expect(authClientFor(supabase).recordConsents(session)).rejects.toBeInstanceOf(AuthError);
  });

  it("a failure to read them is an error, not 'no consent'", async () => {
    const { supabase } = fakeSupabase({ select: { data: null, error: { status: 500 } } });
    await expect(authClientFor(supabase).hasConsents(session)).rejects.toBeInstanceOf(AuthError);
  });
});
