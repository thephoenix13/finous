import { cx } from "../lib/cx";

type Props = {
  /** Required: a switch with no name is unusable with a screen reader. Use the setting's name. */
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** On/off setting. A native <button role="switch">, so Space and Enter work and focus is visible. */
export default function Switch({ label, checked, onCheckedChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cx("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-ink-3", disabled && "cursor-not-allowed opacity-50")}
    >
      <span aria-hidden="true" className={cx("absolute left-[3px] top-[3px] size-[18px] rounded-full bg-white transition-transform", checked && "translate-x-4")} />
    </button>
  );
}
