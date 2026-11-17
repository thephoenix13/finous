import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export type TagTone = "neutral" | "positive" | "warning" | "negative";

const TONES: Record<TagTone, string> = {
  neutral: "bg-tint text-ink-2",
  positive: "bg-positive/10 text-positive",
  warning: "bg-warning/10 text-warning",
  negative: "bg-negative/10 text-negative",
};

/** A small status label, for example "Invited". The text carries the meaning; colour only reinforces it. */
export default function Tag({ tone = "neutral", children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={cx("inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-[0.04em]", TONES[tone])}>{children}</span>;
}
