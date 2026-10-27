import { cx } from "./cx";

type Props = {
  /** How far along, 0 to 100. Anything outside is held to the ends (so infinity is full), and NaN counts as 0. */
  value: number;
  /** What is being measured: "Section 80C limit used". Required, because a bar alone says nothing. */
  label: string;
  /** What to read aloud instead of the percentage, for example "₹94,000 of ₹1,50,000". */
  valueText?: string;
  className?: string;
};

/**
 * A thin progress bar for how much of a limit or target is used. A real `progressbar`, so assistive technology
 * hears the label and the value. Takes its colours from the nearest `data-domain`: the fill is the accent, the track a faint wash of its ink.
 */
export default function Progress({ value, label, valueText, className }: Props) {
  const pct = Number.isNaN(value) ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
      className={cx("h-[3px] overflow-hidden rounded-full bg-domain-ink/15", className)}
    >
      <div className="h-full rounded-full bg-domain" style={{ width: `${pct}%` }} />
    </div>
  );
}
