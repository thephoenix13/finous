import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "../lib/cx";

export type ButtonVariant = "primary" | "quiet" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  // The one main action on a screen.
  primary: "bg-brand text-on-brand",
  // A secondary action.
  quiet: "bg-tint text-ink",
  // A bordered action that sits among other controls.
  ghost: "border border-line bg-surface text-ink",
  danger: "bg-negative text-white",
};

/** Shared by Button and ButtonLink so a link and a button can never drift apart visually. */
export function buttonClasses(variant: ButtonVariant, fullWidth: boolean, className?: string): string {
  return cx(
    "inline-flex h-11 items-center justify-center gap-2 rounded-btn px-5 text-[14px] font-medium transition-opacity hover:opacity-90 active:opacity-80",
    "disabled:cursor-not-allowed disabled:opacity-50",
    fullWidth && "w-full",
    VARIANTS[variant],
    className,
  );
}

type Shared = { variant?: ButtonVariant; fullWidth?: boolean };

type ButtonProps = Shared &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    /** Waiting on something. Blocks further clicks and tells assistive technology the button is busy. */
    loading?: boolean;
    className?: string;
  };

/** An action. Defaults to type="button" so it never submits a form by accident. The label stays while it is busy. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth = false, loading = false, disabled, type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button {...rest} ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, fullWidth, className)}>
      {children}
    </button>
  );
});

export default Button;

/** Navigation that looks like a button. A real link, so open-in-new-tab and link lists work. */
export function ButtonLink({ to, variant = "primary", fullWidth = false, className, children }: Shared & { to: string; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={buttonClasses(variant, fullWidth, className)}>
      {children}
    </Link>
  );
}
