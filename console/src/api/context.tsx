import { createContext, useContext, type ReactNode } from "react";
import type { ConsoleApi } from "./types";

const ApiContext = createContext<ConsoleApi | null>(null);

/** Gives every screen below it one `ConsoleApi`: the mock today, the HTTP client later. */
export function ApiProvider({ api, children }: { api: ConsoleApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): ConsoleApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi must be used inside <ApiProvider>");
  return api;
}
