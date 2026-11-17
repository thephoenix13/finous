import { useState } from "react";
import { useApi } from "../api/context";
import { useApiData } from "../api/useApiData";
import { formatCount, formatDateTime } from "../lib/format";
import { Card, PageHeader, Select, Tag } from "../ui";
import { Async, EmptyState } from "../ui/States";
import { ComplianceTabs } from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.consentLedger(options);

type Choice = "" | "sharing" | "stopped";

/** I9.1: who has agreed to share with the bank, and when that last changed. */
export default function Consents() {
  const result = useApiData(load);
  const [choice, setChoice] = useState<Choice>("");
  return (
    <>
      <PageHeader title="Consent ledger" description="Who has chosen to share with your bank, and when they last changed their mind." />
      <ComplianceTabs />
      <Async result={result}>
        {(ledger) => {
          const shown = ledger.changes.filter((c) => (choice === "" ? true : choice === "sharing" ? c.sharing : !c.sharing));
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <dl>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Sharing now</dt>
                    <dd className="mt-2 font-display text-[34px] leading-none">{formatCount(ledger.sharing)}</dd>
                  </dl>
                </Card>
                <Card>
                  <dl>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Shared, then stopped</dt>
                    <dd className="mt-2 font-display text-[34px] leading-none">{formatCount(ledger.stopped)}</dd>
                  </dl>
                </Card>
              </div>

              {ledger.changes.length === 0 ? (
                <EmptyState title="No one has chosen to share yet">
                  <p>When a customer turns sharing on in the app, it appears here with the time. Turning it off appears here too.</p>
                </EmptyState>
              ) : (
                <section aria-labelledby="changes">
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 id="changes" className="text-[16px] font-semibold">Latest changes</h2>
                      <p className="text-[13px] text-ink-3">The most recent {ledger.changes.length} changes, newest first. Not every customer.</p>
                    </div>
                    <Select
                      label="Show"
                      value={choice}
                      placeholder="All changes"
                      options={[
                        { value: "sharing", label: "Started sharing" },
                        { value: "stopped", label: "Stopped sharing" },
                      ]}
                      onChange={(e) => setChoice(e.target.value as Choice)}
                      className="w-[200px]"
                    />
                  </div>
                  <div className="overflow-x-auto rounded-card border border-line bg-surface">
                    <table className="w-full min-w-[560px] text-left text-[14px]">
                      <caption className="sr-only">Latest consent changes</caption>
                      <thead>
                        <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                          <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Choice</th>
                          <th scope="col" className="px-4 py-3 font-semibold">When (IST)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((c) => (
                          <tr key={c.id} className="border-t border-line">
                            <td className="px-4 py-3">
                              <span className="font-medium">{c.customer}</span>
                              <span className="block text-[12.5px] text-ink-3">{c.ref}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Tag tone={c.sharing ? "positive" : "neutral"}>{c.sharing ? "Started sharing" : "Stopped sharing"}</Tag>
                            </td>
                            <td className="px-4 py-3 text-ink-2">{formatDateTime(c.at)}</td>
                          </tr>
                        ))}
                        {shown.length === 0 ? (
                          <tr className="border-t border-line">
                            <td colSpan={3} className="px-4 py-6 text-center text-ink-2">
                              No changes of that kind in the latest ones.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          );
        }}
      </Async>
    </>
  );
}
