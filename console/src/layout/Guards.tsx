import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth, useSession } from "../auth/AuthProvider";
import { canOpen, type Area } from "../lib/access";
import { ROUTES } from "../routes";
import { LoadingBlocks } from "../ui/States";
import NoAccess from "../pages/NoAccess";

/** Everything below this needs a signed-in staff member. Anyone else is sent to sign in, and back here afterwards. */
export function RequireSession() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-16">
        <LoadingBlocks blocks={2} />
      </div>
    );
  }
  if (state.status === "signed_out") return <Navigate to={ROUTES.signIn} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** A screen only some roles may open. Everyone else sees the no-access screen, which says what is blocked and who to ask. */
export function RequireArea({ area, children }: { area: Area; children: ReactNode }) {
  const session = useSession();
  return canOpen(session.role, area) ? <>{children}</> : <NoAccess area={area} role={session.role} />;
}
