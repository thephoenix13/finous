import type { ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "./cx";

type RowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Icon shown in a 40px tile on the left. Decorative; the title carries the meaning. */
  icon?: ReactNode;
  /** Right-aligned value or control, for example a balance or a Tag. */
  right?: ReactNode;
  /** Show the chevron. Defaults to on for rows that go somewhere. */
  chevron?: boolean;
  className?: string;
} & (
  | { onClick: () => void; to?: undefined }
  | { to: string; onClick?: undefined }
  | { onClick?: undefined; to?: undefined }
);

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-3">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/**
 * A list row. Renders a real <button> when given `onClick`, a real link when given `to`, and plain
 * content otherwise, so keyboard and screen-reader behaviour comes from the element, not from ARIA patches.
 */
export default function Row({ title, subtitle, icon, right, chevron, className, onClick, to }: RowProps) {
  const interactive = Boolean(onClick || to);
  const showChevron = chevron ?? interactive;

  const content = (
    <>
      {icon ? (
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface text-ink shadow-card">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-medium text-ink">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-[13px] text-ink-3">{subtitle}</span> : null}
      </span>
      {right ? <span className="ml-auto flex items-center gap-2 text-[15px] font-medium tabular-nums text-ink">{right}</span> : null}
      {showChevron ? <Chevron /> : null}
    </>
  );

  const base = cx("flex min-h-[56px] w-full items-center gap-3.5 px-5 py-4", className);
  const tappable = "cursor-pointer active:bg-tint focus-visible:outline-offset-[-2px]";

  if (to) {
    return (
      <Link to={to} className={cx(base, tappable)}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(base, tappable)}>
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}

/** Stacks rows with hairline dividers between them. */
export function RowGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("divide-y divide-line", className)}>{children}</div>;
}
