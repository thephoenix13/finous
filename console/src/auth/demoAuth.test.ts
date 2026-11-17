import { describe, expect, it } from "vitest";
import { createDemoAuth, demoSession } from "./demoAuth";
import { AuthError } from "./types";

describe("demo auth", () => {
  it("offers one demo person per role", async () => {
    const auth = createDemoAuth();
    expect(auth.demo?.people.map((p) => p.label)).toEqual(["Admin", "Compliance", "Marketing", "Branch", "Read-only"]);
    expect(demoSession("branch")).toMatchObject({ role: "branch", email: "branch@demobank.example" });
  });

  it("asks for a second factor after the first, then signs in with the right code", async () => {
    const auth = createDemoAuth();
    expect(await auth.getSession()).toBeNull();
    expect(await auth.startSignIn("Admin@DemoBank.example", "anything")).toBe("second_factor");
    expect(await auth.getSession()).toBeNull();
    await auth.verifySecondFactor("admin@demobank.example", "123456", false);
    expect(await auth.getSession()).toMatchObject({ role: "admin", name: "Meera Joshi" });
  });

  it("refuses an unknown email or an empty password, without saying which was wrong", async () => {
    const auth = createDemoAuth();
    await expect(auth.startSignIn("who@nowhere.example", "x")).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(auth.startSignIn("admin@demobank.example", "")).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("refuses a wrong code and stays signed out", async () => {
    const auth = createDemoAuth();
    await auth.startSignIn("admin@demobank.example", "x");
    await expect(auth.verifySecondFactor("admin@demobank.example", "000000", false)).rejects.toBeInstanceOf(AuthError);
    expect(await auth.getSession()).toBeNull();
  });

  it("skips the second factor on a device that was remembered, and only that person's", async () => {
    const first = createDemoAuth();
    await first.startSignIn("admin@demobank.example", "x");
    await first.verifySecondFactor("admin@demobank.example", "123456", true);

    const again = createDemoAuth({ session: null });
    expect(await again.startSignIn("admin@demobank.example", "x")).toBe("signed_in");
    expect(await again.getSession()).not.toBeNull();

    const other = createDemoAuth({ session: null });
    expect(await other.startSignIn("branch@demobank.example", "x")).toBe("second_factor");
  });

  it("does not remember a device that was not asked to be", async () => {
    const first = createDemoAuth();
    await first.startSignIn("admin@demobank.example", "x");
    await first.verifySecondFactor("admin@demobank.example", "123456", false);
    expect(await createDemoAuth({ session: null }).startSignIn("admin@demobank.example", "x")).toBe("second_factor");
  });

  it("tells listeners when someone signs in and out, and stops when they unsubscribe", async () => {
    const auth = createDemoAuth();
    const seen: (string | null)[] = [];
    const stop = auth.onChange((s) => seen.push(s?.role ?? null));
    await auth.startSignIn("marketing@demobank.example", "x");
    await auth.verifySecondFactor("marketing@demobank.example", "123456", false);
    await auth.signOut();
    stop();
    await auth.startSignIn("marketing@demobank.example", "x");
    await auth.verifySecondFactor("marketing@demobank.example", "123456", false);
    expect(seen).toEqual(["marketing", null]);
    expect(auth.calls.signedOut).toBe(1);
  });

  it("resends a code to the address, in lower case", async () => {
    const auth = createDemoAuth();
    await auth.resendCode(" Admin@DemoBank.example");
    expect(auth.calls.sent).toEqual(["admin@demobank.example"]);
  });

  it("fails the next call to a method once, when told to", async () => {
    const auth = createDemoAuth({ failNext: { startSignIn: "unavailable" } });
    await expect(auth.startSignIn("admin@demobank.example", "x")).rejects.toMatchObject({ code: "unavailable" });
    expect(await auth.startSignIn("admin@demobank.example", "x")).toBe("second_factor");
  });

  it("keeps the session for the tab, and clears it on sign out", async () => {
    const auth = createDemoAuth();
    await auth.startSignIn("admin@demobank.example", "x");
    await auth.verifySecondFactor("admin@demobank.example", "123456", false);
    expect(await createDemoAuth().getSession()).toMatchObject({ role: "admin" });
    await auth.signOut();
    expect(await createDemoAuth().getSession()).toBeNull();
  });
});
