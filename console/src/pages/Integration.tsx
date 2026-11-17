import { useApi } from "../api/context";
import type { FeedDetail } from "../api/types";
import { useApiData } from "../api/useApiData";
import { formatCount, formatDateTime } from "../lib/format";
import { ROUTES } from "../routes";
import { Card, PageHeader, Tag } from "../ui";
import { Async, EmptyState, Notice } from "../ui/States";
import { IntegrationTabs } from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.feed(options);

type Connected = Exclude<FeedDetail, { state: "not_connected" }>;

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <dl>
        <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</dt>
        <dd className="mt-2 font-display text-[24px] leading-tight">{value}</dd>
      </dl>
    </Card>
  );
}

function Status({ feed }: { feed: Connected }) {
  const latest = feed.runs[0];
  return (
    <div className="space-y-6">
      {feed.state === "failing" ? (
        <Notice tone="warning">
          The latest run didn't work{latest.message ? `: ${latest.message}` : "."} Customers still see the figures from the last run that did.
        </Notice>
      ) : null}
      <div className="flex items-center gap-3">
        <h2 className="text-[16px] font-semibold">Status</h2>
        <Tag tone={feed.state === "healthy" ? "positive" : "negative"}>{feed.state === "healthy" ? "Healthy" : "Failing"}</Tag>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Figure label="Last run" value={formatDateTime(feed.lastRun)} />
        <Figure label="Rows read" value={formatCount(feed.rowsRead)} />
        <Figure label="Next run" value={formatDateTime(feed.nextRun)} />
      </div>
      <section aria-labelledby="runs">
        <h2 id="runs" className="mb-3 text-[16px] font-semibold">Recent runs</h2>
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <caption className="sr-only">The feed's recent runs, newest first</caption>
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                <th scope="col" className="px-4 py-3 font-semibold">When (IST)</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rows read</th>
                <th scope="col" className="px-4 py-3 font-semibold">Left out</th>
                <th scope="col" className="px-4 py-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {feed.runs.map((r) => (
                <tr key={r.at} className="border-t border-line align-top">
                  <td className="px-4 py-3">{formatDateTime(r.at)}</td>
                  <td className="px-4 py-3">{r.ok ? formatCount(r.rowsRead) : "–"}</td>
                  <td className="px-4 py-3">{r.ok ? formatCount(r.rowsRejected) : "–"}</td>
                  <td className="px-4 py-3">
                    <Tag tone={r.ok ? "positive" : "negative"}>{r.ok ? "Worked" : "Failed"}</Tag>
                    {r.message ? <p className="mt-1 text-ink-2">{r.message}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** I7.4: whether the bank's data is arriving, and how the recent runs went. S.4 when it isn't connected yet. */
export default function Integration() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Integration" description="Connect your bank's data and sign-in." />
      <IntegrationTabs />
      <Async result={result}>
        {(feed) =>
          feed.state === "not_connected" ? (
            <EmptyState title="Your bank's data isn't connected yet" action={{ to: ROUTES.mapping, label: "Match your columns" }}>
              <p>Until your file arrives, customers see only what they enter themselves. Start by matching the columns in your file to what Finous needs.</p>
            </EmptyState>
          ) : (
            <Status feed={feed} />
          )
        }
      </Async>
    </>
  );
}
