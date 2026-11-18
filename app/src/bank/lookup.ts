import type { SupabaseClient } from "@supabase/supabase-js";
import { parseBranding, type BankBranding } from "./branding";

/**
 * Finds a live bank by its address. Resolves to null when there is no such bank, or it is not live (the database makes the two
 * look the same), and rejects when the lookup itself could not be made, so the screen can offer a retry.
 */
export type BankLookup = (subdomain: string) => Promise<BankBranding | null>;

/** The only thing a visitor who isn't signed in can read about a bank: bank_public() returns branding and nothing else. */
export function supabaseBankLookup(supabase: SupabaseClient): BankLookup {
  return async (subdomain) => {
    const { data, error } = await supabase.rpc("bank_public", { p_subdomain: subdomain });
    if (error) throw new Error(error.message);
    const row: unknown = Array.isArray(data) ? data[0] : data;
    return row ? parseBranding(row) : null;
  };
}
