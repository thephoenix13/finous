import { createMemberApi, type MemberApi } from "../api/member";
import type { BankSharing, SharingChange } from "../api/bankSharing";
import type { MemberData } from "../api/memberData";
import { firstNameOf } from "../api/memberData";
import type { MemberEnv } from "../api/memberEnv";
import { emptyMember } from "../derive/fixture";
import type { AccountDraft, GoalDraft } from "../derive/serialize";
import type { MemberAccount, MemberGoal, MemberInput } from "../derive/types";

/** An in-memory member: reading and writing the same state the member Api answers from, so a form's save shows up on the screens. */
export function createFakeMember(
  initial: MemberInput = emptyMember(),
): MemberEnv & { state: MemberInput; saves: string[]; api: MemberApi; failNext(): void; deleted(): boolean; sharing: Map<string, SharingChange[]>; joined: Set<string> } {
  const state: MemberInput = structuredClone(initial);
  const saves: string[] = [];
  let next = 1;
  let failing = false;
  let gone = false;
  // What each bank has been told, newest first, as the database would hold it, and which banks the member has joined.
  const sharing = new Map<string, SharingChange[]>();
  const joined = new Set<string>();
  let tick = 0;
  const bankSharing: BankSharing = {
    join: async (bankId) => {
      if (failing) {
        failing = false;
        throw new Error("join failed");
      }
      joined.add(bankId);
    },
    read: async (bankId) => {
      if (failing) {
        failing = false;
        throw new Error("read failed");
      }
      const history = [...(sharing.get(bankId) ?? [])];
      return { sharing: history[0]?.sharing ?? false, history };
    },
    set: async (bankId, on) => {
      if (failing) {
        failing = false;
        throw new Error("save failed");
      }
      if (on) joined.add(bankId);
      const history = sharing.get(bankId) ?? [];
      // Saying what is already true records nothing, as in the database.
      if ((history[0]?.sharing ?? false) === on) return;
      tick += 1;
      sharing.set(bankId, [{ sharing: on, at: new Date(Date.UTC(2026, 10, 18, 9, tick)).toISOString() }, ...history]);
      saves.push(on ? "share" : "unshare");
    },
  };
  const api = createMemberApi({ load: async () => structuredClone(state) });
  const write = async (what: string, change: () => void) => {
    if (failing) {
      failing = false;
      throw new Error("save failed");
    }
    change();
    saves.push(what);
    api.invalidate();
  };

  const data: MemberData = {
    read: async () => structuredClone(state),
    saveMonthly: (figures) =>
      write("monthly", () => {
        state.monthly = [...state.monthly.filter((m) => m.month !== figures.month), figures];
      }),
    saveAccount: (account: AccountDraft) =>
      write("account", () => {
        if (account.id) state.accounts = state.accounts.map((a) => (a.id === account.id ? ({ ...account, kind: a.kind, id: a.id } as MemberAccount) : a));
        else state.accounts = [...state.accounts, { ...account, id: `acct-${next++}` } as MemberAccount];
      }),
    deleteAccount: (id) =>
      write("delete-account", () => {
        state.accounts = state.accounts.filter((a) => a.id !== id);
      }),
    saveGoal: (goal: GoalDraft) =>
      write("goal", () => {
        const saved: MemberGoal = { ...goal, id: goal.id ?? `goal-${next++}` };
        state.goals = goal.id ? state.goals.map((g) => (g.id === goal.id ? saved : g)) : [...state.goals, saved];
      }),
    deleteGoal: (id) =>
      write("delete-goal", () => {
        state.goals = state.goals.filter((g) => g.id !== id);
      }),
    saveTax: (_year, inputs) =>
      write("tax", () => {
        state.tax = inputs;
      }),
    exportMyData: async () => {
      if (failing) {
        failing = false;
        throw new Error("export failed");
      }
      saves.push("export");
      return { exported_at: "2026-09-29T00:00:00Z", profile: { id: state.profile.id }, accounts: structuredClone(state.accounts), goals: structuredClone(state.goals), monthly_figures: structuredClone(state.monthly) };
    },
    deleteMyAccount: () =>
      write("delete-my-account", () => {
        gone = true;
      }),
    bankSharing,
    saveProfile: ({ fullName, city }) =>
      write("profile", () => {
        state.profile = { ...state.profile, name: fullName.trim() || state.profile.email, firstName: firstNameOf(fullName), city: city.trim() };
      }),
  };
  return { api, data, state, saves, failNext: () => void (failing = true), deleted: () => gone, sharing, joined };
}
