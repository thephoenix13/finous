import { useCallback, useEffect, useState } from "react";
import { useApi } from "./context";
import type { Api, RequestOptions } from "./types";

export type ApiData<T> = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: T };

/**
 * Loads data for a screen: `loading`, then `ready` or `error`, with `retry`. A load that is still running when the
 * screen goes away, or when `retry` starts another, is cancelled and its result ignored.
 *
 * `load` must be stable (declare it outside the component), because a new function would reload on every render.
 */
export function useApiData<T>(load: (api: Api, options: RequestOptions) => Promise<T>): ApiData<T> & { retry: () => void } {
  const api = useApi();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ApiData<T>>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    load(api, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", error });
      },
    );
    return () => controller.abort();
  }, [api, load, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
