import type { ReactNode } from "react";
import { useMemberData } from "../api/memberContext";
import { ButtonLink } from "./ui";

/** A way to add or change one's own details. Only a signed-in member sees it; the demo has nothing of its own to change. */
export default function MemberLink({ to, children }: { to: string; children: ReactNode }) {
  if (!useMemberData()) return null;
  return (
    <div className="px-5 pb-8 pt-2">
      <ButtonLink to={to} variant="ghost">
        {children}
      </ButtonLink>
    </div>
  );
}
