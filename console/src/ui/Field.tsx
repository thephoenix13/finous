import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "../lib/cx";

const LABEL = "mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3";
const BOX = "w-full rounded-btn border bg-surface px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-brand disabled:opacity-60";

type Base = { label: string; hint?: string; error?: string; className?: string };

function Note({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  const note = error ?? hint;
  return note ? (
    <p id={id} className={cx("mt-1.5 text-[13px]", error ? "text-negative" : "text-ink-3")}>
      {note}
    </p>
  ) : null;
}

type FieldProps = Base & Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { suffix?: ReactNode };

/** A labelled text input. The label is always visible; placeholders are examples, never labels. */
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, suffix, className, id, ...input }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const noteId = `${inputId}-note`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={LABEL}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          {...input}
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ?? hint ? noteId : undefined}
          className={cx(BOX, "h-11 min-w-0 flex-1", error ? "border-negative" : "border-line")}
        />
        {suffix ? <span className="shrink-0 text-[14px] text-ink-2">{suffix}</span> : null}
      </div>
      <Note id={noteId} error={error} hint={hint} />
    </div>
  );
});

export default Field;

type TextAreaProps = Base & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, hint, error, className, id, rows = 4, ...input }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const noteId = `${inputId}-note`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={LABEL}>
        {label}
      </label>
      <textarea
        {...input}
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ?? hint ? noteId : undefined}
        className={cx(BOX, "py-2.5", error ? "border-negative" : "border-line")}
      />
      <Note id={noteId} error={error} hint={hint} />
    </div>
  );
});
