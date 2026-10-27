import { useId, type CSSProperties } from "react";
import { cx } from "./cx";
import type { Domain } from "./domain";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** How to show the value, for example `inr`. Also read aloud by screen readers. */
  format?: (value: number) => string;
  domain?: Domain;
  className?: string;
};

/** A labelled range control with a live value. Native <input type="range">: arrow keys, Home and End work. */
export default function Slider({ label, value, min, max, step = 1, onChange, format = String, domain, className }: Props) {
  const id = useId();
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const shown = format(value);

  return (
    <div data-domain={domain} className={className}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="text-base font-medium tabular-nums tracking-tight text-ink">
          {shown}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className={cx("rng")}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={shown}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
