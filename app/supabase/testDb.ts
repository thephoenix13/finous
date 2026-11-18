import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Shared by the database tests: an in-memory Postgres (PGlite) with every migration applied, plus a stand-in for what Supabase provides
 * (the roles, auth.users and auth.uid()). Nothing here is part of the schema.
 */

export const MIGRATIONS = join(__dirname, "migrations");

export const SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export const ALICE = "11111111-1111-1111-1111-111111111111";
export const BOB = "22222222-2222-2222-2222-222222222222";

export async function bootDb(): Promise<PGlite> {
  const fresh = new PGlite();
  await fresh.exec(SHIM);
  for (const file of readdirSync(MIGRATIONS).sort()) await fresh.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  return fresh;
}

/** Runs `fn` as a signed-in user (Supabase's `authenticated` role with that user's id), or as a visitor who isn't signed in, then goes back to the superuser. */
export async function asUser<T>(db: PGlite, user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(user ? `set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false)` : `set role anon; select set_config('request.jwt.claim.sub', '', false)`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** The error message a statement fails with, or null if it works. */
export async function failure(db: PGlite, sql: string, params: unknown[] = []): Promise<string | null> {
  try {
    await db.query(sql, params);
  } catch (error) {
    return String((error as Error).message);
  }
  return null;
}
