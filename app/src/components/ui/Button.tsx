import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "./cx";
import type { Domain } from "./domain";

export type ButtonVariant = "primary" | "accent" | "ghost" | "quiet";
export type ButtonSize = "md" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  // The one main action on a screen.
  primary: "bg-brand text-on-brand shadow-brand",
  // A consequential next step with a lender or provider: "Ask HDFC for a quote".
  accent: "bg-warning text-white shadow-[0_8px_20px_rgb(154_91_0/0.25)]",
  // A secondary action. Takes its tint from the nearest data-domain.
  ghost: "bg-domain-tint text-domain-ink",
  // The quietest option: "Skip", "Not now".
  quiet: "bg-tint text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-[52px] text-[15px]",
  sm: "h-11 text-[13.5px]",
};

/** Shared by Button and ButtonLink so a link and a button can never drift apart visually. */
export function buttonClasses(variant: ButtonVariant, size: ButtonSize, fullWidth: boolean, className?: string): string {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-btn px-5 font-medium tracking-[-0.005em] transition-opacity active:opacity-85",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    fullWidth && "w-full",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the full width of the container. On by default, as on mobile screens. */
  fullWidth?: boolean;
  /** Takes the accent from a domain, mainly useful for the ghost variant. */
  domain?: Domain;
  /** Icon before the label. Decorative; the label carries the meaning. */
  icon?: ReactNode;
};

type ButtonProps = Shared &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    /** Waiting on something. Blocks further clicks and tells assistive technology the button is busy. */
    loading?: boolean;
    className?: string;
  };

const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="animate-spin">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

/**
 * An action. Defaults to type="button" so it never submits a form by accident.
 * Loading keeps the label (so the name does not change under a screen reader) and blocks repeat taps.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth = true, domain, icon, loading = false, disabled, type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      data-domain={domain}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, fullWidth, className)}
    >
      {loading ? <Spinner /> : icon ? <span aria-hidden="true" className="flex">{icon}</span> : null}
      {children}
    </button>
  );
});

export default Button;

type ButtonLinkProps = Shared & {
  to: string;
  className?: string;
  children: ReactNode;
};

/** Navigation that looks like a button. A real link, so open-in-new-tab and screen-reader link lists work. */
export function ButtonLink({ to, variant = "primary", size = "md", fullWidth = true, domain, icon, className, children }: ButtonLinkProps) {
  return (
    <Link to={to} data-domain={domain} className={buttonClasses(variant, size, fullWidth, className)}>
      {icon ? <span aria-hidden="true" className="flex">{icon}</span> : null}
      {children}
    </Link>
  );
}
