import { useCallback, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useSession } from "../auth/AuthProvider";
import { useApi } from "../api/context";
import type { ConsoleApi, FollowUp, OpportunityDetail, OpportunityStatus, RequestOptions, StaffMember } from "../api/types";
import { useApiData } from "../api/useApiData";
import { formatDateTime } from "../lib/format";
import { STATUS_LABEL, STATUSES } from "../lib/labels";
import { useSaver } from "../lib/useSaver";
import { opportunityRoute, ROUTES } from "../routes";
import { Card, PageHeader, Select, Tag, TextArea } from "../ui";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";

type Loaded = { opportunity: OpportunityDetail; history: FollowUp[]; people: StaffMember[] };

function LogForm({ loaded }: { loaded: Loaded }) {
  const api = useApi();
  const session = useSession();
  const [history, setHistory] = useState(loaded.history);
  const [status, setStatus] = useState<OpportunityStatus>(loaded.opportunity.status);
  const current = loaded.people.find((p) => p.name === loaded.opportunity.assignee);
  const [assigneeId, setAssigneeId] = useState(current?.id ?? "");
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const saver = useSaver();

  const noteError = note.trim().length < 5 ? "Write what happened, at least 5 characters." : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (noteError) return;
    const ok = await saver.run(async () => {
      const entry = await api.addFollowUp(loaded.opportunity.id, { status, note: note.trim(), assigneeId: assigneeId || null }, { staffId: session.staffId, name: session.name });
      setHistory((h) => [entry, ...h]);
    });
    if (ok) {
      setNote("");
      setAttempted(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <Card as="section">
        <h2 className="text-[16px] font-semibold">Add an update</h2>
        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          <Select label="Status" value={status} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} onChange={(e) => { setStatus(e.target.value as OpportunityStatus); saver.reset(); }} />
          <Select
            label="Assigned to"
            value={assigneeId}
            placeholder="Nobody yet"
            options={loaded.people.map((p) => ({ value: p.id, label: `${p.name} (${p.branch ?? "all branches"})` }))}
            onChange={(e) => { setAssigneeId(e.target.value); saver.reset(); }}
          />
          <TextArea label="What happened" value={note} error={attempted ? noteError : undefined} onChange={(e) => { setNote(e.target.value); saver.reset(); }} rows={4} hint="Notes are kept with the customer's record. Don't put account numbers or phone numbers here." />
          <SaveBar state={saver.state} label="Add update" />
        </form>
      </Card>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-[16px] font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="text-ink-2">Nothing yet. The first update starts the log.</p>
        ) : (
          <ol aria-label="Follow-up history, newest first" className="space-y-3">
            {history.map((f) => (
              <li key={f.id} className="rounded-card border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Tag>{STATUS_LABEL[f.status]}</Tag>
                  <span className="text-[13px] text-ink-3">
                    {f.by}, {formatDateTime(f.at)}
                  </span>
                </div>
                <p className="mt-2 text-[14px]">{f.note}</p>
                {f.assignee ? <p className="mt-1 text-[13px] text-ink-3">Assigned to {f.assignee}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/** I3.3: what has happened with this customer, and a way to add the next step. */
export default function FollowUpLog() {
  const { id = "" } = useParams();
  const session = useSession();
  const { staffId, name } = session;
  const load = useCallback(
    async (api: ConsoleApi, options: RequestOptions): Promise<Loaded> => {
      // The screen shows the customer, so opening it is a logged view, the same as the detail screen.
      const [opportunity, history, directory] = await Promise.all([api.opportunity(id, { staffId, name }, options), api.followUps(id, options), api.staff(options)]);
      return { opportunity, history, people: directory.members.filter((m) => m.status === "active") };
    },
    [id, staffId, name],
  );
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
        {(loaded) => (
          <>
            <PageHeader title={`Follow-up: ${loaded.opportunity.customer}`} description={`${loaded.opportunity.ref}. Track what was said and who does what next.`} />
            <LogForm key={id} loaded={loaded} />
            <p className="mt-8 text-[14px]">
              <Link to={opportunityRoute(id)} className="font-medium text-brand-strong underline underline-offset-2">
                Back to {loaded.opportunity.customer}
              </Link>
            </p>
          </>
        )}
      </Async>
      <p className="mt-2 text-[14px]">
        <Link to={ROUTES.opportunities} className="font-medium text-brand-strong underline underline-offset-2">
          Back to the opportunities
        </Link>
      </p>
    </>
  );
}
