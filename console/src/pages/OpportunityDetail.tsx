import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { useSession } from "../auth/AuthProvider";
import type { ConsoleApi, RequestOptions } from "../api/types";
import { useApiData } from "../api/useApiData";
import { formatDate, formatDateTime } from "../lib/format";
import { STATUS_LABEL, TYPE_LABEL } from "../lib/labels";
import { editProductRoute, followUpRoute, ROUTES } from "../routes";
import { ButtonLink, Card, PageHeader, Tag } from "../ui";
import { Async, Notice } from "../ui/States";

/** I3.2: why this customer, in what they chose to share. Opening it is logged, and the screen says so. */
export default function OpportunityDetail() {
  const { id = "" } = useParams();
  const session = useSession();
  const { staffId, name } = session;
  const load = useCallback((api: ConsoleApi, options: RequestOptions) => api.opportunity(id, { staffId, name }, options), [id, staffId, name]);
  const result = useApiData(load);
  return (
    <>
      <Async
        result={result}
        notFound={
          <div role="alert" className="py-8">
            <h1 className="font-display text-[26px]">We can't find that customer</h1>
            <p className="mt-2 text-ink-2">They may have stopped sharing with the bank, or the link may be old.</p>
          </div>
        }
      >
        {(o) => (
          <>
            <PageHeader
              title={o.customer}
              description={`${o.ref} · ${TYPE_LABEL[o.type]} · ${o.branch}`}
              actions={<ButtonLink to={followUpRoute(o.id)}>Open the follow-up log</ButtonLink>}
            />
            <Notice>This view is logged. Your name, the time and this customer are added to the staff access log.</Notice>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card as="section">
                <h2 className="text-[16px] font-semibold">What they shared</h2>
                <dl className="mt-3 divide-y divide-line text-[14px]">
                  {o.figures.map((f) => (
                    <div key={f.label} className="flex justify-between gap-6 py-2.5">
                      <dt className="text-ink-2">{f.label}</dt>
                      <dd className="font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <div className="space-y-6">
                <Card as="section">
                  <h2 className="text-[16px] font-semibold">Product to talk about</h2>
                  {o.productId && o.productName ? (
                    <p className="mt-2">
                      <Link to={editProductRoute(o.productId)} className="font-medium text-brand-strong underline underline-offset-2">
                        {o.productName}
                      </Link>
                    </p>
                  ) : (
                    <p className="mt-2 text-ink-2">
                      You have no product for this yet.{" "}
                      <Link to={ROUTES.newProduct} className="font-medium text-brand-strong underline underline-offset-2">
                        Add one to your catalogue
                      </Link>
                    </p>
                  )}
                </Card>
                <Card as="section">
                  <h2 className="text-[16px] font-semibold">Where it stands</h2>
                  <dl className="mt-3 divide-y divide-line text-[14px]">
                    <div className="flex justify-between gap-6 py-2.5">
                      <dt className="text-ink-2">Status</dt>
                      <dd>
                        <Tag>{STATUS_LABEL[o.status]}</Tag>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-6 py-2.5">
                      <dt className="text-ink-2">Detected</dt>
                      <dd>{formatDate(o.detectedAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-6 py-2.5">
                      <dt className="text-ink-2">Assigned to</dt>
                      <dd>{o.assignee ?? "Nobody yet"}</dd>
                    </div>
                    <div className="flex justify-between gap-6 py-2.5">
                      <dt className="text-ink-2">Last contact</dt>
                      <dd>{o.lastContact ? formatDateTime(o.lastContact) : "Not contacted yet"}</dd>
                    </div>
                  </dl>
                </Card>
              </div>
            </div>
          </>
        )}
      </Async>
      <p className="mt-8 text-[14px]">
        <Link to={ROUTES.opportunities} className="font-medium text-brand-strong underline underline-offset-2">
          Back to the opportunities
        </Link>
      </p>
    </>
  );
}
