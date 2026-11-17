import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useApi } from "../api/context";
import { useApiData } from "../api/useApiData";
import { formatDate } from "../lib/format";
import { KIND_LABEL } from "../lib/labels";
import { formatTerm } from "../lib/product";
import { editProductRoute, ROUTES } from "../routes";
import { ButtonLink, Field, PageHeader, Tag } from "../ui";
import { Async, EmptyState, Notice } from "../ui/States";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.products(options);

/** I5.1: the bank's loans and deposits, as customers will see them. */
export default function Products() {
  const result = useApiData(load);
  const [query, setQuery] = useState("");
  const savedName = (useLocation().state as { saved?: unknown } | null)?.saved;
  return (
    <>
      <PageHeader title="Products" description="Your loans and deposits, as customers see them." actions={<ButtonLink to={ROUTES.newProduct}>Add a product</ButtonLink>} />
      {typeof savedName === "string" ? <Notice>Saved {savedName}.</Notice> : null}
      <Notice>A product marked Live shows in the app as soon as you save it. Compliance approval before a change goes live is still to come.</Notice>
      <Async result={result}>
        {(products) => {
          if (products.length === 0) {
            return (
              <EmptyState title="No products yet" action={{ to: ROUTES.newProduct, label: "Add your first product" }}>
                <p>Customers see only the products you add here, marked as yours. Offers always say Learn more, never Apply.</p>
              </EmptyState>
            );
          }
          const q = query.trim().toLowerCase();
          const shown = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
          return (
            <div className="space-y-4">
              <Field label="Search products" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-[360px]" />
              <div className="overflow-x-auto rounded-card border border-line bg-surface">
                <table className="w-full min-w-[720px] text-left text-[14px]">
                  <caption className="sr-only">Your products</caption>
                  <thead>
                    <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                      <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Rate</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Term</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Last changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="px-4 py-3">
                          <Link to={editProductRoute(p.id)} className="font-medium text-brand-strong underline underline-offset-2">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{KIND_LABEL[p.kind]}</td>
                        <td className="px-4 py-3">{p.rate}% a year</td>
                        <td className="px-4 py-3">
                          {formatTerm(p.tenureMin)} to {formatTerm(p.tenureMax)}
                        </td>
                        <td className="px-4 py-3">
                          <Tag tone={p.live ? "positive" : "neutral"}>{p.live ? "Live" : "Draft"}</Tag>
                        </td>
                        <td className="px-4 py-3 text-ink-2">{formatDate(p.changedAt)}</td>
                      </tr>
                    ))}
                    {shown.length === 0 ? (
                      <tr className="border-t border-line">
                        <td colSpan={6} className="px-4 py-6 text-center text-ink-2">
                          No product matches "{query.trim()}".
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }}
      </Async>
    </>
  );
}
