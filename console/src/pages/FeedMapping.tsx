import { useState, type FormEvent } from "react";
import { useApi } from "../api/context";
import type { DryRun, FeedMapping as FeedMappingData } from "../api/types";
import { useApiData } from "../api/useApiData";
import { checkMapping, compactMapping } from "../lib/mapping";
import { useSaver } from "../lib/useSaver";
import { Button, Card, PageHeader, Select, Tag } from "../ui";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";
import { IntegrationTabs } from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.feedMapping(options);

function TestResult({ result }: { result: DryRun }) {
  return (
    <div role="status" className="mt-5 space-y-5">
      <p className="text-[15px] font-medium">
        Test finished: {result.accepted} of {result.rowsRead} rows accepted, {result.rejected.length} left out.
      </p>
      {result.rejected.length > 0 ? (
        <div>
          <h3 className="mb-2 text-[14px] font-semibold">Left out</h3>
          <ul className="space-y-1 text-[14px] text-ink-2">
            {result.rejected.map((r) => (
              <li key={r.row}>
                Row {r.row}: {r.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.preview.length > 0 ? (
        <div>
          <h3 className="mb-2 text-[14px] font-semibold">The first accepted customer, as Finous would hold it</h3>
          <dl className="grid max-w-[520px] grid-cols-[1fr_1.4fr] gap-x-6 gap-y-1.5 rounded-card border border-line bg-surface p-4 text-[14px]">
            {result.preview.map((p) => (
              <div key={p.field} className="contents">
                <dt className="text-ink-3">{p.field}</dt>
                <dd>{p.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function MappingForm({ initial }: { initial: FeedMappingData }) {
  const api = useApi();
  const [mapping, setMapping] = useState<Record<string, string>>(initial.mapping);
  const [test, setTest] = useState<DryRun | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState(false);
  const saver = useSaver();

  const check = checkMapping(initial.fields, mapping);
  const columnsUsed = new Set(Object.values(mapping).filter(Boolean));
  const change = (key: string, column: string) => {
    setMapping((m) => ({ ...m, [key]: column }));
    setTest(null);
    saver.reset();
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (Object.keys(check.shared).length > 0) return;
    await saver.run(() => api.saveFeedMapping(compactMapping(mapping)));
  }

  async function runTest() {
    if (testing || !check.ok) return;
    setTesting(true);
    setTestError(false);
    try {
      setTest(await api.dryRun(compactMapping(mapping)));
    } catch {
      setTestError(true);
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <section aria-labelledby="match">
        <h2 id="match" className="mb-1 text-[18px] font-semibold">Match your columns</h2>
        <p className="mb-5 max-w-[64ch] text-ink-2">
          Pick the column in your file that holds each thing Finous needs. Columns you leave out, such as phone numbers, are never read.
        </p>
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <caption className="sr-only">Match each thing Finous needs to a column in your file</caption>
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                <th scope="col" className="px-4 py-3 font-semibold">What Finous needs</th>
                <th scope="col" className="w-[260px] px-4 py-3 font-semibold">Column in your file</th>
              </tr>
            </thead>
            <tbody>
              {initial.fields.map((f) => {
                const column = mapping[f.key] ?? "";
                const shared = column ? check.shared[column] : undefined;
                return (
                  <tr key={f.key} className="border-t border-line align-top">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="font-medium">{f.label}</span> {f.required ? <Tag>Required</Tag> : null}
                      <span className="mt-0.5 block text-[13px] text-ink-3">{f.hint}</span>
                    </th>
                    <td className="px-4 py-3">
                      <Select
                        label={f.label}
                        value={column}
                        placeholder="Not matched"
                        options={initial.columns.map((c) => ({ value: c, label: c }))}
                        onChange={(e) => change(f.key, e.target.value)}
                        error={shared ? `Also used for ${shared.filter((l) => l !== f.label).join(", ")}.` : undefined}
                        className="[&>label]:sr-only"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-ink-3">
          {check.missing.length > 0 ? `Still to match: ${check.missing.join(", ")}.` : `Everything required is matched. ${columnsUsed.size} columns will be read.`}
        </p>
        <SaveBar state={saver.state} label="Save mapping" disabled={Object.keys(check.shared).length > 0} />
      </section>

      <Card as="section">
        <h2 className="text-[18px] font-semibold">Test with sample customers</h2>
        <p className="mt-1 max-w-[64ch] text-ink-2">Runs your matching over a sample file of test customers. It touches no real customer, so it is safe to run as often as you like.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button onClick={() => void runTest()} loading={testing} disabled={!check.ok}>
            Run a test
          </Button>
          {!check.ok ? <p className="text-[13px] text-ink-3">{check.missing.length > 0 ? "Match every required column first." : "Give each column to one thing only."}</p> : null}
        </div>
        {testError ? (
          <p role="alert" className="mt-4 text-[14px] text-negative">
            The test couldn't run just now. Nothing was changed. Try again.
          </p>
        ) : null}
        {test ? <TestResult result={test} /> : null}
      </Card>
    </form>
  );
}

/** I7.5: match the bank's columns to Finous's, then try it on test customers before anything real arrives. */
export default function FeedMapping() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Integration" description="Connect your bank's data and sign-in." />
      <IntegrationTabs />
      <Async result={result}>{(data) => <MappingForm initial={data} />}</Async>
    </>
  );
}
