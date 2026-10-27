import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import type { Api, Account, Transaction } from "./types";

/**
 * The conformance suite for `Api`. Run it against any implementation: the mock today, the HTTP client against a
 * staging backend later. It checks what every backend must guarantee (shapes, reconciliation between endpoints,
 * ordering, errors, cancellation) and nothing persona-specific; that lives in persona.test.ts.
 */
export function describeApiContract(name: string, makeApi: () => Api): void {
  describe(`Api contract: ${name}`, () => {
    const accountsOf = async (api: Api): Promise<Account[]> => {
      const o = await api.listAccounts();
      return [...o.bank, ...o.loans, ...o.cards, ...o.investments];
    };

    describe("profile", () => {
      it("has a name, first name, city and email", async () => {
        const p = await makeApi().getProfile();
        for (const field of [p.id, p.name, p.firstName, p.city, p.email]) expect(field.trim()).not.toBe("");
        expect(p.name.startsWith(p.firstName)).toBe(true);
      });
    });

    describe("accounts", () => {
      it("gives every account a unique id", async () => {
        const ids = (await accountsOf(makeApi())).map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("groups accounts by kind", async () => {
        const o = await makeApi().listAccounts();
        expect(o.bank.every((a) => a.kind === "bank")).toBe(true);
        expect(o.loans.every((a) => a.kind === "loan")).toBe(true);
        expect(o.cards.every((a) => a.kind === "card")).toBe(true);
        expect(o.investments.every((a) => a.kind === "investment")).toBe(true);
      });

      it("returns each listed account, unchanged, by id", async () => {
        const api = makeApi();
        for (const account of await accountsOf(api)) expect(await api.getAccount(account.id)).toEqual(account);
      });

      it("rejects an unknown id with a not_found ApiError", async () => {
        await expect(makeApi().getAccount("no-such-account")).rejects.toMatchObject({ name: "ApiError", code: "not_found", status: 404 });
      });

      it("keeps balances sensible: whole rupees, never negative, card within limit, loan ends after it starts", async () => {
        const o = await makeApi().listAccounts();
        for (const a of o.bank) expect(Number.isInteger(a.balance) && a.balance >= 0).toBe(true);
        for (const l of o.loans) {
          expect(Number.isInteger(l.outstanding) && l.outstanding > 0).toBe(true);
          expect(l.endsOn > l.startedOn).toBe(true);
          expect(l.monthsLeft).toBeGreaterThan(0);
          expect(l.repaidPercent).toBeGreaterThanOrEqual(0);
          expect(l.repaidPercent).toBeLessThanOrEqual(100);
        }
        for (const c of o.cards) {
          expect(c.outstanding).toBeGreaterThanOrEqual(0);
          expect(c.outstanding).toBeLessThanOrEqual(c.limit);
          expect(c.minimumDue).toBeLessThanOrEqual(c.outstanding);
        }
        for (const i of o.investments) expect(i.value).toBeGreaterThanOrEqual(0);
      });
    });

    describe("transactions", () => {
      const key = (t: Transaction) => `${t.date} ${t.time ?? "00:00"}`;

      it("lists newest first", async () => {
        const { items } = await makeApi().listTransactions();
        for (let i = 1; i < items.length; i++) expect(key(items[i - 1]) >= key(items[i])).toBe(true);
      });

      it("has unique ids, whole non-zero rupee amounts, and only known accounts", async () => {
        const api = makeApi();
        const { items } = await api.listTransactions();
        const known = new Set((await accountsOf(api)).map((a) => a.id));
        expect(new Set(items.map((t) => t.id)).size).toBe(items.length);
        for (const t of items) {
          expect(Number.isInteger(t.amount) && t.amount !== 0).toBe(true);
          expect(known.has(t.accountId)).toBe(true);
        }
      });

      it("reports every match in `total`, even when `limit` trims the page", async () => {
        const api = makeApi();
        const all = await api.listTransactions();
        const page = await api.listTransactions({ limit: 2 });
        expect(page.items).toHaveLength(Math.min(2, all.total));
        expect(page.total).toBe(all.total);
        expect(page.items).toEqual(all.items.slice(0, 2));
      });

      it("searches the description, ignoring case and surrounding spaces", async () => {
        const api = makeApi();
        const all = await api.listTransactions();
        const word = all.items[0].description.split(" ")[0];
        const hits = await api.listTransactions({ search: `  ${word.toUpperCase()}  ` });
        expect(hits.total).toBeGreaterThan(0);
        for (const t of hits.items) expect(t.description.toLowerCase()).toContain(word.toLowerCase());
      });

      it("filters by account", async () => {
        const api = makeApi();
        const { items } = await api.listTransactions();
        const accountId = items[0].accountId;
        const mine = await api.listTransactions({ accountId });
        expect(mine.items.every((t) => t.accountId === accountId)).toBe(true);
        expect(mine.total).toBe(items.filter((t) => t.accountId === accountId).length);
      });

      it("returns an empty page, not an error, when nothing matches", async () => {
        expect(await makeApi().listTransactions({ search: "zzz-no-such-merchant" })).toEqual({ items: [], total: 0 });
      });

      it("treats a limit of zero as an empty page that still counts the matches", async () => {
        const page = await makeApi().listTransactions({ limit: 0 });
        expect(page.items).toEqual([]);
        expect(page.total).toBeGreaterThan(0);
      });
    });

    describe("net worth", () => {
      it("is assets minus liabilities", async () => {
        const n = await makeApi().getNetWorth();
        expect(n.value).toBe(n.assets - n.liabilities);
      });

      it("splits the assets into an allocation that adds up", async () => {
        const n = await makeApi().getNetWorth();
        expect(n.allocation.reduce((s, a) => s + a.amount, 0)).toBe(n.assets);
        const percent = n.allocation.reduce((s, a) => s + a.percent, 0);
        expect(Math.abs(percent - 100)).toBeLessThanOrEqual(1); // each share is rounded
      });
    });

    describe("cash flow", () => {
      it("saves income minus outflow", async () => {
        const c = await makeApi().getCashFlow();
        expect(c.saved).toBe(c.income - c.outflow);
      });

      it("accounts for all of the outflow across its categories", async () => {
        const c = await makeApi().getCashFlow();
        expect(c.categories.reduce((s, x) => s + x.amount, 0)).toBe(c.outflow);
        expect(new Set(c.categories.map((x) => x.category)).size).toBe(c.categories.length);
      });
    });

    describe("home", () => {
      it("agrees with the net worth endpoint", async () => {
        const api = makeApi();
        const [home, netWorth] = await Promise.all([api.getHome(), api.getNetWorth()]);
        expect(home.netWorth).toEqual({ value: netWorth.value, changeThisMonth: netWorth.changeThisMonth });
      });

      it("agrees with the cash flow endpoint", async () => {
        const api = makeApi();
        const [home, cashFlow] = await Promise.all([api.getHome(), api.getCashFlow()]);
        const { month, income, outflow, saved, savedChangeVsLastMonth } = cashFlow;
        expect(home.month).toEqual({ month, income, outflow, saved, savedChangeVsLastMonth });
      });

      it("only looks at insights the insights endpoint also returns", async () => {
        const api = makeApi();
        const [home, insights] = await Promise.all([api.getHome(), api.listInsights()]);
        expect(home.lookAt.length).toBeGreaterThan(0);
        for (const item of home.lookAt) expect(insights).toContainEqual(item);
      });
    });

    describe("insights", () => {
      it("has unique ids", async () => {
        const ids = (await makeApi().listInsights()).map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("refers to a loan that exists, and pays back a refinance in a positive number of months", async () => {
        const api = makeApi();
        const loanIds = (await api.listAccounts()).loans.map((l) => l.id);
        for (const insight of await api.listInsights()) {
          if (insight.kind !== "refinance") continue;
          expect(loanIds).toContain(insight.loanId);
          expect(insight.monthlySaving).toBeGreaterThan(0);
          expect(insight.breakEvenMonths).toBeGreaterThan(0);
          expect(Number.isFinite(insight.breakEvenMonths)).toBe(true);
        }
      });
    });

    describe("health score", () => {
      it("keeps the score within its range and every bar within 0 to 100", async () => {
        const h = await makeApi().getHealthScore();
        expect(h.score).toBeGreaterThanOrEqual(0);
        expect(h.score).toBeLessThanOrEqual(h.outOf);
        for (const c of h.components) {
          expect(c.score).toBeGreaterThanOrEqual(0);
          expect(c.score).toBeLessThanOrEqual(100);
          expect(Number.isFinite(c.value)).toBe(true);
        }
      });

      it("has the six components once each, and drags that are among them", async () => {
        const h = await makeApi().getHealthScore();
        const ids = h.components.map((c) => c.id);
        expect(ids).toHaveLength(6);
        expect(new Set(ids).size).toBe(6);
        for (const drag of h.drags) expect(ids).toContain(drag);
      });
    });

    describe("goals", () => {
      it("has unique ids and returns each goal, unchanged, by id", async () => {
        const api = makeApi();
        const goals = await api.listGoals();
        expect(new Set(goals.map((g) => g.id)).size).toBe(goals.length);
        for (const g of goals) expect(await api.getGoal(g.id)).toEqual(g);
      });

      it("rejects an unknown id with a not_found ApiError", async () => {
        await expect(makeApi().getGoal("no-such-goal")).rejects.toMatchObject({ code: "not_found", status: 404 });
      });

      it("reports percent funded as funded over target", async () => {
        for (const g of await makeApi().listGoals()) {
          expect(g.percentFunded).toBe(Math.round((g.fundedAmount / g.targetAmount) * 100));
          expect(g.fundedAmount).toBeGreaterThanOrEqual(0);
          expect(g.monthsRemaining).toBeGreaterThan(0);
          expect(g.monthlyNeeded).toBeGreaterThanOrEqual(0);
        }
      });

      it("adds up the contributions it lists to what is funded and what is paid monthly", async () => {
        for (const g of await makeApi().listGoals()) {
          if (!g.contributions) continue;
          expect(g.contributions.reduce((s, c) => s + c.currentValue, 0)).toBe(g.fundedAmount);
          const monthly = g.contributions.filter((c) => c.frequency === "monthly").reduce((s, c) => s + c.amount, 0);
          expect(g.currentMonthlyContribution).toBe(monthly);
        }
      });
    });

    describe("consents", () => {
      it("expires after it was granted, by its stated duration", async () => {
        for (const c of await makeApi().listConsents()) {
          expect(c.expiresOn > c.grantedOn).toBe(true);
          const [gy, gm] = c.grantedOn.split("-").map(Number);
          const [ey, em] = c.expiresOn.split("-").map(Number);
          expect((ey - gy) * 12 + (em - gm)).toBe(c.durationMonths);
          expect(c.refreshEveryHours).toBeGreaterThan(0);
        }
      });
    });

    describe("every call", () => {
      it("returns copies: changing a response never changes the next one", async () => {
        const api = makeApi();
        const first = await api.listAccounts();
        first.bank[0].balance = -1;
        first.bank.length = 0;
        const second = await api.listAccounts();
        expect(second.bank.length).toBeGreaterThan(0);
        expect(second.bank[0].balance).not.toBe(-1);
      });

      it("rejects with an AbortError when the request is already cancelled", async () => {
        const api = makeApi();
        const accountId = (await accountsOf(api))[0].id;
        const goalId = (await api.listGoals())[0].id;
        const controller = new AbortController();
        controller.abort();
        const { signal } = controller;
        const calls: [string, () => Promise<unknown>][] = [
          ["getProfile", () => api.getProfile({ signal })],
          ["getHome", () => api.getHome({ signal })],
          ["listAccounts", () => api.listAccounts({ signal })],
          ["getAccount", () => api.getAccount(accountId, { signal })],
          ["listTransactions", () => api.listTransactions({}, { signal })],
          ["getNetWorth", () => api.getNetWorth({ signal })],
          ["getCashFlow", () => api.getCashFlow({ signal })],
          ["listInsights", () => api.listInsights({ signal })],
          ["getHealthScore", () => api.getHealthScore({ signal })],
          ["listGoals", () => api.listGoals({ signal })],
          ["getGoal", () => api.getGoal(goalId, { signal })],
          ["listConsents", () => api.listConsents({ signal })],
        ];
        for (const [method, call] of calls) {
          await expect(call(), method).rejects.toMatchObject({ name: "AbortError" });
        }
      });

      it("fails with an ApiError, never a bare Error, for known failures", async () => {
        const error = await makeApi().getAccount("nope").catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ApiError);
      });
    });
  });
}
