import type { SaveState } from "../lib/useSaver";
import { Button } from "./index";

type Props = { state: SaveState; label?: string; disabled?: boolean };

/** The submit button of a settings form, and a line that says how the save went. The line is a live region, so it is announced. */
export default function SaveBar({ state, label = "Save changes", disabled }: Props) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4">
      <Button type="submit" loading={state.status === "saving"} disabled={disabled}>
        {label}
      </Button>
      <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-[14px] text-negative" : "text-[14px] text-positive"}>
        {state.status === "saved" ? "Saved." : state.status === "error" ? state.message : ""}
      </p>
    </div>
  );
}
