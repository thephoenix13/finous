import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "../auth/types";
import { emptyMember } from "../derive/fixture";
import { createSupabaseMemberData, firstNameOf } from "./memberData";

const session: Session = { userId: "u1", email: "alice@example.com" };

type Call = { table: string; op: string; payload?: unknown; options?: unknown; filter?: [string, unknown] };

/** A stand-in for the query builder that records each write and answers with `error`. */
function fakeSupabase(error: unknown = null) {
  const calls: Call[] = [];
  const supabase = {
    from(table: string) {
      const call: Call = { table, op: "" };
      const done = () => {
        calls.push(call);
        return Promise.resolve({ error });
      };
      const chain = {
        insert(payload: unknown) {
          Object.assign(call, { op: "insert", payload });
          return done();
        },
        upsert(payload: unknown, options: unknown) {
          Object.assign(call, { op: "upsert", payload, options });
          return done();
        },
        update(payload: unknown) {
          Object.assign(call, { op: "update", payload });
          return chain;
        },
        delete() {
          call.op = "delete";
          return chain;
        },
        eq(column: string, value: unknown) {
          call.filter = [column, value];
          return done();
        },
      };
      return chain;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, calls };
}

const make = (error?: unknown) => {
  const { supabase, calls } = fakeSupabase(error);
  const changed = vi.fn();
  const data = createSupabaseMemberData(supabase, session, async () => emptyMember(), changed);
  return { data, calls, changed };
};

describe("the Supabase member writer", () => {
  it("saves a month by user and month, replacing it if it is already there", async () => {
    const { data, calls } = make();
    await data.saveMonthly({ month: "2026-11", income: 100, rent: 1, food: 2, other: 3, sips: 4 });
    expect(calls).toEqual([
      { table: "monthly_figures", op: "upsert", payload: { user_id: "u1", month: "2026-11", income: 100, rent: 1, food: 2, other: 3, sips: 4 }, options: { onConflict: "user_id,month" } },
    ]);
  });

  it("adds a new account as a manual one for this user, with its details", async () => {
    const { data, calls } = make();
    await data.saveAccount({ kind: "bank", name: " HDFC ", last4: "4821", balance: 5000 });
    expect(calls).toEqual([{ table: "accounts", op: "insert", payload: { user_id: "u1", kind: "bank", name: "HDFC", details: { last4: "4821", balance: 5000 }, source: "manual" } }]);
  });

  it("edits an existing account by id, changing the name and details but never the kind", async () => {
    const { data, calls } = make();
    await data.saveAccount({ id: "a1", kind: "bank", name: "HDFC", last4: "4821", balance: 6000 });
    expect(calls).toEqual([{ table: "accounts", op: "update", payload: { name: "HDFC", details: { last4: "4821", balance: 6000 } }, filter: ["id", "a1"] }]);
  });

  it("deletes an account and a goal by id", async () => {
    const { data, calls } = make();
    await data.deleteAccount("a1");
    await data.deleteGoal("g1");
    expect(calls).toEqual([
      { table: "accounts", op: "delete", filter: ["id", "a1"] },
      { table: "goals", op: "delete", filter: ["id", "g1"] },
    ]);
  });

  it("adds and edits goals, with the month as a date", async () => {
    const { data, calls } = make();
    const goal = { name: "Car", targetAmount: 600000, fundedAmount: 0, targetDate: "2028-03", assumedReturnPercent: 6 };
    await data.saveGoal(goal);
    await data.saveGoal({ ...goal, id: "g1" });
    const row = { name: "Car", target_amount: 600000, funded_amount: 0, target_date: "2028-03-01", assumed_return_percent: 6 };
    expect(calls).toEqual([
      { table: "goals", op: "insert", payload: { user_id: "u1", ...row } },
      { table: "goals", op: "update", payload: row, filter: ["id", "g1"] },
    ]);
  });

  it("saves tax inputs for one financial year", async () => {
    const { data, calls } = make();
    await data.saveTax("2026-27", { slabPercent: 30, ppf: 1, elss: 2, lifeInsurance: 3, health80D: 4, homeLoanInterestPaid: 5 });
    expect(calls[0]).toMatchObject({
      table: "tax_inputs",
      op: "upsert",
      payload: { user_id: "u1", financial_year: "2026-27", inputs: { slabPercent: 30, ppf: 1, elss: 2, lifeInsurance: 3, health80D: 4, homeLoanInterestPaid: 5 } },
      options: { onConflict: "user_id,financial_year" },
    });
  });

  it("saves the name with its first word as the first name, and a blank city as nothing", async () => {
    const { data, calls } = make();
    await data.saveProfile({ fullName: "  Aarav  Mehta ", city: "  " });
    expect(calls).toEqual([{ table: "profiles", op: "update", payload: { full_name: "Aarav  Mehta", first_name: "Aarav", city: null }, filter: ["id", "u1"] }]);
  });

  it("tells the screens their answers are out of date after every successful write, and not otherwise", async () => {
    const ok = make();
    await ok.data.saveMonthly({ month: "2026-11", income: 1, rent: 0, food: 0, other: 0, sips: 0 });
    await ok.data.deleteAccount("a");
    expect(ok.changed).toHaveBeenCalledTimes(2);

    const bad = make({ status: 500 });
    await expect(bad.data.saveAccount({ kind: "bank", name: "x", last4: "1234", balance: 1 })).rejects.toMatchObject({ code: "unavailable" });
    expect(bad.changed).not.toHaveBeenCalled();
  });

  it("says unauthorized when the sign-in has expired", async () => {
    const { data } = make({ status: 401 });
    await expect(data.deleteGoal("g")).rejects.toMatchObject({ code: "unauthorized" });
  });
});

describe("firstNameOf", () => {
  it("is the first word, trimmed", () => {
    expect(firstNameOf("  Aarav Mehta")).toBe("Aarav");
    expect(firstNameOf("Aarav")).toBe("Aarav");
    expect(firstNameOf("   ")).toBe("");
  });
});
