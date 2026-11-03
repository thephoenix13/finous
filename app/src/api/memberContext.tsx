import { createContext, useContext, type ReactNode } from "react";
import type { MemberData } from "./memberData";

const MemberDataContext = createContext<MemberData | null>(null);

/** Wrapped around the app proper for a signed-in member. */
export function MemberDataProvider({ data, children }: { data: MemberData; children: ReactNode }) {
  return <MemberDataContext.Provider value={data}>{children}</MemberDataContext.Provider>;
}

/** The member's own data and the way to change it, or null in the demo, where nothing can be changed and no form is shown. */
export function useMemberData(): MemberData | null {
  return useContext(MemberDataContext);
}
