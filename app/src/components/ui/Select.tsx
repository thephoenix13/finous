import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> & {
  label: string;
  options: readonly { value: string; label: string }[];
  /** Shown first when nothing is chosen yet, for example "Choose one". */
  placeholder?: string;
  hint?: string;
  error?: string;
  className?: string;
};

/** A labelled choice from a short list. A native <select>, so the phone's own picker opens. Looks like Field. */
const Select = forwardRef<HTMLSelectElement, Props>(function Select({ label, options, placeholder, hint, error, className, id, ...select }, ref) {
  const auto = useId();
  const selectId = id ?? auto;
  const noteId = `${selectId}-note`;
  const note = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </label>
      <div className={cx("relative flex h-[52px] items-center rounded-btn border bg-tint px-4 focus-within:bg-surface", error ? "border-negative" : "border-transparent focus-within:border-brand")}>
        <select
          {...select}
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-[15px] text-ink outline-none disabled:opacity-60"
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg aria-hidden="true" className="pointer-events-none absolute right-4 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {note ? (
        <p id={noteId} className={cx("mt-2 text-[13px]", error ? "text-negative" : "text-ink-3")}>
          {note}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
