import { describe, expect, it, vi } from "vitest";
import { aaravInput, emptyMember } from "../derive/fixture";
import type { MemberInput } from "../derive/types";
import { describeApiContract } from "./contract.suite";
import { createMemberApi, type MemberSource } from "./member";

const fixed = (input: MemberInput): MemberSource => ({ load: async () => input });

// The same checks the demo passes: shapes, reconciliation between endpoints, ordering, errors, cancellation.
describeApiContract("member (Aarav's data)", () => createMemberApi(fixed(aaravInput())));

describe("a member's Api", () => {
  it("answers from the member's own data", async () => {
    const api = createMemberApi(fixed(aaravInput()));
    expect((await api.getNetWorth()).value).toBe(7_641_600);
    expect((await api.getCashFlow()).saved).toBe(53_600);
    expect((await api.listAccounts()).bank.map((b) => b.name)).toEqual(["HDFC Bank", "State Bank of India"]);
  });

  it("lists no Account Aggregator consents yet", async () => {
    expect(await createMemberApi(fixed(aaravInput())).listConsents()).toEqual([]);
  });

  describe("a brand-new member", () => {
    const api = () => createMemberApi(fixed(emptyMember()));

    it("has quiet, valid answers where there is nothing", async () => {
      expect((await api().getNetWorth()).value).toBe(0);
      expect((await api().listAccounts()).bank).toEqual([]);
      expect(await api().listInsights()).toEqual([]);
      expect(await api().listGoals()).toEqual([]);
      expect(await api().listTransactions()).toEqual({ items: [], total: 0 });
      expect((await api().getHome()).month).toBeUndefined();
    });

    it("says 'no_data', not zero, for a cash flow and a health score that cannot be worked out yet", async () => {
      await expect(api().getCashFlow()).rejects.toMatchObject({ name: "ApiError", code: "no_data", status: 404 });
      await expect(api().getHealthScore()).rejects.toMatchObject({ name: "ApiError", code: "no_data" });
    });

    it("says not_found for an account or goal that does not exist", async () => {
      await expect(api().getAccount("x")).rejects.toMatchObject({ code: "not_found" });
      await expect(api().getGoal("x")).rejects.toMatchObject({ code: "not_found" });
    });

    it("still gives a tax summary, empty, for the current year", async () => {
      expect(await api().getTaxSummary()).toMatchObject({ financialYear: "2026-27", slabPercent: 0, section80C: { used: 0 } });
    });
  });

  describe("reading the data", () => {
    it("reads once for calls that arrive together, as a screen's several calls do", async () => {
      const load = vi.fn(async () => aaravInput());
      const api = createMemberApi({ load });
      await Promise.all([api.getHome(), api.getProfile(), api.listAccounts(), api.getHealthScore()]);
      expect(load).toHaveBeenCalledTimes(1);
    });

    it("reads again once the short time is up, and on invalidate", async () => {
      const load = vi.fn(async () => aaravInput());
      let t = 0;
      const api = createMemberApi({ load }, { ttlMs: 1_000, now: () => t });
      await api.getHome();
      t = 999;
      await api.getHome();
      expect(load).toHaveBeenCalledTimes(1);
      t = 1_000;
      await api.getHome();
      expect(load).toHaveBeenCalledTimes(2);
      api.invalidate();
      await api.getHome();
      expect(load).toHaveBeenCalledTimes(3);
    });

    it("shows a change straight away after invalidate", async () => {
      let input = aaravInput();
      const api = createMemberApi({ load: async () => input });
      expect((await api.getNetWorth()).value).toBe(7_641_600);
      input = aaravInput({ accounts: input.accounts.filter((a) => a.kind !== "other") });
      expect((await api.getNetWorth()).value).toBe(7_641_600);
      api.invalidate();
      expect((await api.getNetWorth()).value).toBe(7_641_600 - 9_500_000);
    });

    it("does not remember a failed read: the next call tries again", async () => {
      const load = vi.fn<MemberSource["load"]>().mockRejectedValueOnce(new Error("down")).mockResolvedValue(aaravInput());
      const api = createMemberApi({ load });
      await expect(api.getHome()).rejects.toThrow("down");
      expect((await api.getHome()).netWorth.value).toBe(7_641_600);
      expect(load).toHaveBeenCalledTimes(2);
    });

    it("hands each caller its own copy", async () => {
      const api = createMemberApi(fixed(aaravInput()));
      const first = await api.listAccounts();
      first.bank[0].balance = 1;
      expect((await api.listAccounts()).bank[0].balance).toBe(284_000);
    });

    it("stops with an AbortError if the caller cancelled, before or during the read", async () => {
      const api = createMemberApi(fixed(aaravInput()));
      const done = new AbortController();
      done.abort();
      await expect(api.getHome({ signal: done.signal })).rejects.toMatchObject({ name: "AbortError" });
      const during = new AbortController();
      const slow = createMemberApi({ load: () => new Promise((resolve) => setTimeout(() => resolve(aaravInput()), 10)) });
      const pending = slow.getHome({ signal: during.signal });
      during.abort();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    });
  });

  describe("recording net worth", () => {
    it("notes today's net worth once, when there are accounts to count", async () => {
      const saveSnapshot = vi.fn(async () => {});
      const api = createMemberApi({ load: async () => aaravInput(), saveSnapshot }, { ttlMs: 0 });
      await api.getHome();
      await api.getHome();
      await api.getNetWorth();
      expect(saveSnapshot).toHaveBeenCalledTimes(1);
      expect(saveSnapshot).toHaveBeenCalledWith("2026-09-29", 7_641_600);
    });

    it("notes it again when the value changes the same day", async () => {
      const saveSnapshot = vi.fn(async () => {});
      let input = aaravInput();
      const api = createMemberApi({ load: async () => input, saveSnapshot }, { ttlMs: 0 });
      await api.getHome();
      input = aaravInput({ accounts: input.accounts.filter((a) => a.kind !== "other") });
      await api.getHome();
      expect(saveSnapshot.mock.calls.map((c) => (c as unknown as [string, number])[1])).toEqual([7_641_600, -1_858_400]);
    });

    it("notes nothing for a member with no accounts, and never lets a failed save break the screen", async () => {
      const saveSnapshot = vi.fn(async () => {});
      await createMemberApi({ load: async () => emptyMember(), saveSnapshot }).getHome();
      expect(saveSnapshot).not.toHaveBeenCalled();

      const failing = vi.fn(async () => {
        throw new Error("offline");
      });
      const api = createMemberApi({ load: async () => aaravInput(), saveSnapshot: failing }, { ttlMs: 0 });
      await expect(api.getHome()).resolves.toBeDefined();
      await new Promise((r) => setTimeout(r, 0));
      await api.getHome();
      expect(failing).toHaveBeenCalledTimes(2); // tried again on the next read
    });

    it("works with a source that cannot save", async () => {
      await expect(createMemberApi(fixed(aaravInput())).getHome()).resolves.toBeDefined();
    });
  });
});
