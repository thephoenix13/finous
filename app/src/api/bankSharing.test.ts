import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { createSupabaseBankSharing } from "./bankSharing";

type Result = { data?: unknown; error?: unknown };

/** A stand-in for Supabase: records the query made on bank_sharing_events and the functions called, in order. */
function fake({ rows = { data: [] } as Result, rpc = {} as Record<string, Result> } = {}) {
  const log: string[] = [];
  const query = {
    select: vi.fn((cols: string) => (log.push(`select ${cols}`), query)),
    eq: vi.fn((col: string, v: unknown) => (log.push(`eq ${col}=${String(v)}`), query)),
    order: vi.fn((col: string, o: { ascending: boolean }) => (log.push(`order ${col} ${o.ascending ? "asc" : "desc"}`), query)),
    limit: vi.fn((n: number) => (log.push(`limit ${n}`), Promise.resolve(rows))),
  };
  const supabase = {
    from: vi.fn((table: string) => (log.push(`from ${table}`), query)),
    rpc: vi.fn(async (name: string, args: unknown) => (log.push(`rpc ${name} ${JSON.stringify(args)}`), rpc[name] ?? { data: null, error: null })),
  } as unknown as SupabaseClient;
  return { supabase, log };
}

describe("bank sharing: reading", () => {
  it("asks for this bank's changes only, newest first, and no more than fifty", async () => {
    const { supabase, log } = fake();
    await createSupabaseBankSharing(supabase).read("b1");
    expect(log).toEqual(["from bank_sharing_events", "select sharing, at", "eq bank_id=b1", "order at desc", "order seq desc", "limit 50"]);
  });

  it("is sharing when the latest change turned it on, and keeps the history in the order given", async () => {
    const rows = { data: [{ sharing: true, at: "2026-11-18T10:00:00Z" }, { sharing: false, at: "2026-11-17T10:00:00Z" }, { sharing: true, at: "2026-11-16T10:00:00Z" }] };
    const state = await createSupabaseBankSharing(fake({ rows }).supabase).read("b1");
    expect(state.sharing).toBe(true);
    expect(state.history.map((h) => h.sharing)).toEqual([true, false, true]);
  });

  it("is not sharing when the latest change turned it off, or there has never been one", async () => {
    const off = { data: [{ sharing: false, at: "2026-11-18T10:00:00Z" }, { sharing: true, at: "2026-11-17T10:00:00Z" }] };
    expect((await createSupabaseBankSharing(fake({ rows: off }).supabase).read("b1")).sharing).toBe(false);
    expect(await createSupabaseBankSharing(fake({ rows: { data: [] } }).supabase).read("b1")).toEqual({ sharing: false, history: [] });
    expect(await createSupabaseBankSharing(fake({ rows: { data: null } }).supabase).read("b1")).toEqual({ sharing: false, history: [] });
  });

  it("leaves out a row it cannot read, rather than guess what it said", async () => {
    const rows = { data: [{ sharing: "yes", at: "2026-11-18T10:00:00Z" }, { sharing: true, at: null }, { sharing: false, at: "2026-11-17T10:00:00Z" }] };
    const state = await createSupabaseBankSharing(fake({ rows }).supabase).read("b1");
    expect(state).toEqual({ sharing: false, history: [{ sharing: false, at: "2026-11-17T10:00:00Z" }] });
  });

  it("fails as unavailable, or as signed out, when the read fails", async () => {
    await expect(createSupabaseBankSharing(fake({ rows: { error: { message: "down" } } }).supabase).read("b1")).rejects.toMatchObject({ code: "unavailable" });
    await expect(createSupabaseBankSharing(fake({ rows: { error: { status: 401 } } }).supabase).read("b1")).rejects.toMatchObject({ code: "unauthorized" });
  });
});

describe("bank sharing: changing", () => {
  it("turning it on joins the bank first, then records the choice", async () => {
    const { supabase, log } = fake();
    await createSupabaseBankSharing(supabase).set("b1", true);
    expect(log).toEqual(['rpc join_bank {"p_bank":"b1"}', 'rpc set_bank_sharing {"p_bank":"b1","p_sharing":true}']);
  });

  it("turning it off records the choice and joins nothing", async () => {
    const { supabase, log } = fake();
    await createSupabaseBankSharing(supabase).set("b1", false);
    expect(log).toEqual(['rpc set_bank_sharing {"p_bank":"b1","p_sharing":false}']);
  });

  it("does not record a choice when joining failed", async () => {
    const { supabase, log } = fake({ rpc: { join_bank: { error: { message: "bank not available" } } } });
    await expect(createSupabaseBankSharing(supabase).set("b1", true)).rejects.toBeInstanceOf(ApiError);
    expect(log).toEqual(['rpc join_bank {"p_bank":"b1"}']);
  });

  it("fails when recording the choice fails, so the screen never says it worked", async () => {
    const { supabase } = fake({ rpc: { set_bank_sharing: { error: { message: "no" } } } });
    await expect(createSupabaseBankSharing(supabase).set("b1", false)).rejects.toMatchObject({ code: "unavailable" });
  });
});
