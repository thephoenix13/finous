import { useState } from "react";
import { cx } from "./cx";

type Props = {
  /** Required: a switch with no name is unusable with a screen reader. Use the setting's name. */
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * On/off setting. A native <button role="switch">, so Space and Enter work and focus is visible.
 * Controlled with `checked`, or uncontrolled with `defaultChecked`.
 */
export default function Switch({ label, checked, defaultChecked = false, onCheckedChange, disabled, className }: Props) {
  const [inner, setInner] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : inner;

  const toggle = () => {
    const next = !on;
    if (!isControlled) setInner(next);
    onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={toggle}
      className={cx(
        // The ::before extends the tap area to 44px tall without changing the drawn size.
        "relative h-6 w-10 shrink-0 rounded-full transition-colors before:absolute before:-inset-2.5 before:content-['']",
        on ? "bg-brand" : "bg-line",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute left-[3px] top-[3px] size-[18px] rounded-full bg-page transition-transform",
          on && "translate-x-4",
        )}
      />
    </button>
  );
}
