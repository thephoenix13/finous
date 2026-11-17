import { useState } from "react";
import { useSession } from "../auth/AuthProvider";
import { useApi } from "../api/context";
import type { CustomerRequest } from "../api/types";
import { useApiData } from "../api/useApiData";
import { formatDate } from "../lib/format";
import { Button, PageHeader, Tag } from "../ui";
import { Async, EmptyState, Notice } from "../ui/States";
import { ComplianceTabs } from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.customerRequests(options);

const KIND_LABEL = { export: "Export their data", delete: "Delete their data" } as const;

function Requests({ initial }: { initial: CustomerRequest[] }) {
  const api = useApi();
  const session = useSession();
  const [requests, setRequests] = useState(initial);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function complete(id: string) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await api.completeRequest(id, { staffId: session.staffId, name: session.name });
      setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: "done" } : r)));
      setConfirming(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (requests.length === 0) {
    return (
      <EmptyState title="No requests">
        <p>When a customer asks for their data, or asks to have it deleted, and it involves data your bank holds, the request appears here with a due date.</p>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {failed ? (
        <p role="alert" className="text-[14px] text-negative">
          We couldn't mark that done. Nothing was changed. Try again.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <caption className="sr-only">Customer requests</caption>
          <thead>
            <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
              <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
              <th scope="col" className="px-4 py-3 font-semibold">Request</th>
              <th scope="col" className="px-4 py-3 font-semibold">Received</th>
              <th scope="col" className="px-4 py-3 font-semibold">Due</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-4 py-3 font-medium">{r.ref}</td>
                <td className="px-4 py-3">{KIND_LABEL[r.kind]}</td>
                <td className="px-4 py-3 text-ink-2">{formatDate(r.receivedOn)}</td>
                <td className="px-4 py-3">{formatDate(r.dueOn)}</td>
                <td className="px-4 py-3">
                  <Tag tone={r.status === "done" ? "positive" : "warning"}>{r.status === "done" ? "Done" : "Open"}</Tag>
                </td>
                <td className="px-4 py-3">
                  {r.status === "open" ? (
                    confirming === r.id ? (
                      <div className="space-y-2">
                        <p className="max-w-[30ch] text-[13px] text-ink-2">Only mark this done once the data your bank holds has been {r.kind === "export" ? "sent to the customer" : "deleted"}.</p>
                        <div className="flex gap-2">
                          <Button loading={busy} onClick={() => void complete(r.id)}>
                            Yes, it's done <span className="sr-only">for {r.ref}</span>
                          </Button>
                          <Button variant="quiet" onClick={() => setConfirming(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="ghost" onClick={() => setConfirming(r.id)}>
                        Mark as done <span className="sr-only">for {r.ref}</span>
                      </Button>
                    )
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** I9.3: customers asking for their data, or for it to be deleted, where it involves what the bank holds. */
export default function CustomerRequests() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Customer requests" description="Customers who asked for their data, or asked for it to be deleted." />
      <ComplianceTabs />
      <Notice>Finous deals with the data Finous holds. This list is for the data your bank holds about the same customer.</Notice>
      <Async result={result}>{(requests) => <Requests initial={requests} />}</Async>
    </>
  );
}
