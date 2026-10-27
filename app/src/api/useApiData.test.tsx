// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiProvider, useApi } from "./context";
import { ApiError } from "./errors";
import { createMockApi } from "./mock";
import type { Api, RequestOptions } from "./types";
import { useApiData } from "./useApiData";

const providerFor = (api: Api) => ({ children }: { children: ReactNode }) => <ApiProvider api={api}>{children}</ApiProvider>;

// useApiData needs a stable load function, so these live outside the tests.
const loadName = (api: Api, options: RequestOptions) => api.getProfile(options).then((p) => p.firstName);

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useApi", () => {
  it("hands out the Api from the provider", () => {
    const api = createMockApi();
    const { result } = renderHook(() => useApi(), { wrapper: providerFor(api) });
    expect(result.current).toBe(api);
  });

  it("throws a clear error outside a provider", () => {
    // The throw is the point. Keep React and jsdom from also printing it as an unexpected error.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const quiet = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", quiet);
    try {
      expect(() => renderHook(() => useApi())).toThrow("useApi must be used inside <ApiProvider>");
    } finally {
      window.removeEventListener("error", quiet);
    }
  });
});

describe("useApiData", () => {
  it("starts loading, then is ready with the data", async () => {
    const { result } = renderHook(() => useApiData(loadName), { wrapper: providerFor(createMockApi()) });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ status: "ready", data: "Aarav" });
  });

  it("gives load the provider's Api and a live abort signal", async () => {
    const api = createMockApi();
    const load = vi.fn((a: Api, o: RequestOptions) => a.getProfile(o));
    renderHook(() => useApiData(load), { wrapper: providerFor(api) });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    const [passedApi, options] = load.mock.calls[0];
    expect(passedApi).toBe(api);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal?.aborted).toBe(false);
  });

  it("reports a failure with the error itself", async () => {
    const api = createMockApi();
    const error = new ApiError("unavailable", "HDFC is not responding");
    api.failNext(error);
    const { result } = renderHook(() => useApiData(loadName), { wrapper: providerFor(api) });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({ status: "error", error });
  });

  it("goes back to loading on retry, then recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    const { result } = renderHook(() => useApiData(loadName), { wrapper: providerFor(api) });
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.retry());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ data: "Aarav" });
  });

  it("reloads when retried even after it succeeded", async () => {
    const load = vi.fn(loadName);
    const { result } = renderHook(() => useApiData(load), { wrapper: providerFor(createMockApi()) });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.retry());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("keeps the same retry function between renders", async () => {
    const { result, rerender } = renderHook(() => useApiData(loadName), { wrapper: providerFor(createMockApi()) });
    const first = result.current.retry;
    rerender();
    expect(result.current.retry).toBe(first);
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("cancels a load still running when the screen goes away", async () => {
    const slow = deferred<string>();
    let signal: AbortSignal | undefined;
    const load = (_api: Api, options: RequestOptions) => {
      signal = options.signal;
      return slow.promise;
    };
    const { unmount } = renderHook(() => useApiData(load), { wrapper: providerFor(createMockApi()) });
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("ignores a late failure from a cancelled load", async () => {
    const slow = deferred<string>();
    const load = () => slow.promise;
    const { result, unmount } = renderHook(() => useApiData(load), { wrapper: providerFor(createMockApi()) });
    unmount();
    slow.reject(new DOMException("aborted", "AbortError"));
    await Promise.resolve();
    expect(result.current.status).toBe("loading"); // the last thing it showed; nothing updated after unmount
  });

  it("shows the newest attempt when an older, slower one finishes last", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const attempts = [first.promise, second.promise];
    const load = vi.fn(() => attempts.shift()!);

    const { result } = renderHook(() => useApiData(load), { wrapper: providerFor(createMockApi()) });
    act(() => result.current.retry());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    await act(async () => second.resolve("second"));
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: "second" }));
    await act(async () => first.resolve("first"));
    expect(result.current).toMatchObject({ status: "ready", data: "second" });
  });

  it("aborts the previous attempt's signal when retried", async () => {
    const signals: AbortSignal[] = [];
    const load = (_api: Api, options: RequestOptions) => {
      signals.push(options.signal!);
      return new Promise<string>(() => {});
    };
    const { result } = renderHook(() => useApiData(load), { wrapper: providerFor(createMockApi()) });
    act(() => result.current.retry());
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});
