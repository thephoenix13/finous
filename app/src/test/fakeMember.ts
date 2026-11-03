import { createMemberApi, type MemberApi } from "../api/member";
import type { MemberData } from "../api/memberData";
import { firstNameOf } from "../api/memberData";
import type { MemberEnv } from "../api/memberEnv";
import { emptyMember } from "../derive/fixture";
import type { AccountDraft, GoalDraft } from "../derive/serialize";
import type { MemberAccount, MemberGoal, MemberInput } from "../derive/types";

/** An in-memory member: reading and writing the same state the member Api answers from, so a form's save shows up on the screens. */
export function createFakeMember(initial: MemberInput = emptyMember()): MemberEnv & { state: MemberInput; saves: string[]; api: MemberApi; failNext(): void } {
  const state: MemberInput = structuredClone(initial);
  const saves: string[] = [];
  let next = 1;
  let failing = false;
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
    saveProfile: ({ fullName, city }) =>
      write("profile", () => {
        state.profile = { ...state.profile, name: fullName.trim() || state.profile.email, firstName: firstNameOf(fullName), city: city.trim() };
      }),
  };
  return { api, data, state, saves, failNext: () => void (failing = true) };
}
