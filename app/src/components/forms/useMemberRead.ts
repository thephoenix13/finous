import { useCallback, useEffect, useState } from "react";
import { useMemberData } from "../../api/memberContext";
import type { MemberInput } from "../../derive/types";

export type MemberRead = { status: "loading" } | { status: "error"; retry: () => void } | { status: "ready"; input: MemberInput };

/** What the signed-in member has entered so far, for a form to start from. Read once when the form opens. */
export function useMemberRead(): MemberRead {
  const data = useMemberData();
  const [state, setState] = useState<MemberRead>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!data) return;
    let live = true;
    setState({ status: "loading" });
    data.read().then(
      (input) => live && setState({ status: "ready", input }),
      () => live && setState({ status: "error", retry }),
    );
    return () => {
      live = false;
    };
  }, [data, attempt, retry]);

  return state;
}
