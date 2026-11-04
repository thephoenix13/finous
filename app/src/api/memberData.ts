import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "../auth/types";
import { accountRow, goalRow, monthlyRow, taxInputsJson, type AccountDraft, type GoalDraft } from "../derive/serialize";
import type { MemberInput, MonthlyFigures, TaxInputs } from "../derive/types";
import { toApiError } from "./memberSource";

/**
 * What a signed-in member can read and change about themselves. Forms use this, never the database: the screens that show
 * the figures go through the Api, which reads the same rows. Absent in the demo, so no form is ever shown there.
 */
export type MemberData = {
  /** Everything they have entered, as the derivation sees it. Forms start from this. */
  read(): Promise<MemberInput>;
  saveMonthly(figures: MonthlyFigures): Promise<void>;
  saveAccount(account: AccountDraft): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  saveGoal(goal: GoalDraft): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  saveTax(financialYear: string, inputs: TaxInputs): Promise<void>;
  saveProfile(profile: { fullName: string; city: string }): Promise<void>;
  /** Everything held about this person, as one JSON document: theirs to keep. */
  exportMyData(): Promise<unknown>;
  /** Deletes the account and every row of theirs. Cannot be undone. The caller signs them out after. */
  deleteMyAccount(): Promise<void>;
};

/** The first word of a name, for greeting people by. */
export const firstNameOf = (fullName: string): string => fullName.trim().split(/\s+/)[0] ?? "";

type Result = PromiseLike<{ error: unknown }>;

/** Writes to Supabase as the signed-in member; row level security means it can only ever touch their own rows. `changed` runs after each write so cached answers are dropped. */
export function createSupabaseMemberData(supabase: SupabaseClient, session: Session, read: () => Promise<MemberInput>, changed: () => void): MemberData {
  const userId = session.userId;
  const run = async (query: Result) => {
    const { error } = await query;
    if (error) throw toApiError(error);
    changed();
  };

  return {
    read,

    saveMonthly: (figures) => run(supabase.from("monthly_figures").upsert({ user_id: userId, ...monthlyRow(figures) }, { onConflict: "user_id,month" })),

    saveAccount(account) {
      const { id } = account;
      const { kind, name, details } = accountRow(account);
      // A kind never changes once saved: a bank account does not become a loan.
      return id
        ? run(supabase.from("accounts").update({ name, details }).eq("id", id))
        : run(supabase.from("accounts").insert({ user_id: userId, kind, name, details, source: "manual" }));
    },

    deleteAccount: (id) => run(supabase.from("accounts").delete().eq("id", id)),

    saveGoal(goal) {
      const row = goalRow(goal);
      return goal.id ? run(supabase.from("goals").update(row).eq("id", goal.id)) : run(supabase.from("goals").insert({ user_id: userId, ...row }));
    },

    deleteGoal: (id) => run(supabase.from("goals").delete().eq("id", id)),

    saveTax: (financialYear, inputs) => run(supabase.from("tax_inputs").upsert({ user_id: userId, financial_year: financialYear, inputs: taxInputsJson(inputs) }, { onConflict: "user_id,financial_year" })),

    async exportMyData() {
      const { data, error } = await supabase.rpc("export_my_data");
      if (error) throw toApiError(error);
      // The function returns nothing for someone who is not signed in: that is an expired sign-in, not an empty export.
      if (data === null || data === undefined) throw toApiError({ status: 401 });
      return data;
    },

    deleteMyAccount: () => run(supabase.rpc("delete_my_account")),

    saveProfile: ({ fullName, city }) =>
      run(supabase.from("profiles").update({ full_name: fullName.trim() || null, first_name: firstNameOf(fullName) || null, city: city.trim() || null }).eq("id", userId)),
  };
}
