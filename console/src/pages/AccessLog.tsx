import { useApi } from "../api/context";
import type { AccessLogEntry } from "../api/types";
import { useApiData } from "../api/useApiData";
import { toCsv } from "../lib/csv";
import { downloadText } from "../lib/download";
import { formatDateTime } from "../lib/format";
import { Button, PageHeader } from "../ui";
import { Async, EmptyState } from "../ui/States";
import { ComplianceTabs } from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.accessLog(options);

const exportLog = (entries: AccessLogEntry[]) =>
  downloadText(
    "staff-access-log.csv",
    toCsv(["When (IST)", "Staff member", "Customer", "Reference", "Reason"], entries.map((e) => [formatDateTime(e.at), e.staff, e.customer, e.ref, e.reason])),
  );

/** I9.2: who looked at whom, and why. Every opened customer and every export lands here. */
export default function AccessLog() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader
        title="Staff access log"
        description="Every time a staff member opened a customer or exported a list. Customers are shown shortened."
        actions={
          result.status === "ready" && result.data.length > 0 ? (
            <Button variant="ghost" onClick={() => exportLog(result.data)}>
              Export as CSV
            </Button>
          ) : undefined
        }
      />
      <ComplianceTabs />
      <Async result={result}>
        {(entries) =>
          entries.length === 0 ? (
            <EmptyState title="No one has opened a customer yet">
              <p>When staff open a customer who chose to share, or export a list, it appears here with their name and the time.</p>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-card border border-line bg-surface">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <caption className="sr-only">Staff access log, newest first</caption>
                <thead>
                  <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                    <th scope="col" className="px-4 py-3 font-semibold">When (IST)</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Staff member</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t border-line">
                      <td className="px-4 py-3 text-ink-2">{formatDateTime(e.at)}</td>
                      <td className="px-4 py-3 font-medium">{e.staff}</td>
                      <td className="px-4 py-3">
                        {e.customer}
                        {e.ref !== "—" ? <span className="block text-[12.5px] text-ink-3">{e.ref}</span> : null}
                      </td>
                      <td className="px-4 py-3">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Async>
    </>
  );
}
