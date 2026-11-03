import { Navigate, Outlet } from "react-router";
import { useMemberData } from "../../api/memberContext";

/** The screens that change a person's own details. The demo has no details of its own to change, so it goes home instead. */
export default function MemberOnly() {
  return useMemberData() ? <Outlet /> : <Navigate to="/" replace />;
}
