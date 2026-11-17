import type { ReactNode } from "react";

type Props = { title: string; description?: string; actions?: ReactNode };

/** The title of a screen. Every screen has exactly one h1, which is also what a screen reader lands on after navigating. */
export default function PageHeader({ title, description, actions }: Props) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight tracking-tight">{title}</h1>
        {description ? <p className="mt-1.5 max-w-[62ch] text-[15px] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  );
}
