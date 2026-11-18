import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { useMemberData } from "../api/memberContext";
import { useAuth } from "../auth/AuthProvider";
import BrandSplash from "../components/BrandSplash";
import { saidNotNow } from "./asked";
import { useBank } from "./BankProvider";

/** Bank and member pairs already known to be settled this visit, so coming back to the front door does not ask the database again. */
const settled = new Set<string>();

/** For tests, which start every case with nothing known. */
export const forgetSettled = () => settled.clear();

/**
 * Puts the sharing question to a member of a bank's app once: before they have answered either way, and have not said "Not now",
 * the front door becomes the question. Everything else lets them through. If the answer cannot be found out, they are let through
 * too: not being able to ask must never lock someone out of their own money, and nothing is shared unless they said yes.
 */
export default function BankAsk({ children }: { children: ReactNode }) {
  const bank = useBank();
  const data = useMemberData();
  const userId = useAuth().session?.userId;
  const key = bank && userId ? `${userId}.${bank.id}` : null;
  const [outcome, setOutcome] = useState<"checking" | "ask" | "go">(key && settled.has(key) ? "go" : "checking");

  const sharing = data?.bankSharing;
  const bankId = bank?.id;
  useEffect(() => {
    if (!key || !sharing || !bankId || !userId) return;
    if (settled.has(key)) {
      setOutcome("go");
      return;
    }
    let current = true;
    setOutcome("checking");
    sharing.read(bankId).then(
      (state) => {
        if (!current) return;
        if (state.history.length > 0 || saidNotNow(userId, bankId)) {
          settled.add(key);
          setOutcome("go");
        } else {
          setOutcome("ask");
        }
      },
      () => current && setOutcome("go"),
    );
    return () => {
      current = false;
    };
  }, [key, sharing, bankId, userId]);

  if (!key) return <>{children}</>;
  if (outcome === "checking") return <BrandSplash />;
  return outcome === "ask" ? <Navigate to="/you/bank" replace /> : <>{children}</>;
}
