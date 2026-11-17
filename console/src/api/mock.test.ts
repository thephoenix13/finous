import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { createMockConsoleApi } from "./mock";

describe("mock console api", () => {
  it("serves a demo bank with figures, and a new bank with none", async () => {
    const demo = createMockConsoleApi({ bank: "demo" });
    const fresh = createMockConsoleApi({ bank: "new" });
    expect(demo.demo).toBe(true);
    expect(fresh.demo).toBe(false);
    expect((await demo.overview()).signUps).toBeGreaterThan(0);
    const empty = await fresh.overview();
    expect(empty).toMatchObject({ signUps: 0, activeThisMonth: 0, sharingPercent: null, advisorQuestions: 0 });
  });

  it("hands out copies, so a caller can't change the store by editing what it got", async () => {
    const api = createMockConsoleApi();
    const first = await api.branding();
    first.name = "Changed";
    expect((await api.branding()).name).toBe("Demo Co-operative Bank");
    const staff = await api.staff();
    staff.members[0].role = "readonly";
    expect((await api.staff()).members[0].role).toBe("admin");
  });

  it("remembers saves, and the new bank's launch steps tick off as they are done", async () => {
    const api = createMockConsoleApi({ bank: "new" });
    expect((await api.overview()).launch.every((s) => !s.done)).toBe(true);

    await api.saveBranding({ ...(await api.branding()), name: "Our Bank" });
    await api.saveAddress({ subdomain: "our-bank", installName: "Our Bank" });
    await api.saveLanguages({ english: true, hindi: false, advisor: "off" });
    await api.inviteStaff({ email: "x@y.example", role: "marketing", branch: null });

    const launch = (await api.overview()).launch;
    expect(launch.map((s) => s.done)).toEqual([true, true, true, true]);
    expect((await api.overview()).bankName).toBe("Our Bank");
    expect(api.saved.branding).toHaveLength(1);
    expect((await api.address()).subdomain).toBe("our-bank");
    expect(await api.languages()).toEqual({ english: true, hindi: false, advisor: "off" });
  });

  it("keeps each launch step to its own save", async () => {
    const api = createMockConsoleApi({ bank: "new" });
    await api.saveAddress({ subdomain: "only-this", installName: "Only" });
    expect((await api.overview()).launch.map((s) => s.done)).toEqual([false, true, false, false]);
  });

  it("treats the address the bank already holds as free to it, and another bank's as taken", async () => {
    const api = createMockConsoleApi();
    expect(await api.addressAvailable("demo-coop")).toBe(true);
    expect(await api.addressAvailable("brand-new")).toBe(true);
    expect(await api.addressAvailable("alpha-bank")).toBe(false);
    await expect(api.saveAddress({ subdomain: "alpha-bank", installName: "Alpha" })).rejects.toMatchObject({ code: "conflict" });
    expect((await api.address()).subdomain).toBe("demo-coop");
  });

  it("invites a person as Invited, and refuses someone who already has access", async () => {
    const api = createMockConsoleApi();
    const invited = await api.inviteStaff({ email: "  New@Demobank.Example ", role: "branch", branch: "Main branch" });
    expect(invited).toMatchObject({ email: "new@demobank.example", status: "invited", name: null, lastActive: null, role: "branch" });
    expect((await api.staff()).members.at(-1)?.email).toBe("new@demobank.example");
    await expect(api.inviteStaff({ email: "NEW@demobank.example", role: "branch", branch: null })).rejects.toBeInstanceOf(ApiError);
    await expect(api.inviteStaff({ email: "admin@demobank.example", role: "readonly", branch: null })).rejects.toMatchObject({ code: "conflict" });
  });

  it("numbers tickets in order and remembers what was asked", async () => {
    const api = createMockConsoleApi();
    expect(await api.raiseTicket({ topic: "question", subject: "a", message: "b" })).toEqual({ id: "T-1001" });
    expect(await api.raiseTicket({ topic: "problem", subject: "c", message: "d" })).toEqual({ id: "T-1002" });
    expect(api.saved.tickets.map((t) => t.subject)).toEqual(["a", "c"]);
  });

  it("fails the next call to a method only once, with the code you give", async () => {
    const api = createMockConsoleApi();
    api.failNext("overview", "unavailable");
    await expect(api.overview()).rejects.toMatchObject({ code: "unavailable", status: 503 });
    await expect(api.overview()).resolves.toBeDefined();

    api.failNext("saveBranding");
    await expect(api.saveBranding(await api.branding())).rejects.toMatchObject({ code: "unavailable" });
    expect(api.saved.branding).toHaveLength(0);
    await expect(api.saveBranding(await api.branding())).resolves.toBeUndefined();
  });

  it("rejects a cancelled read with an AbortError, before and after the wait", async () => {
    const api = createMockConsoleApi();
    const before = new AbortController();
    before.abort();
    await expect(api.overview({ signal: before.signal })).rejects.toMatchObject({ name: "AbortError" });

    const during = new AbortController();
    const pending = api.overview({ signal: during.signal });
    during.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("lists the compliance documents, with at most the privacy notice dated", async () => {
    const docs = await createMockConsoleApi().documents();
    expect(docs.map((d) => d.id)).toEqual(["dpa", "security", "privacy"]);
    expect(docs.filter((d) => d.date !== null).map((d) => d.id)).toEqual(["privacy"]);
  });
});
