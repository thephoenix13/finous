import { deriveMember, type MemberView } from "../derive/derive";
import type { MemberInput } from "../derive/types";
import { ApiError } from "./errors";
import { queryTransactions } from "./transactions";
import type { Api, RequestOptions } from "./types";

/** Where a member's data comes from: the database, in the app; a fixed input in tests. */
export interface MemberSource {
  load(signal?: AbortSignal): Promise<MemberInput>;
  /** Records today's net worth so the history line grows. Optional: a source that cannot simply leaves it out. */
  saveSnapshot?(takenOn: string, value: number): Promise<void>;
}

export type MemberApi = Api & {
  /** Forget what was loaded, so the next call reads the data again. Called after the person changes something. */
  invalidate(): void;
};

const abortReason = (signal: AbortSignal): unknown => signal.reason ?? new DOMException("The request was aborted", "AbortError");

/**
 * An Api over one member's own data. Each call reads the member's rows (once for calls that arrive together, see `ttlMs`), works the
 * screens out with `deriveMember`, and answers from that. A figure that cannot be worked out yet rejects with "no_data", which the
 * screens turn into an invitation to add it, never into a zero.
 */
export function createMemberApi(source: MemberSource, { ttlMs = 3_000, now = Date.now }: { ttlMs?: number; now?: () => number } = {}): MemberApi {
  let cached: { at: number; view: Promise<MemberView> } | undefined;
  let snapshotted: string | undefined;

  const read = (): Promise<MemberView> => {
    if (cached && now() - cached.at < ttlMs) return cached.view;
    const view = source.load().then((input) => {
      const derived = deriveMember(input);
      // Once a day, with accounts to count, note the net worth.
      const key = `${input.asOf}:${derived.netWorth.value}`;
      if (source.saveSnapshot && input.accounts.length > 0 && snapshotted !== key) {
        snapshotted = key;
        void source.saveSnapshot(input.asOf, derived.netWorth.value).catch(() => {
          snapshotted = undefined;
        });
      }
      return derived;
    });
    cached = { at: now(), view };
    // A failed load must not be remembered: the next call tries again.
    view.catch(() => {
      if (cached?.view === view) cached = undefined;
    });
    return view;
  };

  async function answer<T>(options: RequestOptions | undefined, produce: (view: MemberView, input?: never) => T): Promise<T> {
    const signal = options?.signal;
    if (signal?.aborted) throw abortReason(signal);
    const view = await read();
    if (signal?.aborted) throw abortReason(signal);
    return structuredClone(produce(view));
  }

  return {
    invalidate: () => {
      cached = undefined;
    },
    getProfile: (o) => answer(o, (v) => v.profile),
    getHome: (o) => answer(o, (v) => v.home),
    listAccounts: (o) => answer(o, (v) => v.accounts),
    getAccount: (id, o) =>
      answer(o, (v) => {
        const account = v.allAccounts.find((a) => a.id === id);
        if (!account) throw new ApiError("not_found", `No account with id "${id}"`);
        return account;
      }),
    listTransactions: (query, o) => answer(o, (v) => queryTransactions(v.transactions, query)),
    getNetWorth: (o) => answer(o, (v) => v.netWorth),
    getNetWorthHistory: (o) => answer(o, (v) => v.netWorthHistory),
    getCashFlow: (o) =>
      answer(o, (v) => {
        if (!v.cashFlow) throw new ApiError("no_data", "No monthly figures yet");
        return v.cashFlow;
      }),
    listInsights: (o) => answer(o, (v) => v.insights),
    getHealthScore: (o) =>
      answer(o, (v) => {
        if (!v.health) throw new ApiError("no_data", "Not enough to work a score out from yet");
        return v.health;
      }),
    listGoals: (o) => answer(o, (v) => v.goals),
    getGoal: (id, o) =>
      answer(o, (v) => {
        const goal = v.goals.find((g) => g.id === id);
        if (!goal) throw new ApiError("not_found", `No goal with id "${id}"`);
        return goal;
      }),
    getTaxSummary: (o) => answer(o, (v) => v.tax),
    // Account Aggregator consents: none yet. The app's own beta consents are separate and live in the consents table.
    listConsents: (o) => answer(o, () => []),
  };
}
