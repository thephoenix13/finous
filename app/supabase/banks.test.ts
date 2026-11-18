import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ALICE, BOB, asUser, bootDb, failure } from "./testDb";

/**
 * The bank tables and functions, run in Postgres as customers, as bank staff of one bank or another, and as a visitor who isn't signed in.
 * The point of every test here is a way for one person or one bank to see something they must not, and the database saying no.
 */

const ASHA = "aaaaaaa1-0000-0000-0000-000000000001"; // admin, Sahyadri
const NEHA = "aaaaaaa2-0000-0000-0000-000000000002"; // marketing, Sahyadri
const SURESH = "aaaaaaa3-0000-0000-0000-000000000003"; // branch (Main), Sahyadri
const IMRAN = "aaaaaaa4-0000-0000-0000-000000000004"; // compliance, Sahyadri
const KAVITA = "aaaaaaa5-0000-0000-0000-000000000005"; // read-only, Sahyadri
const RAVI = "bbbbbbb1-0000-0000-0000-000000000001"; // admin, Harmony

let db: PGlite;
let sahyadri: string;
let harmony: string;
let draftco: string;

const as = <T>(user: string | null, fn: () => Promise<T>) => asUser(db, user, fn);
const ok = (sql: string, params: unknown[] = []) => db.query(sql, params);
const fails = (sql: string, params: unknown[] = []) => failure(db, sql, params);
type Row = Record<string, unknown>;
const rows = async (sql: string, params: unknown[] = []) => (await ok(sql, params)).rows as Row[];

const BANK_COLUMNS = `subdomain, name, install_name, brand_colour, on_brand_colour, disclaimer, status`;
const addBank = async (subdomain: string, name: string, status = "live", extra = "") =>
  ((await rows(`insert into banks (${BANK_COLUMNS}) values ($1, $2, $2, '#0B6E4F', '#FFFFFF', 'Finous gives information, not advice.', $3) ${extra} returning id`, [subdomain, name, status]))[0] as { id: string }).id;

const addStaff = (bank: string, user: string, role: string, branch: string | null = null) => ok(`insert into bank_staff (bank_id, user_id, role, branch) values ($1, $2, $3, $4)`, [bank, user, role, branch]);
const bankAccount = (user: string, bank: string, name: string, branch: string | null = "Main branch") =>
  ok(`insert into accounts (user_id, kind, name, source, bank_id, branch, details) values ($1, 'bank', $2, 'bank', $3, $4, '{"balance": 184500}')`, [user, name, bank, branch]);
const refOf = async (user: string, bank: string) => ((await rows(`select ref from bank_members where user_id = $1 and bank_id = $2`, [user, bank]))[0] as { ref: string }).ref;
const logRows = () => rows(`select staff_label, customer_ref, reason, customer_user_id from bank_access_log order by id`);

beforeAll(async () => {
  db = await bootDb();
}, 60_000);

