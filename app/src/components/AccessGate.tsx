import { useEffect } from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import MemberHome from "../pages/MemberHome";
import BrandSplash from "./BrandSplash";

/** Sends people to the right place: sign in, consent, their own space, or the demo. Wraps every screen of the app proper. */
export default function AccessGate() {
  const { access } = useAuth();
  switch (access) {
    case "loading":
      return <BrandSplash />;
    case "needs-signin":
      return <Navigate to="/signin" replace />;
    case "needs-consent":
      return <Navigate to="/join" replace />;
    case "member":
      return <MemberHome />;
    case "demo":
      return <Outlet />;
  }
}

/** /demo: turns the demo on and goes to Home. A link to share with partners. */
export function EnterDemo() {
  const { enterDemo, canSignIn, access } = useAuth();
  useEffect(() => {
    if (canSignIn) enterDemo();
  }, [canSignIn, enterDemo]);
  // Wait until the demo is on, or the gate would bounce the person to sign-in first.
  return access === "demo" ? <Navigate to="/" replace /> : <BrandSplash />;
}
