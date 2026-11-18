import { useEffect } from "react";
import { useMemberData } from "../api/memberContext";
import { useAuth } from "../auth/AuthProvider";
import { useBank } from "./BankProvider";

/** People already recorded as customers of a bank during this visit, so moving around the app does not ask the database again. */
const arrived = new Set<string>();

/** For tests, which start every case with nobody having arrived. */
export const forgetArrivals = () => arrived.clear();

/**
 * Records that a signed-in member came to a bank's app through its address, once per visit: that is what makes them one of the
 * bank's customers, and it is all that it does. Nothing about them reaches the bank by this: it can see a customer only when that
 * customer has turned sharing on. If it fails, nothing is lost: it is tried again at the next visit, and turning sharing on joins as well.
 * Renders nothing, and does nothing on Finous's own address.
 */
export default function BankArrival() {
  const bank = useBank();
  const data = useMemberData();
  const userId = useAuth().session?.userId;
  const bankId = bank?.id;
  const sharing = data?.bankSharing;

  useEffect(() => {
    if (!bankId || !sharing || !userId) return;
    const key = `${userId}.${bankId}`;
    if (arrived.has(key)) return;
    arrived.add(key);
    // A failed join is forgotten, so the next visit tries again rather than never.
    sharing.join(bankId).catch(() => arrived.delete(key));
  }, [bankId, sharing, userId]);

  return null;
}
