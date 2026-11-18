import type { SupabaseClient } from "@supabase/supabase-js";
import { toApiError } from "./memberSource";

/** One change of mind: sharing was turned on or off at this moment. */
export type SharingChange = { sharing: boolean; at: string };

/** Where a person stands with one bank: what they chose last, and every change they made, newest first. */
export type SharingState = { sharing: boolean; history: SharingChange[] };

/** A person's choice about letting one bank see the accounts it supplied. Absent in the demo and on Finous's own address. */
export type BankSharing = {
  read(bankId: string): Promise<SharingState>;
  /** Turns sharing on or off. Turning it on also makes the person a customer of the bank, which is how a bank first learns of them. Off takes effect at once. */
  set(bankId: string, sharing: boolean): Promise<void>;
};

type Row = { sharing: unknown; at: unknown };

/** Reads and changes the signed-in member's own choice. The database rules decide what a call may do; nothing here is trusted to. */
export function createSupabaseBankSharing(supabase: SupabaseClient): BankSharing {
  return {
    async read(bankId) {
      const { data, error } = await supabase
        .from("bank_sharing_events")
        .select("sharing, at")
        .eq("bank_id", bankId)
        .order("at", { ascending: false })
        .order("seq", { ascending: false })
        .limit(50);
      if (error) throw toApiError(error);
      const history = ((data ?? []) as Row[]).flatMap((r) => (typeof r.sharing === "boolean" && typeof r.at === "string" ? [{ sharing: r.sharing, at: r.at }] : []));
      return { sharing: history[0]?.sharing ?? false, history };
    },

    async set(bankId, sharing) {
      if (sharing) {
        const joined = await supabase.rpc("join_bank", { p_bank: bankId });
        if (joined.error) throw toApiError(joined.error);
      }
      const { error } = await supabase.rpc("set_bank_sharing", { p_bank: bankId, p_sharing: sharing });
      if (error) throw toApiError(error);
    },
  };
}
