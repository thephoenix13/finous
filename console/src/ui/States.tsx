import type { ReactNode } from "react";
import { Link } from "react-router";
import type { ApiData } from "../api/useApiData";
import { cx } from "../lib/cx";
import { Button, ButtonLink } from "./index";

/** Placeholder blocks while a screen loads: no spinners. Reduced-motion users get still blocks (see index.css). */
export function LoadingBlocks({ blocks = 3 }: { blocks?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading</span>
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} aria-hidden="true" className="h-28 animate-pulse rounded-card bg-tint" />
      ))}
    </div>
  );
}

/** Something broke. Say so plainly, offer the retry, and a way to tell us. Announced as an alert. */
export function ErrorState({ onRetry, title = "Something went wrong", body = "We couldn't load this. Nothing you entered has been lost." }: { onRetry?: () => void; title?: string; body?: string }) {
  return (
    <div role="alert" className="mx-auto max-w-[44ch] py-16 text-center">
      <h1 className="font-display text-[24px] leading-tight">{title}</h1>
      <p className="mt-3 text-ink-2">{body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
        <Link to="/help?topic=problem" className="text-[14px] font-medium text-brand-strong underline underline-offset-2">
          Report a problem
        </Link>
      </div>
    </div>
  );
}

/** No connection. Nothing from an earlier visit is shown while offline. */
export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-[44ch] py-24 text-center">
      <h1 className="font-display text-[24px] leading-tight">You're offline</h1>
      <p className="mt-3 text-ink-2">Check your connection. We don't show figures from an earlier visit.</p>
      <div className="mt-8 flex justify-center">
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}

/** A screen with nothing to show yet: say why, and give the next step. */
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
      <h2 className="font-display text-[20px] leading-tight">{title}</h2>
      <div className="mx-auto mt-2 max-w-[52ch] text-ink-2">{children}</div>
      {action ? (
        <div className="mt-6 flex justify-center">
          <ButtonLink to={action.to}>{action.label}</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

/** A banner for something worth knowing on the whole screen, such as that the figures are sample data. */
export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "warning"; children: ReactNode }) {
  return <p className={cx("mb-6 rounded-btn px-4 py-2.5 text-[13.5px]", tone === "warning" ? "bg-warning/10 text-warning" : "bg-tint text-ink-2")}>{children}</p>;
}

/** Shows the loading blocks, the error, or the screen, from one `useApiData` result. */
export function Async<T>({ result, blocks, children }: { result: ApiData<T> & { retry: () => void }; blocks?: number; children: (data: T) => ReactNode }) {
  if (result.status === "loading") return <LoadingBlocks blocks={blocks} />;
  if (result.status === "error") return <ErrorState onRetry={result.retry} />;
  return <>{children(result.data)}</>;
}