beforeEach(async () => {
  await db.exec(`reset role; truncate auth.users, public.market_rates, public.banks cascade`);
  const people = [
    [ALICE, "alice@example.com", "Alice Pawar"],
    [BOB, "bob@example.com", "Bob"],
    [ASHA, "asha@sahyadri.example", "Asha Kulkarni"],
    [NEHA, "neha@sahyadri.example", "Neha Patil"],
    [SURESH, "suresh@sahyadri.example", "Suresh Pawar"],
    [IMRAN, "imran@sahyadri.example", "Imran Shaikh"],
    [KAVITA, "kavita@sahyadri.example", "Kavita Rao"],
    [RAVI, "ravi@harmony.example", "Ravi Menon"],
  ];
  for (const [id, email, name] of people) {
    await ok(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
    await ok(`update profiles set full_name = $2 where id = $1`, [id, name]);
  }
  sahyadri = await addBank("sahyadri", "Sahyadri Seva Bank");
  harmony = await addBank("harmony", "Harmony Co-operative Bank");
  draftco = await addBank("draftco", "Draft Bank", "draft");
  await addStaff(sahyadri, ASHA, "admin");
  await addStaff(sahyadri, NEHA, "marketing");
  await addStaff(sahyadri, SURESH, "branch", "Main branch");
  await addStaff(sahyadri, IMRAN, "compliance");
  await addStaff(sahyadri, KAVITA, "readonly");
  await addStaff(harmony, RAVI, "admin");
});

describe("a bank's own row", () => {
  it("takes a good bank, and refuses an address that is the wrong shape or reserved", async () => {
    for (const bad of ["ab", "-bad", "bad-", "Has-Caps", "has space", "x".repeat(31), "www", "admin", "console", "finous", "demo", "api"]) {
      expect(await fails(`insert into banks (${BANK_COLUMNS}) values ($1, 'X Bank', 'X Bank', '#0B6E4F', '#FFFFFF', 'Finous gives information.', 'live')`, [bad]), bad).toMatch(/check constraint/);
    }
    for (const good of ["abc", "seva-bank", "bank123", "a".repeat(30)]) {
      expect(await fails(`insert into banks (${BANK_COLUMNS}) values ($1, 'X Bank', 'X Bank', '#0B6E4F', '#FFFFFF', 'Finous gives information.', 'live')`, [good]), good).toBeNull();
    }
  });

  it("keeps an address to one bank", async () => {
    expect(await fails(`insert into banks (${BANK_COLUMNS}) values ('sahyadri', 'Copy', 'Copy', '#0B6E4F', '#FFFFFF', 'Finous gives information.', 'live')`)).toMatch(/duplicate key/);
  });

  it("refuses a colour that isn't six upper-case hex digits, a disclaimer of the wrong length, and both languages off", async () => {
    const insert = (patch: string) => fails(`insert into banks (subdomain, name, install_name, brand_colour, on_brand_colour, disclaimer, ${patch.split("|")[0]}) values ('newbank', 'New Bank', 'New', '#0B6E4F', '#FFFFFF', 'Finous gives information.', ${patch.split("|")[1]})`);
    expect(await fails(`insert into banks (subdomain, name, install_name, brand_colour, on_brand_colour, disclaimer) values ('b1', 'Bank One', 'One', 'green', '#FFFFFF', 'Finous gives information.')`)).toMatch(/check constraint/);
    expect(await fails(`insert into banks (subdomain, name, install_name, brand_colour, on_brand_colour, disclaimer) values ('b2', 'Bank Two', 'Two', '#0b6e4f', '#FFFFFF', 'Finous gives information.')`)).toMatch(/check constraint/);
    expect(await fails(`insert into banks (subdomain, name, install_name, brand_colour, on_brand_colour, disclaimer) values ('b3', 'Bank Three', 'Three', '#0B6E4F', '#FFF', 'Finous gives information.')`)).toMatch(/check constraint/);
    expect(await fails(`insert into banks (subdomain, name, install_name, brand_colour, on_brand_colour, disclaimer) values ('b4', 'Bank Four', 'Four', '#0B6E4F', '#FFFFFF', 'Too short')`)).toMatch(/check constraint/);
    expect(await insert("english, hindi|false, false")).toMatch(/check constraint/);
    expect(await insert("advisor|'robot'")).toMatch(/check constraint/);
    expect(await insert("status|'maybe'")).toMatch(/check constraint/);
  });

  it("takes a small data-URL image as a logo, and refuses anything else or anything huge", async () => {
    const set = (logo: string | null) => fails(`update banks set logo = $1 where id = $2`, [logo, sahyadri]);
    expect(await set("data:image/png;base64,iVBORw0KGgo=")).toBeNull();
    expect(await set("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
    expect(await set(null)).toBeNull();
    expect(await set("https://evil.example/logo.png")).toMatch(/check constraint/);
    expect(await set("javascript:alert(1)")).toMatch(/check constraint/);
    expect(await set("data:text/html;base64,PGgxPg==")).toMatch(/check constraint/);
    expect(await set(`data:image/png;base64,${"A".repeat(700_000)}`)).toMatch(/check constraint/);
  });

  it("moves updated_at forward when it changes", async () => {
    const before = (await rows(`select updated_at from banks where id = $1`, [sahyadri]))[0].updated_at as Date;
    await new Promise((r) => setTimeout(r, 15));
    await ok(`update banks set name = 'Sahyadri Seva' where id = $1`, [sahyadri]);
    expect(((await rows(`select updated_at from banks where id = $1`, [sahyadri]))[0].updated_at as Date).getTime()).toBeGreaterThan(before.getTime());
  });

  it("cannot be read, written or deleted by a customer, a member of staff or a visitor, directly", async () => {
    for (const user of [ALICE, ASHA, null]) {
      await as(user, async () => {
        expect(await fails(`select * from banks`), String(user)).toMatch(/permission denied/);
        expect(await fails(`update banks set name = 'Mine'`), String(user)).toMatch(/permission denied/);
        expect(await fails(`insert into banks (${BANK_COLUMNS}) values ('mine', 'Mine', 'Mine', '#0B6E4F', '#FFFFFF', 'Finous gives information.', 'live')`), String(user)).toMatch(/permission denied/);
        expect(await fails(`delete from banks`), String(user)).toMatch(/permission denied/);
      });
    }
  });

  it("cannot be deleted while customers hold rows against it", async () => {
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
    expect(await fails(`delete from banks where id = $1`, [sahyadri])).toMatch(/foreign key/);
  });
});

describe("branding for visitors: bank_public", () => {
  it("gives a signed-out visitor a live bank's branding, found by address, and nothing more", async () => {
    await ok(`update banks set logo = 'data:image/png;base64,iVBORw0KGgo=', hindi = false, advisor = 'off' where id = $1`, [sahyadri]);
    const result = await as(null, () => rows(`select * from bank_public('sahyadri')`));
    expect(result).toEqual([
      {
        id: sahyadri,
        subdomain: "sahyadri",
        name: "Sahyadri Seva Bank",
        install_name: "Sahyadri Seva Bank",
        logo: "data:image/png;base64,iVBORw0KGgo=",
        brand_colour: "#0B6E4F",
        on_brand_colour: "#FFFFFF",
        disclaimer: "Finous gives information, not advice.",
        english: true,
        hindi: false,
        advisor: "off",
      },
    ]);
  });

  it("gives nothing for a bank that isn't live, an unknown address, or a different spelling", async () => {
    await as(null, async () => {
      expect(await rows(`select * from bank_public('draftco')`)).toEqual([]);
      expect(await rows(`select * from bank_public('nobody')`)).toEqual([]);
      expect(await rows(`select * from bank_public('SAHYADRI')`)).toEqual([]);
      expect(await rows(`select * from bank_public('sahyadri ')`)).toEqual([]);
      expect(await rows(`select * from bank_public('')`)).toEqual([]);
      expect(await rows(`select * from bank_public(null)`)).toEqual([]);
      expect(await rows(`select * from bank_public('%')`)).toEqual([]);
    });
  });

  it("stops showing a bank the moment it goes back to draft", async () => {
    await ok(`update banks set status = 'draft' where id = $1`, [sahyadri]);
    expect(await as(ALICE, () => rows(`select * from bank_public('sahyadri')`))).toEqual([]);
  });

  it("offers no staff, member, sharing or log data through it", async () => {
    const { rows: cols } = await ok(`select pg_get_function_result(oid) as result from pg_proc where proname = 'bank_public'`);
    const text = String((cols[0] as { result: string }).result);
    for (const forbidden of ["status", "created", "user", "ref", "staff", "sharing", "email"]) expect(text, forbidden).not.toContain(forbidden);
  });
});

describe("joining a bank", () => {
  it("lets a signed-in person join a live bank once, and gives them a reference", async () => {
    await as(ALICE, async () => {
      await ok(`select join_bank($1)`, [sahyadri]);
      await ok(`select join_bank($1)`, [sahyadri]);
      const mine = await rows(`select bank_id, ref from bank_members`);
      expect(mine).toHaveLength(1);
      expect(mine[0].bank_id).toBe(sahyadri);
      expect(String(mine[0].ref)).toMatch(/^C-\d{4,}$/);
    });
  });

  it("gives each person at a bank their own reference, and keeps the same one for the same person", async () => {
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
    await as(BOB, () => ok(`select join_bank($1)`, [sahyadri]));
    const [a, b] = [await refOf(ALICE, sahyadri), await refOf(BOB, sahyadri)];
    expect(a).not.toBe(b);
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
    expect(await refOf(ALICE, sahyadri)).toBe(a);
  });

  it("lets one person join two banks, with a different reference at each", async () => {
    await as(ALICE, async () => {
      await ok(`select join_bank($1)`, [sahyadri]);
      await ok(`select join_bank($1)`, [harmony]);
    });
    expect(await rows(`select bank_id from bank_members where user_id = $1`, [ALICE])).toHaveLength(2);
    expect(await refOf(ALICE, sahyadri)).not.toBe(await refOf(ALICE, harmony));
  });

  it("refuses a bank that isn't live, one that doesn't exist, and a visitor who isn't signed in", async () => {
    await as(ALICE, async () => {
      expect(await fails(`select join_bank($1)`, [draftco])).toMatch(/bank not available/);
      expect(await fails(`select join_bank('99999999-9999-9999-9999-999999999999')`)).toMatch(/bank not available/);
    });
    await as(null, async () => {
      expect(await fails(`select join_bank($1)`, [sahyadri])).toMatch(/permission denied/);
    });
    expect(await rows(`select * from bank_members`)).toEqual([]);
  });

  it("can't be done by writing the table directly, for oneself or anyone", async () => {
    await as(ALICE, async () => {
      expect(await fails(`insert into bank_members (user_id, bank_id) values ($1, $2)`, [ALICE, sahyadri])).toMatch(/permission denied/);
      expect(await fails(`insert into bank_members (user_id, bank_id) values ($1, $2)`, [BOB, sahyadri])).toMatch(/permission denied/);
      expect(await fails(`update bank_members set bank_id = $1`, [harmony])).toMatch(/permission denied/);
      expect(await fails(`delete from bank_members`)).toMatch(/permission denied/);
    });
  });

  it("shows a person only their own memberships", async () => {
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
    await as(BOB, async () => {
      expect(await rows(`select * from bank_members`)).toEqual([]);
    });
    await as(ASHA, async () => {
      expect(await rows(`select * from bank_members`)).toEqual([]);
    });
  });
});

describe("sharing with a bank", () => {
  beforeEach(async () => {
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
  });

  const events = (bank = sahyadri) => rows(`select sharing from bank_sharing_events where bank_id = $1 and user_id = $2 order by seq`, [bank, ALICE]);
  const state = (user = ALICE, bank = sahyadri) => as(user, async () => (await rows(`select bank_sharing_state($1) as s`, [bank]))[0].s);

  it("starts off", async () => {
    expect(await state()).toBe(false);
    expect(await events()).toEqual([]);
  });

  it("turns on and off, and every real change is a row in the history", async () => {
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    expect(await state()).toBe(true);
    await as(ALICE, () => ok(`select set_bank_sharing($1, false)`, [sahyadri]));
    expect(await state()).toBe(false);
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    expect(await state()).toBe(true);
    expect(await events()).toEqual([{ sharing: true }, { sharing: false }, { sharing: true }]);
  });

  it("records nothing when the answer is what is already true, so Not now leaves no trace", async () => {
    await as(ALICE, () => ok(`select set_bank_sharing($1, false)`, [sahyadri]));
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    expect(await events()).toEqual([{ sharing: true }]);
  });

  it("takes the latest choice even when several are made in the same instant", async () => {
    await as(ALICE, async () => {
      await ok(`begin`);
      await ok(`select set_bank_sharing($1, true)`, [sahyadri]);
      await ok(`select set_bank_sharing($1, false)`, [sahyadri]);
      await ok(`select set_bank_sharing($1, true)`, [sahyadri]);
      await ok(`commit`);
    });
    expect(await state()).toBe(true);
    expect(await events()).toHaveLength(3);
  });

  it("is per bank: sharing with one says nothing about another", async () => {
    await as(ALICE, async () => {
      await ok(`select join_bank($1)`, [harmony]);
      await ok(`select set_bank_sharing($1, true)`, [sahyadri]);
    });
    expect(await state(ALICE, sahyadri)).toBe(true);
    expect(await state(ALICE, harmony)).toBe(false);
  });

  it("is refused for someone who hasn't joined, or a visitor who isn't signed in", async () => {
    await as(BOB, async () => {
      expect(await fails(`select set_bank_sharing($1, true)`, [sahyadri])).toMatch(/not a member/);
    });
    await as(null, async () => {
      expect(await fails(`select set_bank_sharing($1, true)`, [sahyadri])).toMatch(/permission denied/);
    });
    expect(await rows(`select * from bank_sharing_events where user_id = $1`, [BOB])).toEqual([]);
  });

  it("can't start with a bank that isn't live, but can always be stopped", async () => {
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    await ok(`update banks set status = 'draft' where id = $1`, [sahyadri]);
    await as(ALICE, async () => {
      expect(await fails(`select set_bank_sharing($1, true)`, [sahyadri])).toMatch(/bank not available/);
    });
    expect(await state()).toBe(true);
    await as(ALICE, () => ok(`select set_bank_sharing($1, false)`, [sahyadri]));
    expect(await state()).toBe(false);
    await as(ALICE, async () => {
      expect(await fails(`select set_bank_sharing($1, true)`, [sahyadri])).toMatch(/bank not available/);
    });
  });

  it("keeps the history out of everyone else's reach, and beyond editing by its owner", async () => {
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    await as(ALICE, async () => {
      expect(await rows(`select sharing from bank_sharing_events`)).toEqual([{ sharing: true }]);
      expect(await fails(`insert into bank_sharing_events (user_id, bank_id, sharing) values ($1, $2, false)`, [ALICE, sahyadri])).toMatch(/permission denied/);
      expect(await fails(`update bank_sharing_events set sharing = false`)).toMatch(/permission denied/);
      expect(await fails(`delete from bank_sharing_events`)).toMatch(/permission denied/);
    });
    for (const other of [BOB, ASHA]) {
      await as(other, async () => {
        expect(await rows(`select * from bank_sharing_events`)).toEqual([]);
        expect(await fails(`insert into bank_sharing_events (user_id, bank_id, sharing) values ($1, $2, true)`, [ALICE, sahyadri])).toMatch(/permission denied/);
      });
    }
  });

  it("takes no user as an argument, so a call can only ever act for the caller", async () => {
    const { rows: fns } = await ok(`select proname, pronargs, proargnames from pg_proc where proname in ('set_bank_sharing', 'join_bank', 'bank_sharing_state') order by proname`);
    expect(fns).toEqual([
      { proname: "bank_sharing_state", pronargs: 1, proargnames: ["p_bank"] },
      { proname: "join_bank", pronargs: 1, proargnames: ["p_bank"] },
      { proname: "set_bank_sharing", pronargs: 2, proargnames: ["p_bank", "p_sharing"] },
    ]);
  });

});

describe("accounts a bank supplied", () => {
  it("can be read by their owner, but not added, changed, deleted or taken over by them", async () => {
    await bankAccount(ALICE, sahyadri, "Sahyadri savings");
    await as(ALICE, async () => {
      expect(await rows(`select name, source from accounts`)).toEqual([{ name: "Sahyadri savings", source: "bank" }]);
      expect(await fails(`insert into accounts (user_id, kind, name, source, bank_id) values ($1, 'bank', 'Forged', 'bank', $2)`, [ALICE, sahyadri])).toMatch(/row-level security/);
      expect(await fails(`insert into accounts (user_id, kind, name, source) values ($1, 'bank', 'Forged', 'aa')`, [ALICE])).toMatch(/row-level security/);
      expect(await rows(`update accounts set name = 'Renamed' where source = 'bank' returning id`)).toEqual([]);
      expect(await rows(`delete from accounts where source = 'bank' returning id`)).toEqual([]);
    });
    expect(await rows(`select name from accounts`)).toEqual([{ name: "Sahyadri savings" }]);
  });

  it("can't be made out of a manual one, or turned back into one", async () => {
    await as(ALICE, async () => {
      const id = ((await rows(`insert into accounts (user_id, kind, name) values ($1, 'bank', 'Mine') returning id`, [ALICE]))[0] as { id: string }).id;
      expect(await fails(`update accounts set source = 'bank', bank_id = $1 where id = $2`, [sahyadri, id])).toMatch(/row-level security/);
      expect(await fails(`update accounts set bank_id = $1 where id = $2`, [sahyadri, id])).toMatch(/check constraint/);
    });
  });

  it("must name a bank, and only they may", async () => {
    expect(await fails(`insert into accounts (user_id, kind, name, source) values ($1, 'bank', 'No bank', 'bank')`, [ALICE])).toMatch(/check constraint/);
    expect(await fails(`insert into accounts (user_id, kind, name, bank_id) values ($1, 'bank', 'Manual with a bank', $2)`, [ALICE, sahyadri])).toMatch(/check constraint/);
  });

  it("leave a customer free to keep writing their own manual accounts exactly as before", async () => {
    await as(ALICE, async () => {
      const id = ((await rows(`insert into accounts (user_id, kind, name, source) values ($1, 'loan', 'Home loan', 'manual') returning id`, [ALICE]))[0] as { id: string }).id;
      expect(await rows(`update accounts set name = 'House loan' where id = $1 returning name`, [id])).toEqual([{ name: "House loan" }]);
      expect(await rows(`delete from accounts where id = $1 returning id`, [id])).toHaveLength(1);
    });
  });

  it("can't be read by someone else, even staff of the same bank, straight from the table", async () => {
    await bankAccount(ALICE, sahyadri, "Sahyadri savings");
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    for (const other of [BOB, ASHA, NEHA, IMRAN, RAVI]) {
      await as(other, async () => {
        expect(await rows(`select * from accounts`), other).toEqual([]);
      });
    }
  });
});

describe("what bank staff can see", () => {
  let aliceRef: string;
  let bobRef: string;

  beforeEach(async () => {
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
    await as(BOB, () => ok(`select join_bank($1)`, [sahyadri]));
    aliceRef = await refOf(ALICE, sahyadri);
    bobRef = await refOf(BOB, sahyadri);
    await bankAccount(ALICE, sahyadri, "Alice savings", "Main branch");
    await bankAccount(ALICE, sahyadri, "Alice home loan", "Main branch");
    await bankAccount(BOB, sahyadri, "Bob savings", "Station branch");
    await ok(`insert into accounts (user_id, kind, name) values ($1, 'bank', 'Alice typed this in')`, [ALICE]);
    await ok(`insert into accounts (user_id, kind, name) values ($1, 'bank', 'HDFC Bank, typed by Alice')`, [ALICE]);
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
  });

  describe("the list of customers who share", () => {
    it("holds only those sharing right now, by reference and shortened name", async () => {
      const list = await as(NEHA, () => rows(`select ref, short_name from staff_shared_customers($1)`, [sahyadri]));
      expect(list).toEqual([{ ref: aliceRef, short_name: "Alice P." }]);
    });

    it("drops a customer the moment they stop, and brings them back when they start again", async () => {
      await as(ALICE, () => ok(`select set_bank_sharing($1, false)`, [sahyadri]));
      expect(await as(NEHA, () => rows(`select ref from staff_shared_customers($1)`, [sahyadri]))).toEqual([]);
      await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
      expect(await as(NEHA, () => rows(`select ref from staff_shared_customers($1)`, [sahyadri]))).toHaveLength(1);
    });

    it("shows a customer with one word for a name as that word, and one with no name as the reference", async () => {
      await as(BOB, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
      await ok(`update profiles set full_name = null where id = $1`, [ALICE]);
      const list = await as(ASHA, () => rows(`select ref, short_name from staff_shared_customers($1)`, [sahyadri]));
      expect(list.map((r) => r.short_name).sort()).toEqual(["Bob", aliceRef].sort());
    });

    it("shows a branch member only customers with an account at their branch", async () => {
      await as(BOB, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
      expect(await as(SURESH, () => rows(`select ref from staff_shared_customers($1)`, [sahyadri]))).toEqual([{ ref: aliceRef }]);
      expect((await as(ASHA, () => rows(`select ref from staff_shared_customers($1)`, [sahyadri]))).map((r) => r.ref).sort()).toEqual([aliceRef, bobRef].sort());
    });

    it("is closed to Compliance and Read-only staff, to staff of another bank, to customers, and to visitors", async () => {
      for (const who of [IMRAN, KAVITA, RAVI, ALICE, BOB]) {
        await as(who, async () => {
          expect(await fails(`select * from staff_shared_customers($1)`, [sahyadri]), who).toMatch(/not allowed/);
        });
      }
      await as(null, async () => {
        expect(await fails(`select * from staff_shared_customers($1)`, [sahyadri])).toMatch(/permission denied/);
      });
    });

    it("is closed to a bank's own staff once the bank is not live", async () => {
      await ok(`update banks set status = 'draft' where id = $1`, [sahyadri]);
      await as(ASHA, async () => {
        expect(await fails(`select * from staff_shared_customers($1)`, [sahyadri])).toMatch(/not allowed/);
      });
    });

    it("shows another bank's staff nothing of this bank's customers, even for a customer of both", async () => {
      await as(ALICE, async () => {
        await ok(`select join_bank($1)`, [harmony]);
      });
      await bankAccount(ALICE, harmony, "Harmony savings", "Main branch");
      expect(await as(RAVI, () => rows(`select * from staff_shared_customers($1)`, [harmony]))).toEqual([]);
      await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [harmony]));
      const seen = await as(RAVI, () => rows(`select ref from staff_shared_customers($1)`, [harmony]));
      expect(seen).toEqual([{ ref: await refOf(ALICE, harmony) }]);
      expect(seen[0].ref).not.toBe(aliceRef);
    });
  });

  describe("opening one customer", () => {
    const open = (who: string, ref: string, bank = sahyadri) => as(who, () => rows(`select ref, short_name, accounts from staff_open_customer($1, $2)`, [bank, ref]));

    it("gives the accounts this bank supplied, and not what the customer typed in", async () => {
      const result = await open(NEHA, aliceRef);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ ref: aliceRef, short_name: "Alice P." });
      const names = (result[0].accounts as { name: string }[]).map((a) => a.name);
      expect(names).toEqual(["Alice savings", "Alice home loan"]);
      expect(JSON.stringify(result)).not.toContain("typed");
      expect(JSON.stringify(result)).not.toContain("HDFC");
    });

    it("gives no accounts from another bank", async () => {
      await as(ALICE, () => ok(`select join_bank($1)`, [harmony]));
      await bankAccount(ALICE, harmony, "Harmony savings");
      const names = ((await open(NEHA, aliceRef))[0].accounts as { name: string }[]).map((a) => a.name);
      expect(names).not.toContain("Harmony savings");
    });

    it("gives nothing for a customer who isn't sharing, one who doesn't exist and a reference from another bank, and the three look the same", async () => {
      expect(await open(NEHA, bobRef)).toEqual([]);
      expect(await open(NEHA, "C-0")).toEqual([]);
      await as(BOB, () => ok(`select join_bank($1)`, [harmony]));
      await as(BOB, () => ok(`select set_bank_sharing($1, true)`, [harmony]));
      expect(await open(NEHA, await refOf(BOB, harmony))).toEqual([]);
    });

    it("gives nothing the moment the customer stops", async () => {
      await as(ALICE, () => ok(`select set_bank_sharing($1, false)`, [sahyadri]));
      expect(await open(ASHA, aliceRef)).toEqual([]);
    });

    it("limits a branch member to their branch's accounts, and to customers with one", async () => {
      await as(BOB, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
      await bankAccount(ALICE, sahyadri, "Alice Station account", "Station branch");
      const mine = await open(SURESH, aliceRef);
      expect((mine[0].accounts as { name: string }[]).map((a) => a.name)).toEqual(["Alice savings", "Alice home loan"]);
      expect(await open(SURESH, bobRef)).toEqual([]);
      const all = await open(ASHA, aliceRef);
      expect((all[0].accounts as { name: string }[]).map((a) => a.name)).toContain("Alice Station account");
    });

    it("is closed to Compliance, Read-only, other banks' staff, customers and visitors", async () => {
      for (const who of [IMRAN, KAVITA, RAVI, ALICE, BOB]) {
        expect(await as(who, () => fails(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef])), who).toMatch(/not allowed/);
      }
      expect(await as(null, () => fails(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef]))).toMatch(/permission denied/);
      expect(await logRows()).toEqual([]);
    });

    it("writes the staff member, the customer's reference and the reason to the access log, and only when someone was shown", async () => {
      await open(NEHA, aliceRef);
      await open(NEHA, bobRef);
      await open(NEHA, "C-0");
      expect(await logRows()).toEqual([{ staff_label: "Neha Patil", customer_ref: aliceRef, reason: "Viewed customer", customer_user_id: ALICE }]);
    });

    it("writes a log row for the list too, with no customer", async () => {
      await as(NEHA, () => rows(`select * from staff_shared_customers($1)`, [sahyadri]));
      expect(await logRows()).toEqual([{ staff_label: "Neha Patil", customer_ref: null, reason: "Listed customers who share", customer_user_id: null }]);
    });

    it("can't be asked for with an injected reference", async () => {
      expect(await open(NEHA, "C-0' or true --")).toEqual([]);
      expect(await open(NEHA, "%")).toEqual([]);
    });
  });

  describe("staff and the tables underneath", () => {
    it("can't read any customer table directly, whatever their role", async () => {
      await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
      for (const who of [ASHA, NEHA, SURESH, IMRAN, KAVITA]) {
        await as(who, async () => {
          for (const table of ["accounts", "transactions", "goals", "monthly_figures", "tax_inputs", "net_worth_snapshots", "consents", "bank_members", "bank_sharing_events"]) {
            expect(await rows(`select * from ${table}`), `${who} ${table}`).toEqual([]);
          }
          expect(await rows(`select id from profiles`), who).toEqual([{ id: who }]);
        });
      }
    });

    it("can read only their own staff row", async () => {
      for (const who of [ASHA, NEHA, RAVI]) {
        await as(who, async () => {
          const mine = await rows(`select user_id from bank_staff`);
          expect(mine).toEqual([{ user_id: who }]);
        });
      }
      await as(ALICE, async () => {
        expect(await rows(`select * from bank_staff`)).toEqual([]);
      });
    });

    it("can't add or change staff, even an Admin making themselves more than they are", async () => {
      await as(ASHA, async () => {
        expect(await fails(`insert into bank_staff (bank_id, user_id, role) values ($1, $2, 'admin')`, [sahyadri, ALICE])).toMatch(/permission denied/);
        expect(await fails(`update bank_staff set role = 'admin'`)).toMatch(/permission denied/);
        expect(await fails(`delete from bank_staff`)).toMatch(/permission denied/);
      });
      await as(NEHA, async () => {
        expect(await fails(`update bank_staff set role = 'admin'`)).toMatch(/permission denied/);
      });
    });

    it("must give a branch member a branch, so they can't see everything by accident", async () => {
      expect(await fails(`insert into bank_staff (bank_id, user_id, role) values ($1, $2, 'branch')`, [sahyadri, ALICE])).toMatch(/check constraint/);
      expect(await fails(`insert into bank_staff (bank_id, user_id, role, branch) values ($1, $2, 'branch', 'Main branch')`, [sahyadri, ALICE])).toBeNull();
    });

    it("sees nothing as a branch member with no matching branch", async () => {
      await ok(`update bank_staff set branch = 'Nowhere branch' where user_id = $1`, [SURESH]);
      expect(await as(SURESH, () => rows(`select * from staff_shared_customers($1)`, [sahyadri]))).toEqual([]);
      expect(await as(SURESH, () => rows(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef]))).toEqual([]);
    });

    it("can only have a role from the list, and one row per person per bank", async () => {
      expect(await fails(`insert into bank_staff (bank_id, user_id, role) values ($1, $2, 'owner')`, [sahyadri, ALICE])).toMatch(/check constraint/);
      expect(await fails(`insert into bank_staff (bank_id, user_id, role) values ($1, $2, 'admin')`, [sahyadri, ASHA])).toMatch(/duplicate key/);
    });
  });

  describe("the consent ledger", () => {
    beforeEach(async () => {
      await as(BOB, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
      await as(BOB, () => ok(`select set_bank_sharing($1, false)`, [sahyadri]));
    });

    it("counts customers sharing and customers who stopped, and lists the latest changes newest first", async () => {
      const ledger = (await as(IMRAN, () => rows(`select staff_consent_ledger($1) as l`, [sahyadri])))[0].l as { sharing: number; stopped: number; changes: { ref: string; short_name: string; sharing: boolean }[] };
      expect(ledger.sharing).toBe(1);
      expect(ledger.stopped).toBe(1);
      expect(ledger.changes.map((c) => [c.ref, c.sharing])).toEqual([[bobRef, false], [bobRef, true], [aliceRef, true]]);
      expect(ledger.changes.map((c) => c.short_name)).toEqual(["Bob", "Bob", "Alice P."]);
    });

    it("is open to Admin and Compliance, and closed to everyone else", async () => {
      for (const who of [ASHA, IMRAN]) expect(await as(who, () => fails(`select staff_consent_ledger($1)`, [sahyadri])), who).toBeNull();
      for (const who of [NEHA, SURESH, KAVITA, RAVI, ALICE]) expect(await as(who, () => fails(`select staff_consent_ledger($1)`, [sahyadri])), who).toMatch(/not allowed/);
    });

    it("counts only this bank's customers", async () => {
      await as(ALICE, async () => {
        await ok(`select join_bank($1)`, [harmony]);
        await ok(`select set_bank_sharing($1, true)`, [harmony]);
      });
      const harmonyLedger = (await as(RAVI, () => rows(`select staff_consent_ledger($1) as l`, [harmony])))[0].l as { sharing: number; stopped: number };
      expect(harmonyLedger).toMatchObject({ sharing: 1, stopped: 0 });
    });

    it("is itself logged", async () => {
      await as(IMRAN, () => ok(`select staff_consent_ledger($1)`, [sahyadri]));
      expect(await logRows()).toEqual([{ staff_label: "Imran Shaikh", customer_ref: null, reason: "Viewed consent ledger", customer_user_id: null }]);
    });

    it("holds only the latest 50 changes", async () => {
      await as(ALICE, async () => {
        for (let i = 0; i < 30; i++) {
          await ok(`select set_bank_sharing($1, false)`, [sahyadri]);
          await ok(`select set_bank_sharing($1, true)`, [sahyadri]);
        }
      });
      const ledger = (await as(ASHA, () => rows(`select staff_consent_ledger($1) as l`, [sahyadri])))[0].l as { changes: unknown[] };
      expect(ledger.changes).toHaveLength(50);
    });
  });

  describe("the access log", () => {
    it("shows who looked at whom, newest first, to Admin and Compliance", async () => {
      await as(NEHA, () => ok(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef]));
      await as(SURESH, () => ok(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef]));
      const log = await as(IMRAN, () => rows(`select staff_label, customer_ref, reason from staff_access_log($1)`, [sahyadri]));
      expect(log).toEqual([
        { staff_label: "Suresh Pawar", customer_ref: aliceRef, reason: "Viewed customer" },
        { staff_label: "Neha Patil", customer_ref: aliceRef, reason: "Viewed customer" },
      ]);
    });

    it("is closed to staff without the role, to other banks, to customers and to visitors", async () => {
      for (const who of [NEHA, SURESH, KAVITA, RAVI, ALICE]) expect(await as(who, () => fails(`select * from staff_access_log($1)`, [sahyadri])), who).toMatch(/not allowed/);
      expect(await as(null, () => fails(`select * from staff_access_log($1)`, [sahyadri]))).toMatch(/permission denied/);
    });

    it("never shows another bank's entries", async () => {
      await as(NEHA, () => ok(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef]));
      expect(await as(RAVI, () => rows(`select * from staff_access_log($1)`, [harmony]))).toEqual([]);
    });

    it("can't be written, edited or deleted by staff or customers, and can't be read straight from the table", async () => {
      await as(NEHA, () => ok(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef]));
      for (const who of [NEHA, ASHA, IMRAN, ALICE]) {
        await as(who, async () => {
          expect(await fails(`select * from bank_access_log`), who).toMatch(/permission denied/);
          expect(await fails(`insert into bank_access_log (bank_id, staff_label, reason) values ($1, 'x', 'x')`, [sahyadri]), who).toMatch(/permission denied/);
          expect(await fails(`update bank_access_log set reason = 'nothing happened'`), who).toMatch(/permission denied/);
          expect(await fails(`delete from bank_access_log`), who).toMatch(/permission denied/);
        });
      }
    });

    it("doesn't log someone reading the log", async () => {
      await as(IMRAN, () => ok(`select * from staff_access_log($1)`, [sahyadri]));
      expect(await logRows()).toEqual([]);
    });
  });
});

