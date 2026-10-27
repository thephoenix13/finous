import type { ReactNode } from "react";
import { cx } from "./cx";

export type TagTone = "neutral" | "positive" | "warning" | "negative";

const TONES: Record<TagTone, string> = {
  neutral: "bg-tint text-ink-2",
  positive: "bg-positive/10 text-positive",
  warning: "bg-warning/10 text-warning",
  negative: "bg-negative/10 text-negative",
};

type Props = {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
};

/** A small status label, for example "Active" or "Off". The text carries the meaning; colour only reinforces it. */
export default function Tag({ tone = "neutral", className, children }: Props) {
  return (
    <span
      className={cx(
        "inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-[0.04em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
