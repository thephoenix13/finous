import { AREA_LABEL, ROLE_LABEL, rolesThatCanOpen, type Area, type Role } from "../lib/access";
import { ROUTES } from "../routes";
import { ButtonLink } from "../ui";

/** Shown in place of a screen the signed-in role can't open: what is blocked, who to ask, and a way back. */
export default function NoAccess({ area, role }: { area: Area; role: Role }) {
  const who = rolesThatCanOpen(area).map((r) => ROLE_LABEL[r]);
  return (
    <div className="mx-auto max-w-[48ch] py-16 text-center">
      <h1 className="font-display text-[26px] leading-tight">You don't have access to {AREA_LABEL[area]}</h1>
      <p className="mt-3 text-ink-2">
        You are signed in with the {ROLE_LABEL[role]} role. {AREA_LABEL[area]} is open to these roles: {who.join(", ")}.
      </p>
      <p className="mt-3 text-ink-2">Ask an Admin at your bank if you need it. They can change your role.</p>
      <div className="mt-8 flex justify-center">
        <ButtonLink to={ROUTES.overview}>Back to the overview</ButtonLink>
      </div>
    </div>
  );
}
