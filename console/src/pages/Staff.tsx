import { useLocation } from "react-router";
import { useApi } from "../api/context";
import type { StaffMember } from "../api/types";
import { useApiData } from "../api/useApiData";
import { ROLE_LABEL } from "../lib/access";
import { formatDate } from "../lib/format";
import { ROUTES } from "../routes";
import { ButtonLink, PageHeader, Tag } from "../ui";
import { Async, Notice } from "../ui/States";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.staff(options);

function Row({ member }: { member: StaffMember }) {
  return (
    <tr className="border-t border-line">
      <td className="px-4 py-3 font-medium">{member.name ?? <span className="font-normal text-ink-3">Not signed in yet</span>}</td>
      <td className="px-4 py-3 text-ink-2">{member.email}</td>
      <td className="px-4 py-3">{ROLE_LABEL[member.role]}</td>
      <td className="px-4 py-3">{member.branch ?? "All branches"}</td>
      <td className="px-4 py-3 text-ink-2">{member.lastActive ? formatDate(member.lastActive) : "Never"}</td>
      <td className="px-4 py-3">
        <Tag tone={member.status === "invited" ? "warning" : "positive"}>{member.status === "invited" ? "Invited" : "Active"}</Tag>
      </td>
    </tr>
  );
}

/** I8.1: who has access to the console, and in which role. */
export default function Staff() {
  const result = useApiData(load);
  const invited = (useLocation().state as { invited?: unknown } | null)?.invited;
  return (
    <>
      <PageHeader title="Team" description="Everyone with access to this console, and what each role is for." actions={<ButtonLink to={ROUTES.invite}>Invite staff</ButtonLink>} />
      {typeof invited === "string" ? <Notice>Invitation sent to {invited}.</Notice> : null}
      <Async result={result}>
        {({ members }) => (
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[720px] text-left text-[14px]">
              <caption className="sr-only">Staff with access to the console</caption>
              <thead>
                <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                  <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Branch</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last active</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <Row key={m.id} member={m} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>
    </>
  );
}
