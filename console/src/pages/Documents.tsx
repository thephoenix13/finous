import { useApi } from "../api/context";
import type { ComplianceDocument } from "../api/types";
import { useApiData } from "../api/useApiData";
import { formatDate } from "../lib/format";
import { Card, PageHeader, Tag } from "../ui";
import { Async } from "../ui/States";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.documents(options);

function DocumentRow({ doc }: { doc: ComplianceDocument }) {
  const shared = doc.date !== null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold">{doc.title}</h2>
        <p className="mt-0.5 max-w-[60ch] text-[14px] text-ink-2">{doc.summary}</p>
        {shared ? (
          <p className="mt-1 text-[13px] text-ink-3">
            Version {doc.version}, dated {formatDate(doc.date!)}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <Tag tone={shared ? "positive" : "neutral"}>{shared ? "Shared" : "Not shared yet"}</Tag>
        {doc.href ? (
          <a href={doc.href} download className="text-[14px] font-medium text-brand-strong underline underline-offset-2">
            Download <span className="sr-only">{doc.title}</span>
          </a>
        ) : shared ? (
          <span className="text-[13px] text-ink-3">No download yet</span>
        ) : null}
      </div>
    </li>
  );
}

/** I9.4: the documents a bank's compliance team asks for first, each with its version and date. */
export default function Documents() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Compliance documents" description="What your compliance officer needs to review before customers use the app." />
      <Async result={result} blocks={2}>
        {(docs) => (
          <Card as="section">
            <ul className="divide-y divide-line">
              {docs.map((d) => (
                <DocumentRow key={d.id} doc={d} />
              ))}
            </ul>
          </Card>
        )}
      </Async>
    </>
  );
}
