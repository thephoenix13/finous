import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cx } from "../lib/cx";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> & {
  label: string;
  options: readonly { value: string; label: string }[];
  /** Shown first when nothing is chosen yet, for example "Choose one". */
  placeholder?: string;
  hint?: string;
  error?: string;
  className?: string;
};

/** A labelled choice from a short list. A native <select>, so keyboard and screen readers work as they always do. */
const Select = forwardRef<HTMLSelectElement, Props>(function Select({ label, options, placeholder, hint, error, className, id, ...select }, ref) {
  const auto = useId();
  const selectId = id ?? auto;
  const noteId = `${selectId}-note`;
  const note = error ?? hint;
  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        {label}
      </label>
      <select
        {...select}
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cx("h-11 w-full rounded-btn border bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand", error ? "border-negative" : "border-line")}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {note ? (
        <p id={noteId} className={cx("mt-1.5 text-[13px]", error ? "text-negative" : "text-ink-3")}>
          {note}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
