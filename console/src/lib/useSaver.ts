import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = { status: "idle" } | { status: "saving" } | { status: "saved" } | { status: "error"; message: string };

/**
 * The state of one save button. `run` ignores a second press while one is in flight, so a double click can never
 * save twice, and a save that finishes after the screen has gone does not touch it. It resolves to whether it worked.
 */
export function useSaver() {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (save: () => Promise<void>, describe: (error: unknown) => string = () => "We couldn't save that. Your changes are still here. Try again."): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setState({ status: "saving" });
    try {
      await save();
      if (mounted.current) setState({ status: "saved" });
      return true;
    } catch (error) {
      if (mounted.current) setState({ status: "error", message: describe(error) });
      return false;
    } finally {
      busy.current = false;
    }
  }, []);

  /** Back to a quiet button, for when the person starts editing again after a save. */
  const reset = useCallback(() => setState((s) => (s.status === "saving" ? s : { status: "idle" })), []);

  return { state, run, reset };
}
