import { ApiError } from "./errors";
import { persona } from "./persona";
import type { Api, RequestOptions, Transaction, TransactionPage, TransactionQuery } from "./types";

export type MockApiOptions = {
  /** Simulated network delay for every call. Default 0, so tests and Storybook-style pages are instant. */
  latencyMs?: number;
};

export type MockApi = Api & {
  /** Makes the next call reject with `error`, then everything works again. For testing error and retry screens. */
  failNext(error: ApiError): void;
};

const abortReason = (signal: AbortSignal): unknown => signal.reason ?? new DOMException("The request was aborted", "AbortError");

/** Resolves after `ms`, or rejects the moment `signal` aborts. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortReason(signal));
    if (ms <= 0) return resolve();
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal!));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Newest first: by date, then time (a missing time counts as midnight), then id so the order is stable. */
function newestFirst(a: Transaction, b: Transaction): number {
  return b.date.localeCompare(a.date) || (b.time ?? "00:00").localeCompare(a.time ?? "00:00") || b.id.localeCompare(a.id);
}

function queryTransactions({ search, accountId, limit }: TransactionQuery = {}): TransactionPage {
  const needle = search?.trim().toLowerCase();
  const matches = persona.transactions
    .filter((t) => (!accountId || t.accountId === accountId) && (!needle || t.description.toLowerCase().includes(needle)))
    .sort(newestFirst);
  return { items: limit === undefined ? matches : matches.slice(0, Math.max(0, limit)), total: matches.length };
}

/**
 * An in-memory Api serving the prototype persona (see persona.ts). Every response is a deep copy, so a caller
 * can never change the data the next caller sees.
 */
export function createMockApi({ latencyMs = 0 }: MockApiOptions = {}): MockApi {
  const failures: ApiError[] = [];

  async function respond<T>(options: RequestOptions | undefined, produce: () => T): Promise<T> {
    const failure = failures.shift(); // claimed up front, so "the next call" means the next call made
    await wait(latencyMs, options?.signal);
    if (failure) throw failure;
    return structuredClone(produce());
  }

  return {
    failNext: (error) => void failures.push(error),

    getProfile: (o) => respond(o, () => persona.profile),
    getHome: (o) => respond(o, () => persona.home),
    listAccounts: (o) => respond(o, () => persona.accounts),
    getAccount: (id, o) =>
      respond(o, () => {
        const account = persona.allAccounts.find((a) => a.id === id);
        if (!account) throw new ApiError("not_found", `No account with id "${id}"`);
        return account;
      }),
    listTransactions: (query, o) => respond(o, () => queryTransactions(query)),
    getNetWorth: (o) => respond(o, () => persona.netWorth),
    getCashFlow: (o) => respond(o, () => persona.cashFlow),
    listInsights: (o) => respond(o, () => persona.insights),
    getHealthScore: (o) => respond(o, () => persona.health),
    listGoals: (o) => respond(o, () => persona.goals),
    getGoal: (id, o) =>
      respond(o, () => {
        const goal = persona.goals.find((g) => g.id === id);
        if (!goal) throw new ApiError("not_found", `No goal with id "${id}"`);
        return goal;
      }),
    listConsents: (o) => respond(o, () => persona.consents),
  };
}
