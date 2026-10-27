import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  /** Help text under the field. */
  hint?: string;
  /** Error text. Replaces the hint and marks the field invalid. */
  error?: string;
  /** Decorative icon on the left, for example a search icon. */
  icon?: ReactNode;
  className?: string;
};

/** A labelled text input. The label is always visible; placeholders are examples, never labels. */
const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, hint, error, icon, className, id, ...input }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const noteId = `${inputId}-note`;
  const note = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </label>
      <div
        className={cx(
          "flex h-[52px] items-center gap-3 rounded-btn border bg-tint px-4 focus-within:bg-surface",
          error ? "border-negative" : "border-transparent focus-within:border-brand",
        )}
      >
        {icon ? (
          <span aria-hidden="true" className="shrink-0 text-ink-3">
            {icon}
          </span>
        ) : null}
        <input
          {...input}
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      {note ? (
        <p id={noteId} className={cx("mt-2 text-[13px]", error ? "text-negative" : "text-ink-3")}>
          {note}
        </p>
      ) : null}
    </div>
  );
});

export default Field;
