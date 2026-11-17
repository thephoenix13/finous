import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useSession } from "../auth/AuthProvider";
import { useApi } from "../api/context";
import type { ConsoleApi, Opportunity, OpportunityFilter, OpportunityStatus, OpportunityType, Product, RequestOptions } from "../api/types";
import { useApiData } from "../api/useApiData";
import { toCsv } from "../lib/csv";
import { downloadText } from "../lib/download";
import { formatDate } from "../lib/format";
import { STATUS_LABEL, STATUSES, TYPE_LABEL, TYPES } from "../lib/labels";
import { ROUTES, opportunityRoute } from "../routes";
import { Button, PageHeader, Select, Tag } from "../ui";
import { Async, EmptyState, Notice } from "../ui/States";

type Loaded = { feedConnected: boolean; items: Opportunity[]; products: Product[]; branches: string[] };

const asType = (v: string | null): OpportunityType | undefined => (TYPES as string[]).includes(v ?? "") ? (v as OpportunityType) : undefined;
const asStatus = (v: string | null): OpportunityStatus | undefined => (STATUSES as string[]).includes(v ?? "") ? (v as OpportunityStatus) : undefined;

const STATUS_TONE = { new: "warning", contacted: "neutral", interested: "positive", closed: "neutral" } as const;

/** The file a branch manager or marketer takes away. Names are shortened and no figures or phone numbers go in it. */
function csvOf(rows: Opportunity[], products: Product[]): string {
  return toCsv(
    ["Reference", "Customer", "Type", "Matched product", "Status", "Branch", "Detected on", "Assigned to"],
    rows.map((o) => [o.ref, o.customer, TYPE_LABEL[o.type], products.find((p) => p.id === o.productId)?.name ?? "", STATUS_LABEL[o.status], o.branch, o.detectedAt.slice(0, 10), o.assignee ?? ""]),
  );
}

/** I3.1: customers who chose to share and could use a product. S.4 while no data has arrived from the bank. */
export default function Opportunities() {
  const api = useApi();
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [exported, setExported] = useState<string | null>(null);
  const [exportError, setExportError] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Branch staff only ever see their own branch. The server must enforce it too; this keeps the screen honest.
  const locked = session.role === "branch" && session.branch !== null;
  const filter: OpportunityFilter = {
    type: asType(params.get("type")),
    status: asStatus(params.get("status")),
    branch: locked ? session.branch! : params.get("branch") || undefined,
  };
  const { type, status, branch } = filter;

  const load = useCallback(
    async (a: ConsoleApi, options: RequestOptions): Promise<Loaded> => {
      const [list, products, directory] = await Promise.all([a.opportunities({ type, status, branch }, options), a.products(options), a.staff(options)]);
      return { ...list, products, branches: directory.branches };
    },
    [type, status, branch],
  );
  const result = useApiData(load);

  const setFilter = (key: "type" | "status" | "branch", value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setExported(null);
  };
  const filtered = Boolean(type || status || (!locked && branch));

  async function exportList(products: Product[]) {
    if (exporting) return;
    setExporting(true);
    setExportError(false);
    setExported(null);
    try {
      const rows = await api.exportOpportunities(filter, { staffId: session.staffId, name: session.name });
      downloadText("opportunities.csv", csvOf(rows, products));
      setExported(`Exported ${rows.length} ${rows.length === 1 ? "customer" : "customers"}. This was added to the staff access log.`);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader title="Opportunities" description="Customers who chose to share, and could use one of your products." />
      <Notice>Only customers who chose to share are listed. Opening one, or exporting the list, is added to the staff access log.</Notice>
      <Async result={result}>
        {({ feedConnected, items, products, branches }) => {
          if (!feedConnected) {
            return (
              <EmptyState title="Nothing to show until your data arrives" action={{ to: ROUTES.integration, label: "Set up the data feed" }}>
                <p>Opportunities come from your bank's data, together with what customers choose to share. Connect the feed first.</p>
              </EmptyState>
            );
          }
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end gap-4">
                <Select label="Type" value={type ?? ""} placeholder="All types" options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} onChange={(e) => setFilter("type", e.target.value)} className="w-[200px]" />
                <Select label="Status" value={status ?? ""} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} onChange={(e) => setFilter("status", e.target.value)} className="w-[180px]" />
                {locked ? (
                  <p className="pb-2.5 text-[14px] text-ink-2">Showing {session.branch} only.</p>
                ) : (
                  <Select label="Branch" value={branch ?? ""} placeholder="All branches" options={branches.map((b) => ({ value: b, label: b }))} onChange={(e) => setFilter("branch", e.target.value)} className="w-[220px]" />
                )}
                <div className="ml-auto flex items-center gap-3">
                  <p className="text-[14px] text-ink-2">
                    {items.length} {items.length === 1 ? "customer" : "customers"}
                  </p>
                  <Button variant="ghost" loading={exporting} disabled={items.length === 0} onClick={() => void exportList(products)}>
                    Export as CSV
                  </Button>
                </div>
              </div>
              {exported ? <p role="status" className="text-[14px] text-positive">{exported}</p> : null}
              {exportError ? (
                <p role="alert" className="text-[14px] text-negative">
                  The export didn't work, and nothing was downloaded. Try again.
                </p>
              ) : null}

              {items.length === 0 ? (
                <EmptyState title={filtered ? "No opportunities match these filters" : "No opportunities yet"}>
                  <p>{filtered ? "Try a different type, status or branch." : "They appear here when a customer who chose to share could use one of your products."}</p>
                  {filtered ? (
                    <div className="mt-5 flex justify-center">
                      <Button variant="quiet" onClick={() => setParams({}, { replace: true })}>
                        Clear the filters
                      </Button>
                    </div>
                  ) : null}
                </EmptyState>
              ) : (
                <div className="overflow-x-auto rounded-card border border-line bg-surface">
                  <table className="w-full min-w-[860px] text-left text-[14px]">
                    <caption className="sr-only">Opportunities, newest first</caption>
                    <thead>
                      <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                        <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Matched product</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Branch</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Detected</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Assigned to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((o) => (
                        <tr key={o.id} className="border-t border-line align-top">
                          <td className="px-4 py-3">
                            <Link to={opportunityRoute(o.id)} className="font-medium text-brand-strong underline underline-offset-2">
                              {o.customer}
                            </Link>
                            <span className="block text-[12.5px] text-ink-3">{o.ref}</span>
                          </td>
                          <td className="px-4 py-3">{TYPE_LABEL[o.type]}</td>
                          <td className="px-4 py-3">{products.find((p) => p.id === o.productId)?.name ?? <span className="text-ink-3">None in your catalogue</span>}</td>
                          <td className="px-4 py-3">
                            <Tag tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Tag>
                          </td>
                          <td className="px-4 py-3">{o.branch}</td>
                          <td className="px-4 py-3 text-ink-2">{formatDate(o.detectedAt)}</td>
                          <td className="px-4 py-3">{o.assignee ?? <span className="text-ink-3">Nobody yet</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        }}
      </Async>
    </>
  );
}