describe("the helpers behind the functions", () => {
  it("are not callable by anyone", async () => {
    for (const who of [ALICE, ASHA, null]) {
      await as(who, async () => {
        expect(await fails(`select short_name('Rohit Kulkarni', 'C-1')`), String(who)).toMatch(/permission denied/);
        expect(await fails(`select bank_sharing_now($1, $2)`, [ALICE, sahyadri]), String(who)).toMatch(/permission denied/);
        expect(await fails(`select staff_label($1)`, [ASHA]), String(who)).toMatch(/permission denied/);
      });
    }
  });

  it("shorten names the way staff read them", async () => {
    const short = async (full: string | null) => ((await rows(`select short_name($1, 'C-9') as s`, [full]))[0] as { s: string }).s;
    expect(await short("Rohit Kulkarni")).toBe("Rohit K.");
    expect(await short("  Rohit   Kulkarni  ")).toBe("Rohit K.");
    expect(await short("Meera")).toBe("Meera");
    expect(await short("anil kumar sharma")).toBe("anil S.");
    expect(await short("")).toBe("C-9");
    expect(await short("   ")).toBe("C-9");
    expect(await short(null)).toBe("C-9");
  });

  it("let only the named functions be called by the roles that should", async () => {
    await as(null, async () => {
      expect(await fails(`select * from bank_public('sahyadri')`)).toBeNull();
      for (const call of [`join_bank('${sahyadri}')`, `set_bank_sharing('${sahyadri}', true)`, `bank_sharing_state('${sahyadri}')`, `staff_shared_customers('${sahyadri}')`, `staff_open_customer('${sahyadri}', 'C-1')`, `staff_consent_ledger('${sahyadri}')`, `staff_access_log('${sahyadri}')`]) {
        expect(await fails(`select * from ${call}`), call).toMatch(/permission denied/);
      }
    });
  });
});

