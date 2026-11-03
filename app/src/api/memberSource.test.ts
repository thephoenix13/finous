import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../auth/types";
import { createSupabaseMemberSource, toApiError, todayInIndia } from "./memberSource";

const session: Session = { userId: "u1", email: "alice@example.com" };

type Reply = { data: unknown[] | null; error: unknown };

/** A stand-in for the query builder: records each table asked for and answers from `tables`. */
function fakeSupabase(tables: Record<string, Reply> = {}, upsert: { error: unknown } = { error: null }) {
  const asked: { table: string; select?: string; filter?: [string, unknown] }[] = [];
  const upserts: { row: unknown; options: unknown }[] = [];
  const supabase = {
    from(table: string) {
      const entry: { table: string; select?: string; filter?: [string, unknown] } = { table };
      asked.push(entry);
      const reply = () => Promise.resolve(tables[table] ?? { data: [], error: null });
      const chain: Record<string, unknown> = {
        select(columns: string) {
          entry.select = columns;
          return chain;
        },
        eq(column: string, value: unknown) {
          entry.filter = [column, value];
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        then: (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) => reply().then(resolve, reject),
        upsert: async (row: unknown, options: unknown) => {
          upserts.push({ row, options });
          return upsert;
        },
      };
      return chain;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, asked, upserts };
}

afterEach(() => vi.restoreAllMocks());

describe("todayInIndia", () => {
  it("is the date in India, not in UTC", () => {
    // 20:00 UTC on 4 November is 01:30 on 5 November in India.
    expect(todayInIndia(new Date("2026-11-04T20:00:00Z"))).toBe("2026-11-05");
    expect(todayInIndia(new Date("2026-11-04T18:29:00Z"))).toBe("2026-11-04");
    expect(todayInIndia(new Date("2026-11-04T18:30:00Z"))).toBe("2026-11-05");
  });
});

describe("toApiError", () => {
  it.each([
    [{ status: 401 }, "unauthorized"],
    [{ status: 403 }, "unauthorized"],
    [{ code: "PGRST301" }, "unauthorized"],
    [{ message: "JWT expired" }, "unauthorized"],
    [{ status: 500 }, "unavailable"],
    [{ message: "network down" }, "unavailable"],
    [undefined, "unavailable"],
  ])("reads %j as %s", (error, code) => {
    expect(toApiError(error).code).toBe(code);
  });
});

describe("the Supabase member source", () => {
  it("asks for each of the member's tables, and only this person's profile", async () => {
    const { supabase, asked } = fakeSupabase();
    await createSupabaseMemberSource(supabase, session).load();
    expect(asked.map((a) => a.table).sort()).toEqual(["accounts", "goals", "market_rates", "monthly_figures", "net_worth_snapshots", "profiles", "tax_inputs", "transactions"]);
    expect(asked.find((a) => a.table === "profiles")!.filter).toEqual(["id", "u1"]);
  });

  it("turns the rows into the member's data, as of today in India", async () => {
    const { supabase } = fakeSupabase({
      profiles: { data: [{ first_name: "Alice", full_name: "Alice Roy", city: "Pune" }], error: null },
      accounts: { data: [{ id: "a1", kind: "bank", name: "HDFC", details: { last4: "4821", balance: 1000 } }], error: null },
      market_rates: { data: [{ key: "fd-12m", value: 7.1, as_of: "2026-11-01" }], error: null },
    });
    const input = await createSupabaseMemberSource(supabase, session, () => new Date("2026-11-04T20:00:00Z")).load();
    expect(input.asOf).toBe("2026-11-05");
    expect(input.profile).toEqual({ id: "u1", name: "Alice Roy", firstName: "Alice", city: "Pune", email: "alice@example.com" });
    expect(input.accounts).toEqual([{ kind: "bank", id: "a1", name: "HDFC", last4: "4821", balance: 1000 }]);
    expect(input.rates).toEqual({ fixedDeposit12m: 7.1, asOf: "2026-11-01" });
  });

  it("works for a member with no rows at all", async () => {
    const { supabase } = fakeSupabase();
    const input = await createSupabaseMemberSource(supabase, session).load();
    expect(input.accounts).toEqual([]);
    expect(input.profile.name).toBe("alice@example.com");
  });

  it("treats a null result as no rows", async () => {
    const { supabase } = fakeSupabase({ accounts: { data: null, error: null } });
    expect((await createSupabaseMemberSource(supabase, session).load()).accounts).toEqual([]);
  });

  it("leaves out a saved row it cannot read, and says so, instead of failing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { supabase } = fakeSupabase({
      accounts: {
        data: [
          { id: "a1", kind: "bank", name: "Good", details: { last4: "1111", balance: 5 } },
          { id: "a2", kind: "bank", name: "Broken", details: { last4: "x", balance: 5 } },
        ],
        error: null,
      },
    });
    const input = await createSupabaseMemberSource(supabase, session).load();
    expect(input.accounts.map((a) => a.id)).toEqual(["a1"]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("is 'unauthorized' when the sign-in has lapsed, and 'unavailable' for any other failure", async () => {
    const lapsed = fakeSupabase({ accounts: { data: null, error: { status: 401, message: "JWT expired" } } });
    await expect(createSupabaseMemberSource(lapsed.supabase, session).load()).rejects.toMatchObject({ name: "ApiError", code: "unauthorized" });
    const down = fakeSupabase({ goals: { data: null, error: { status: 500 } } });
    await expect(createSupabaseMemberSource(down.supabase, session).load()).rejects.toMatchObject({ name: "ApiError", code: "unavailable" });
  });

  it("records the day's net worth against this person, one row a day", async () => {
    const { supabase, upserts } = fakeSupabase();
    await createSupabaseMemberSource(supabase, session).saveSnapshot!("2026-11-05", 7_641_600);
    expect(upserts).toEqual([{ row: { user_id: "u1", taken_on: "2026-11-05", value: 7_641_600 }, options: { onConflict: "user_id,taken_on" } }]);
  });

  it("reports a failure to record it", async () => {
    const { supabase } = fakeSupabase({}, { error: { status: 500 } });
    await expect(createSupabaseMemberSource(supabase, session).saveSnapshot!("2026-11-05", 1)).rejects.toMatchObject({ code: "unavailable" });
  });
});
