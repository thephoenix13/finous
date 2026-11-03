import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * These tests run the real migrations in Postgres (PGlite, in memory) as different signed-in people, and try to break the rules:
 * reading or changing someone else's rows, writing as someone else, rewriting consent history, going in as anonymous.
 * The shim below stands in for the parts Supabase provides: the roles, auth.users and auth.uid().
 */

const MIGRATIONS = join(__dirname, "migrations");

const SHIM = `
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

const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

async function boot() {
  const fresh = new PGlite();
  await fresh.exec(SHIM);
  for (const file of readdirSync(MIGRATIONS).sort()) await fresh.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  return fresh;
}

/** Empties every table and signs up Alice and Bob again, so each test starts from the same two people. */
async function reset() {
  await db.exec(`reset role; truncate auth.users, public.market_rates cascade`);
  await db.exec(`insert into auth.users (id, email) values ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com')`);
}

/** Runs `fn` as a signed-in user (Supabase's `authenticated` role with that user's id), then goes back to the superuser. */
async function as<T>(user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(user ? `set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false)` : `set role anon; select set_config('request.jwt.claim.sub', '', false)`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`);
  }
}
const ok = (sql: string, params: unknown[] = []) => db.query(sql, params);
const fails = async (sql: string, params: unknown[] = []) => {
  try {
    await db.query(sql, params);
  } catch (error) {
    return String((error as Error).message);
  }
  return null;
};

const addAccount = (user: string, name = "HDFC Bank", kind = "bank") =>
  ok(`insert into accounts (user_id, kind, name, details) values ($1, $2, $3, '{"balance": 284000}') returning id`, [user, kind, name]).then((r) => (r.rows[0] as { id: string }).id);

beforeAll(async () => {
  db = await boot();
}, 60_000);
beforeEach(reset);

describe("the schema", () => {
  it("applies cleanly and every table in public has row level security on", async () => {
    const { rows } = await ok(`select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by relname`);
    expect((rows as { relname: string }[]).map((r) => r.relname)).toEqual(["accounts", "consents", "goals", "market_rates", "net_worth_snapshots", "profiles", "tax_inputs", "transactions"]);
    expect((rows as { relrowsecurity: boolean }[]).every((r) => r.relrowsecurity)).toBe(true);
  });

  it("gives a new sign-up a profile row, English by default", async () => {
    const { rows } = await ok(`select id, language from profiles order by id`);
    expect(rows).toEqual([
      { id: ALICE, language: "en" },
      { id: BOB, language: "en" },
    ]);
  });
});

describe("a person's own rows", () => {
  it("can add and read their accounts, and change and delete them", async () => {
    await as(ALICE, async () => {
      const id = (await ok(`insert into accounts (user_id, kind, name) values ($1, 'bank', 'SBI') returning id`, [ALICE])).rows[0] as { id: string };
      expect((await ok(`select name from accounts`)).rows).toEqual([{ name: "SBI" }]);
      expect((await ok(`update accounts set name = 'State Bank' where id = $1 returning name`, [id.id])).rows).toEqual([{ name: "State Bank" }]);
      expect((await ok(`delete from accounts where id = $1 returning id`, [id.id])).rows).toHaveLength(1);
    });
  });

  it("can set their language and name on their profile", async () => {
    await as(ALICE, async () => {
      await ok(`update profiles set language = 'hi', first_name = 'Alice' where id = $1`, [ALICE]);
      expect((await ok(`select language, first_name from profiles`)).rows).toEqual([{ language: "hi", first_name: "Alice" }]);
    });
  });

  it("moves updated_at forward when a row changes", async () => {
    const id = await addAccount(ALICE);
    const before = (await ok(`select updated_at from accounts where id = $1`, [id])).rows[0] as { updated_at: Date };
    await new Promise((r) => setTimeout(r, 15));
    await as(ALICE, () => ok(`update accounts set name = 'Renamed' where id = $1`, [id]));
    const after = (await ok(`select updated_at from accounts where id = $1`, [id])).rows[0] as { updated_at: Date };
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
  });
});

describe("someone else's rows", () => {
  it("cannot be read", async () => {
    await addAccount(ALICE, "Alice's bank");
    await ok(`insert into goals (user_id, name, target_amount, target_date) values ($1, 'Car', 500000, '2028-01-01')`, [ALICE]);
    await as(BOB, async () => {
      expect((await ok(`select * from accounts`)).rows).toEqual([]);
      expect((await ok(`select * from goals`)).rows).toEqual([]);
      expect((await ok(`select id from profiles`)).rows).toEqual([{ id: BOB }]);
    });
  });

  it("cannot be changed or deleted: the statement touches nothing", async () => {
    const id = await addAccount(ALICE, "Alice's bank");
    await as(BOB, async () => {
      expect((await ok(`update accounts set name = 'hacked' where id = $1 returning id`, [id])).rows).toEqual([]);
      expect((await ok(`delete from accounts where id = $1 returning id`, [id])).rows).toEqual([]);
      expect((await ok(`update profiles set first_name = 'hacked' where id = $1 returning id`, [ALICE])).rows).toEqual([]);
    });
    expect((await ok(`select name from accounts where id = $1`, [id])).rows).toEqual([{ name: "Alice's bank" }]);
  });

  it("cannot be written as: a row naming another user is refused", async () => {
    await as(BOB, async () => {
      expect(await fails(`insert into accounts (user_id, kind, name) values ($1, 'bank', 'Planted')`, [ALICE])).toMatch(/row-level security/);
      expect(await fails(`insert into goals (user_id, name, target_amount, target_date) values ($1, 'Planted', 1, '2030-01-01')`, [ALICE])).toMatch(/row-level security/);
    });
  });

  it("cannot be taken over by changing user_id", async () => {
    const id = await addAccount(BOB, "Bob's bank");
    await as(BOB, async () => {
      expect(await fails(`update accounts set user_id = $1 where id = $2`, [ALICE, id])).toMatch(/row-level security/);
    });
  });

  it("cannot have a transaction attached to an account the writer does not own", async () => {
    const aliceAccount = await addAccount(ALICE);
    await as(BOB, async () => {
      expect(await fails(`insert into transactions (user_id, account_id, occurred_on, description, amount) values ($1, $2, '2026-11-01', 'x', -100)`, [BOB, aliceAccount])).toMatch(/row-level security/);
    });
    const bobAccount = await addAccount(BOB);
    await as(BOB, async () => {
      expect(await fails(`insert into transactions (user_id, account_id, occurred_on, description, amount) values ($1, $2, '2026-11-01', 'ok', -100)`, [BOB, bobAccount])).toBeNull();
      expect(await fails(`insert into transactions (user_id, occurred_on, description, amount) values ($1, '2026-11-01', 'no account', -50)`, [BOB])).toBeNull();
    });
  });
});

describe("anonymous visitors", () => {
  it.each(["profiles", "consents", "accounts", "transactions", "goals", "tax_inputs", "net_worth_snapshots", "market_rates"])("cannot read %s", async (table) => {
    await addAccount(ALICE);
    await as(null, async () => {
      expect(await fails(`select * from ${table}`)).toMatch(/permission denied/);
    });
  });

  it("cannot insert anything, and cannot run the export or delete functions", async () => {
    await as(null, async () => {
      expect(await fails(`insert into accounts (user_id, kind, name) values ($1, 'bank', 'x')`, [ALICE])).toMatch(/permission denied/);
      expect(await fails(`select export_my_data()`)).toMatch(/permission denied/);
      expect(await fails(`select delete_my_account()`)).toMatch(/permission denied/);
    });
  });
});

describe("app consents (beta trial, privacy notice)", () => {
  it("can be recorded once per kind and version, and read back", async () => {
    await as(ALICE, async () => {
      expect(await fails(`insert into consents (user_id, kind, version) values ($1, 'beta-trial', '2026-11-beta-1')`, [ALICE])).toBeNull();
      expect(await fails(`insert into consents (user_id, kind, version) values ($1, 'beta-trial', '2026-11-beta-1')`, [ALICE])).toMatch(/duplicate key/);
      expect(await fails(`insert into consents (user_id, kind, version) values ($1, 'privacy-notice', '2026-11-1')`, [ALICE])).toBeNull();
      expect((await ok(`select kind, version from consents order by kind`)).rows).toEqual([
        { kind: "beta-trial", version: "2026-11-beta-1" },
        { kind: "privacy-notice", version: "2026-11-1" },
      ]);
    });
  });

  it("cannot be edited or removed by the person who gave them", async () => {
    await as(ALICE, async () => {
      await ok(`insert into consents (user_id, kind, version) values ($1, 'beta-trial', 'v1')`, [ALICE]);
      expect(await fails(`update consents set version = 'v2'`)).toMatch(/permission denied/);
      expect(await fails(`delete from consents`)).toMatch(/permission denied/);
    });
  });

  it("cannot be recorded for someone else, and an unknown kind is refused", async () => {
    await as(BOB, async () => {
      expect(await fails(`insert into consents (user_id, kind, version) values ($1, 'beta-trial', 'v1')`, [ALICE])).toMatch(/row-level security/);
      expect(await fails(`insert into consents (user_id, kind, version) values ($1, 'marketing', 'v1')`, [BOB])).toMatch(/check constraint/);
    });
  });
});

describe("shape checks", () => {
  it("refuses an unknown account kind, a zero-rupee transaction, a goal with no target and a bad financial year", async () => {
    await as(ALICE, async () => {
      expect(await fails(`insert into accounts (user_id, kind, name) values ($1, 'crypto', 'x')`, [ALICE])).toMatch(/check constraint/);
      expect(await fails(`insert into transactions (user_id, occurred_on, description, amount) values ($1, '2026-11-01', 'x', 0)`, [ALICE])).toMatch(/check constraint/);
      expect(await fails(`insert into goals (user_id, name, target_amount, target_date) values ($1, 'x', 0, '2030-01-01')`, [ALICE])).toMatch(/check constraint/);
      expect(await fails(`insert into tax_inputs (user_id, financial_year) values ($1, '2026')`, [ALICE])).toMatch(/check constraint/);
      expect(await fails(`insert into tax_inputs (user_id, financial_year, inputs) values ($1, '2026-27', '{"ppf": 42000}')`, [ALICE])).toBeNull();
    });
  });

  it("keeps one tax-input row per person per year, and one net-worth reading per day", async () => {
    await as(ALICE, async () => {
      await ok(`insert into tax_inputs (user_id, financial_year) values ($1, '2026-27')`, [ALICE]);
      expect(await fails(`insert into tax_inputs (user_id, financial_year) values ($1, '2026-27')`, [ALICE])).toMatch(/duplicate key/);
      await ok(`insert into net_worth_snapshots (user_id, taken_on, value) values ($1, '2026-11-04', 7641600)`, [ALICE]);
      expect(await fails(`insert into net_worth_snapshots (user_id, taken_on, value) values ($1, '2026-11-04', 1)`, [ALICE])).toMatch(/duplicate key/);
    });
  });
});

describe("market rates", () => {
  beforeEach(async () => {
    await ok(`insert into market_rates (key, value, as_of, source) values ('home-loan-market', 8.5, '2026-11-01', 'test')`);
  });

  it("can be read by anyone signed in, and nobody can change them", async () => {
    await as(ALICE, async () => {
      expect((await ok(`select key, value from market_rates`)).rows).toEqual([{ key: "home-loan-market", value: "8.500" }]);
      expect(await fails(`insert into market_rates (key, value, as_of, source) values ('x', 1, '2026-11-01', 'me')`)).toMatch(/permission denied/);
      expect(await fails(`update market_rates set value = 1`)).toMatch(/permission denied/);
      expect(await fails(`delete from market_rates`)).toMatch(/permission denied/);
    });
  });
});

describe("export and delete my data", () => {
  async function fill() {
    const a = await addAccount(ALICE, "Alice's bank");
    await addAccount(BOB, "Bob's bank");
    await ok(`insert into transactions (user_id, account_id, occurred_on, description, amount) values ($1, $2, '2026-11-01', 'Swiggy', -842)`, [ALICE, a]);
    await ok(`insert into goals (user_id, name, target_amount, target_date) values ($1, 'Car', 500000, '2028-01-01')`, [ALICE]);
    await ok(`insert into consents (user_id, kind, version) values ($1, 'beta-trial', 'v1')`, [ALICE]);
    await ok(`insert into goals (user_id, name, target_amount, target_date) values ($1, 'Bob goal', 1000, '2028-01-01')`, [BOB]);
  }

  it("export returns everything the person has, and nothing of anyone else's", async () => {
    await fill();
    const result = await as(ALICE, () => ok(`select export_my_data() as data`));
    const data = (result.rows[0] as { data: Record<string, unknown[] | Record<string, unknown>> }).data;
    expect(Object.keys(data).sort()).toEqual(["accounts", "consents", "exported_at", "goals", "net_worth_snapshots", "profile", "tax_inputs", "transactions"]);
    expect((data.accounts as { name: string }[]).map((x) => x.name)).toEqual(["Alice's bank"]);
    expect((data.goals as { name: string }[]).map((x) => x.name)).toEqual(["Car"]);
    expect((data.transactions as { description: string }[]).map((x) => x.description)).toEqual(["Swiggy"]);
    expect((data.consents as { kind: string }[]).map((x) => x.kind)).toEqual(["beta-trial"]);
    expect((data.profile as { id: string }).id).toBe(ALICE);
    expect(JSON.stringify(data)).not.toContain("Bob");
  });

  it("delete removes the person and every row of theirs, and leaves everyone else alone", async () => {
    await fill();
    await as(ALICE, () => ok(`select delete_my_account()`));
    for (const table of ["profiles", "accounts", "transactions", "goals", "consents"]) {
      const col = table === "profiles" ? "id" : "user_id";
      expect((await ok(`select count(*)::int as n from ${table} where ${col} = $1`, [ALICE])).rows, table).toEqual([{ n: 0 }]);
    }
    expect((await ok(`select count(*)::int as n from auth.users where id = $1`, [ALICE])).rows).toEqual([{ n: 0 }]);
    expect((await ok(`select count(*)::int as n from accounts where user_id = $1`, [BOB])).rows).toEqual([{ n: 1 }]);
    expect((await ok(`select count(*)::int as n from goals where user_id = $1`, [BOB])).rows).toEqual([{ n: 1 }]);
    expect((await ok(`select count(*)::int as n from auth.users where id = $1`, [BOB])).rows).toEqual([{ n: 1 }]);
  });

  it("delete takes no argument, so it can only ever delete the caller", async () => {
    const { rows } = await ok(`select pronargs from pg_proc where proname = 'delete_my_account'`);
    expect(rows).toEqual([{ pronargs: 0 }]);
  });
});