describe("export and delete, with banks", () => {
  let aliceRef: string;

  beforeEach(async () => {
    await as(ALICE, () => ok(`select join_bank($1)`, [sahyadri]));
    await as(BOB, () => ok(`select join_bank($1)`, [sahyadri]));
    aliceRef = await refOf(ALICE, sahyadri);
    await bankAccount(ALICE, sahyadri, "Alice savings");
    await as(ALICE, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    await as(BOB, () => ok(`select set_bank_sharing($1, true)`, [sahyadri]));
    await as(NEHA, () => ok(`select * from staff_open_customer($1, $2)`, [sahyadri, aliceRef]));
    const bobRef = await refOf(BOB, sahyadri);
    await as(NEHA, () => ok(`select * from staff_open_customer($1, $2)`, [sahyadri, bobRef]));
  });

  type Data = { bank_memberships: Row[]; bank_sharing: Row[]; bank_access: Row[]; accounts: Row[] };
  const exportOf = async (user: string) => (await as(user, () => rows(`select export_my_data() as d`)))[0].d as Data;

  it("exports the banks joined, what was chosen, and who at a bank looked, without naming the staff member", async () => {
    const data = await exportOf(ALICE);
    expect(data.bank_memberships).toEqual([{ bank: "Sahyadri Seva Bank", reference: aliceRef, joined_at: expect.any(String) }]);
    expect(data.bank_sharing).toEqual([{ bank: "Sahyadri Seva Bank", sharing: true, at: expect.any(String) }]);
    expect(data.bank_access).toEqual([{ bank: "Sahyadri Seva Bank", reason: "Viewed customer", at: expect.any(String) }]);
    expect(JSON.stringify(data)).not.toContain("Neha");
    expect(JSON.stringify(data)).not.toContain("neha@");
    expect(data.accounts.map((a) => a.name)).toEqual(["Alice savings"]);
  });

  it("never mixes in another customer's banks, choices or views", async () => {
    const data = await exportOf(BOB);
    expect(data.bank_memberships).toHaveLength(1);
    expect(data.bank_access).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain(aliceRef);
    expect(JSON.stringify(data)).not.toContain("Alice");
  });

  it("exports empty lists for someone with no bank", async () => {
    await as(KAVITA, () => ok(`select 1`));
    const data = await exportOf(KAVITA);
    expect(data.bank_memberships).toEqual([]);
    expect(data.bank_sharing).toEqual([]);
    expect(data.bank_access).toEqual([]);
  });

  it("delete removes the person's memberships, choices and bank accounts, leaves the access log with only a reference, and touches no one else", async () => {
    await as(ALICE, () => ok(`select delete_my_account()`));
    for (const table of ["bank_members", "bank_sharing_events", "accounts"]) {
      expect((await rows(`select count(*)::int as n from ${table} where user_id = $1`, [ALICE])), table).toEqual([{ n: 0 }]);
    }
    const aliceLog = (await rows(`select customer_user_id, customer_ref, reason, staff_label from bank_access_log where reason = 'Viewed customer' order by id`)) as Row[];
    expect(aliceLog).toHaveLength(2);
    const gone = aliceLog.find((r) => r.customer_ref === aliceRef)!;
    expect(gone).toMatchObject({ customer_user_id: null, staff_label: "Neha Patil" });
    expect(JSON.stringify(gone)).not.toContain("Alice");
    expect((await rows(`select count(*)::int as n from bank_members where user_id = $1`, [BOB]))).toEqual([{ n: 1 }]);
    expect((await rows(`select count(*)::int as n from bank_sharing_events where user_id = $1`, [BOB]))).toEqual([{ n: 1 }]);
    expect(await as(IMRAN, () => rows(`select customer_ref from staff_access_log($1) order by customer_ref`, [sahyadri]))).toHaveLength(2);
  });

  it("deleting a staff member's account removes their staff row, and the log keeps what they did under their name", async () => {
    await as(NEHA, () => ok(`select delete_my_account()`));
    expect(await rows(`select * from bank_staff where user_id = $1`, [NEHA])).toEqual([]);
    const log = await as(IMRAN, () => rows(`select staff_label from staff_access_log($1)`, [sahyadri]));
    expect(log.map((l) => l.staff_label)).toEqual(["Neha Patil", "Neha Patil"]);
    expect((await rows(`select staff_user_id from bank_access_log`)).every((r) => r.staff_user_id === null)).toBe(true);
  });
});
