import { useEffect, useRef, useState } from "react";
import { Button } from "./index";

/**
 * Copies `text` to the clipboard and says so. If the browser won't allow it, it says that instead, so nobody
 * believes something was copied when it wasn't. `what` names the thing for a screen reader.
 */
export default function CopyButton({ text, what }: { text: string; what: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 3000);
  }

  return (
    <>
      <Button variant="ghost" onClick={() => void copy()}>
        Copy <span className="sr-only">{what}</span>
      </Button>
      <span role="status" className={state === "failed" ? "text-[13px] text-negative" : "text-[13px] text-positive"}>
        {state === "copied" ? "Copied." : state === "failed" ? "Couldn't copy. Select it and copy by hand." : ""}
      </span>
    </>
  );
}
