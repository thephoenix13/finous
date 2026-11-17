import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../api/errors";
import { useApi } from "../api/context";
import type { StaffDirectory } from "../api/types";
import { useApiData } from "../api/useApiData";
import { ROLE_LABEL, ROLES, type Role } from "../lib/access";
import { useSaver } from "../lib/useSaver";
import { validateInvite } from "../lib/validate";
import { ROUTES } from "../routes";
import { Field, PageHeader, Select } from "../ui";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.staff(options);

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));
const ROLE_HINT: Record<Role, string> = {
  admin: "Everything, including branding, the team and billing.",
  compliance: "The overview, products, reports, and the compliance records.",
  marketing: "The overview, opportunities, campaigns, products and reports.",
  branch: "The overview and the opportunities for their branch.",
  readonly: "The overview and reports. Nothing can be changed.",
};

const ALL = "all";

function InviteForm({ directory }: { directory: StaffDirectory }) {
  const api = useApi();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [conflict, setConflict] = useState(false);
  const saver = useSaver();

  const errors = validateInvite({ email, role, branch }, directory.members.map((m) => m.email));
  const emailError = conflict ? "This person already has access or an open invitation." : errors.email;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    const sent = email.trim().toLowerCase();
    const ok = await saver.run(
      async () => {
        try {
          await api.inviteStaff({ email: sent, role: role as Role, branch: branch === ALL ? null : branch });
        } catch (e) {
          if (e instanceof ApiError && e.code === "conflict") setConflict(true);
          throw e;
        }
      },
      (e) => (e instanceof ApiError && e.code === "conflict" ? "This person already has access or an open invitation." : "We couldn't send the invitation. Your details are still here. Try again."),
    );
    if (ok) navigate(ROUTES.team, { state: { invited: sent } });
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-[520px] space-y-5">
      <Field
        label="Work email"
        type="email"
        value={email}
        error={attempted || conflict ? emailError : undefined}
        onChange={(e) => {
          setEmail(e.target.value);
          setConflict(false);
          saver.reset();
        }}
        autoComplete="off"
      />
      <Select label="Role" value={role} options={ROLE_OPTIONS} placeholder="Choose a role" error={attempted ? errors.role : undefined} hint={role ? ROLE_HINT[role as Role] : undefined} onChange={(e) => setRole(e.target.value)} />
      <Select
        label="Branch"
        value={branch}
        options={[{ value: ALL, label: "All branches" }, ...directory.branches.map((b) => ({ value: b, label: b }))]}
        placeholder="Choose a branch"
        error={attempted ? errors.branch : undefined}
        onChange={(e) => setBranch(e.target.value)}
      />
      <SaveBar state={saver.state} label="Send invitation" />
    </form>
  );
}

/** I8.2: add a person to the console with a role and a branch. */
export default function InviteStaff() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Invite staff" description="They get an email to set up their sign-in. You can see the invitation on the Team screen until they accept." />
      <Async result={result} blocks={2}>
        {(directory) => <InviteForm directory={directory} />}
      </Async>
      <p className="mt-8 text-[14px]">
        <Link to={ROUTES.team} className="font-medium text-brand-strong underline underline-offset-2">
          Back to the team
        </Link>
      </p>
    </>
  );
}
