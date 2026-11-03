import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "../auth/types";
import { parseMemberRows, type RawRows } from "../derive/rows";
import type { MemberInput } from "../derive/types";
import { ApiError } from "./errors";
import type { MemberSource } from "./member";

/** Today's date in India, whatever the device's time zone says. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

type Failure = { status?: number; code?: string; message?: string };

/** An expired or missing sign-in is "unauthorized"; anything else we cannot tell the person more about is "unavailable". */
export function toApiError(error: unknown): ApiError {
  const e = (error ?? {}) as Failure;
  if (e.status === 401 || e.status === 403 || e.code === "PGRST301" || /jwt/i.test(e.message ?? "")) return new ApiError("unauthorized");
  return new ApiError("unavailable");
}

/** Reads one member's rows from Supabase. Row level security means a query can only ever return this person's own rows. */
export function createSupabaseMemberSource(supabase: SupabaseClient, session: Session, now: () => Date = () => new Date()): MemberSource {
  const rows = async <T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    const { data, error } = await query;
    if (error) throw toApiError(error);
    return data ?? [];
  };

  return {
    async load(): Promise<MemberInput> {
      const asOf = todayInIndia(now());
      let raw: RawRows;
      try {
        const [profile, accounts, transactions, monthly, goals, tax, snapshots, rates] = await Promise.all([
          rows<NonNullable<RawRows["profile"]>>(supabase.from("profiles").select("first_name, full_name, city").eq("id", session.userId)),
          rows<RawRows["accounts"][number]>(supabase.from("accounts").select("id, kind, name, details").order("created_at")),
          rows<RawRows["transactions"][number]>(supabase.from("transactions").select("id, account_id, occurred_on, occurred_at, description, amount, category").order("occurred_on", { ascending: false }).limit(2000)),
          rows<RawRows["monthly"][number]>(supabase.from("monthly_figures").select("month, income, rent, food, other, sips").order("month", { ascending: false }).limit(24)),
          rows<RawRows["goals"][number]>(supabase.from("goals").select("id, name, target_amount, funded_amount, target_date, assumed_return_percent").order("created_at")),
          rows<RawRows["tax"][number]>(supabase.from("tax_inputs").select("financial_year, inputs")),
          rows<RawRows["snapshots"][number]>(supabase.from("net_worth_snapshots").select("taken_on, value").order("taken_on", { ascending: false }).limit(800)),
          rows<RawRows["rates"][number]>(supabase.from("market_rates").select("key, value, as_of")),
        ]);
        raw = { profile: profile[0] ?? null, accounts, transactions, monthly, goals, tax, snapshots, rates };
      } catch (error) {
        throw error instanceof ApiError ? error : toApiError(error);
      }
      const { input, skipped } = parseMemberRows(raw, { userId: session.userId, email: session.email, asOf });
      if (skipped.length > 0) console.warn(`Finous: ${skipped.length} saved row(s) could not be read and were left out:`, skipped);
      return input;
    },

    async saveSnapshot(takenOn, value) {
      const { error } = await supabase.from("net_worth_snapshots").upsert({ user_id: session.userId, taken_on: takenOn, value }, { onConflict: "user_id,taken_on" });
      if (error) throw toApiError(error);
    },
  };
}
