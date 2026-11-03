import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "../auth/types";
import { createMemberApi, type MemberApi } from "./member";
import { createSupabaseMemberData, type MemberData } from "./memberData";
import { createSupabaseMemberSource } from "./memberSource";

/** What a signed-in member's screens run on: answers worked out from their own data, and the means to change that data. */
export type MemberEnv = { api: MemberApi; data: MemberData };

/** Builds the env for one signed-in person. Takes the client so tests can hand it a stand-in. */
export function createMemberEnv(supabase: SupabaseClient, session: Session): MemberEnv {
  const source = createSupabaseMemberSource(supabase, session);
  const api = createMemberApi(source);
  return { api, data: createSupabaseMemberData(supabase, session, () => source.load(), () => api.invalidate()) };
}
