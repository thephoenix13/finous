import type { ReactNode } from "react";
import { Link } from "react-router";
import { useApi } from "../api/context";
import type { FeedStatus, LaunchStep, Overview as OverviewData } from "../api/types";
import { useApiData } from "../api/useApiData";
import { formatCount, formatDate, formatPercent } from "../lib/format";
import { ROUTES } from "../routes";
import { Card, PageHeader, Tag } from "../ui";
import { Async, EmptyState, Notice } from "../ui/States";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.overview(options);

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <dl>
        <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</dt>
        <dd className="mt-2 font-display text-[34px] leading-none">{value}</dd>
        <dd className="mt-2 text-[13px] text-ink-3">{note}</dd>
      </dl>
    </Card>
  );
}

function Feed({ feed }: { feed: FeedStatus }) {
  return (
    <Card as="section" className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold">Bank data feed</h2>
        {feed.state === "not_connected" ? (
          <p className="mt-1 text-ink-2">Not connected. Customers see only what they enter themselves.</p>
        ) : (
          <p className="mt-1 text-ink-2">Last ran on {formatDate(feed.lastRun)}.</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Tag tone={feed.state === "healthy" ? "positive" : feed.state === "failing" ? "negative" : "neutral"}>
          {feed.state === "not_connected" ? "Not connected" : feed.state === "healthy" ? "Healthy" : "Failing"}
        </Tag>
        <Link to={ROUTES.integration} className="text-[14px] font-medium text-brand-strong underline underline-offset-2">
          {feed.state === "not_connected" ? "Set up the feed" : "See the feed"}
        </Link>
      </div>
    </Card>
  );
}

/** S.3: a new bank has no customers yet. Say how to get some, and what is left to set up. */
function NoCustomersYet({ launch }: { launch: LaunchStep[] }) {
  const next = launch.find((s) => !s.done);
  return (
    <div className="space-y-6">
      <EmptyState title="No customers yet" action={next ? { to: next.to, label: next.label } : undefined}>
        <p>Customers appear here once they sign up through your bank's link. The steps below get your app ready to share.</p>
      </EmptyState>
      <Card as="section">
        <h2 className="text-[15px] font-semibold">Launch checklist</h2>
        <ol aria-label="Launch checklist" className="mt-3 divide-y divide-line">
          {launch.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-3">
              <Link to={s.to} className="font-medium text-brand-strong underline underline-offset-2">
                {s.label}
              </Link>
              <Tag tone={s.done ? "positive" : "neutral"}>{s.done ? "Done" : "To do"}</Tag>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Totals({ data }: { data: OverviewData }): ReactNode {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Sign-ups" value={formatCount(data.signUps)} note="Customers who created an account" />
        <Metric label="Active this month" value={formatCount(data.activeThisMonth)} note={`Opened the app in ${data.period}`} />
        <Metric label="Sharing with the bank" value={formatPercent(data.sharingPercent)} note="Of customers chose to share" />
        <Metric label="Advisor questions" value={formatCount(data.advisorQuestions)} note={`Asked in ${data.period}`} />
      </div>
      <Feed feed={data.feed} />
    </div>
  );
}

/** I2.1: how the rollout is going, in totals. Nothing here is about one customer. */
export default function Overview() {
  const api = useApi();
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Overview" description="How your rollout is going. Totals only: no one customer is shown here." />
      {api.demo ? <Notice>This is a demo bank with sample figures.</Notice> : null}
      <Async result={result}>{(data) => (data.signUps === 0 ? <NoCustomersYet launch={data.launch} /> : <Totals data={data} />)}</Async>
    </>
  );
}
