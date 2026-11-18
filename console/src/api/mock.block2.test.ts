import { describe, expect, it } from "vitest";
import { MOCK_NOW } from "./fixtures";
import { createMockConsoleApi } from "./mock";
import type { ProductDraft } from "./types";

const viewer = { staffId: "admin@demobank.example", name: "Meera Joshi" };

const DRAFT: ProductDraft = {
  name: "Gold loan",
  kind: "loan",
  rate: 10.5,
  tenureMin: 3,
  tenureMax: 36,
  eligibility: "Open to individuals with gold to pledge.",
  fees: "Processing fee 0.5%.",
  disclosureEn: "Offered by Demo Co-operative Bank. Tap Learn more to talk to us.",
  disclosureHi: "",
  live: false,
};

describe("feed", () => {
  it("is connected and healthy for the demo bank, with its recent runs, newest first", async () => {
    const feed = await createMockConsoleApi().feed();
    if (feed.state === "not_connected") throw new Error("expected a connected feed");
    expect(feed.state).toBe("healthy");
    expect(feed.lastRun).toBe("2026-11-17T02:00:00Z");
    expect(feed.rowsRead).toBe(1874);
    expect(feed.runs).toHaveLength(7);
    expect(feed.runs[0].at > feed.runs[1].at).toBe(true);
    expect(feed.runs.filter((r) => !r.ok)).toHaveLength(1);
  });

  it("is not connected for a new bank, and failing when asked, with the last good row count kept", async () => {
    expect(await createMockConsoleApi({ bank: "new" }).feed()).toEqual({ state: "not_connected" });
    const failing = await createMockConsoleApi({ feed: "failing" }).feed();
    if (failing.state === "not_connected") throw new Error("expected a connected feed");
    expect(failing.state).toBe("failing");
    expect(failing.runs[0]).toMatchObject({ ok: false, message: expect.stringContaining("not at the agreed location") });
    expect(failing.rowsRead).toBe(1869);
  });

  it("lets a feed option override the bank's default either way", async () => {
    expect((await createMockConsoleApi({ bank: "new", feed: "connected" }).feed()).state).toBe("healthy");
    expect((await createMockConsoleApi({ bank: "demo", feed: "not_connected" }).feed()).state).toBe("not_connected");
  });

  it("feeds the overview the same state", async () => {
    expect((await createMockConsoleApi().overview()).feed).toEqual({ state: "healthy", lastRun: "2026-11-17T02:00:00Z" });
    expect((await createMockConsoleApi({ feed: "failing" }).overview()).feed.state).toBe("failing");
    expect((await createMockConsoleApi({ feed: "not_connected" }).overview()).feed).toEqual({ state: "not_connected" });
  });
});

describe("feed mapping and dry run", () => {
  it("offers the fields and the sample file's columns, with the demo bank's mapping filled in and a new bank's empty", async () => {
    const demo = await createMockConsoleApi().feedMapping();
    expect(demo.fields.filter((f) => f.required).map((f) => f.key)).toEqual(["customerRef", "customerName", "accountNumber", "accountType", "balance"]);
    expect(demo.columns).toContain("PHONE");
    expect(demo.mapping.balance).toBe("BAL_AMT");
    expect((await createMockConsoleApi({ bank: "new" }).feedMapping()).mapping).toEqual({});
  });

  it("remembers a saved mapping", async () => {
    const api = createMockConsoleApi({ bank: "new" });
    await api.saveFeedMapping({ customerRef: "CUST_NO" });
    expect((await api.feedMapping()).mapping).toEqual({ customerRef: "CUST_NO" });
    expect(api.saved.mappings).toEqual([{ customerRef: "CUST_NO" }]);
  });

  it("accepts the rows it can read and says why it left one out, touching nothing real", async () => {
    const api = createMockConsoleApi();
    const result = await api.dryRun((await api.feedMapping()).mapping);
    expect(result).toMatchObject({ rowsRead: 5, accepted: 4 });
    expect(result.rejected).toEqual([{ row: 4, reason: "Balance or amount outstanding is empty." }]);
    expect(api.saved.mappings).toHaveLength(0);
  });

  it("shows the first accepted customer shortened, masked and in plain words", async () => {
    const api = createMockConsoleApi();
    const { preview } = await api.dryRun((await api.feedMapping()).mapping);
    const get = (field: string) => preview.find((p) => p.field === field)?.value;
    expect(get("Customer number")).toBe("T-0001");
    expect(get("Customer name")).toBe("Rohit K.");
    expect(get("Account number")).toBe("••••8812");
    expect(get("Account type")).toBe("Home loan");
    expect(get("Balance or amount outstanding")).toBe("₹28,50,000");
    expect(get("Monthly instalment")).toBe("₹32,400");
    expect(get("Interest rate")).toBe("9.4% a year");
    expect(get("Next due date")).toBe("5 Dec 2026");
    expect(get("Branch")).toBe("Main branch");
    expect(get("Maturity date")).toBeUndefined();
  });

  it("leaves out optional fields that aren't matched, and never reads a column that isn't", async () => {
    const api = createMockConsoleApi();
    const required = { customerRef: "CUST_NO", customerName: "CUST_NAME", accountNumber: "ACCT_NO", accountType: "ACCT_TYPE", balance: "BAL_AMT" };
    const { preview } = await api.dryRun(required);
    expect(preview.map((p) => p.field)).toEqual(["Customer number", "Customer name", "Account number", "Account type", "Balance or amount outstanding"]);
    expect(JSON.stringify(preview)).not.toContain("9000000001");
  });

  it("rejects every row when a required field has no column, naming it", async () => {
    const api = createMockConsoleApi();
    const result = await api.dryRun({ customerRef: "CUST_NO", customerName: "CUST_NAME", accountNumber: "ACCT_NO", accountType: "ACCT_TYPE" });
    expect(result).toMatchObject({ rowsRead: 5, accepted: 0, preview: [] });
    expect(result.rejected).toHaveLength(5);
    expect(result.rejected[0].reason).toBe("Balance or amount outstanding is not matched to a column.");
  });

  it("treats a column that isn't in the file as not matched", async () => {
    const result = await createMockConsoleApi().dryRun({ customerRef: "NOPE", customerName: "CUST_NAME", accountNumber: "ACCT_NO", accountType: "ACCT_TYPE", balance: "BAL_AMT" });
    expect(result.accepted).toBe(0);
    expect(result.rejected[0].reason).toBe("Customer number is not matched to a column.");
  });
});

describe("sign-in settings and keys", () => {
  it("builds the link for the app from the bank's web address, and has none before there is one", async () => {
    expect((await createMockConsoleApi().signInSettings()).handoffUrl).toBe("https://demo-coop.app.finous.site/?from=bank");
    const fresh = createMockConsoleApi({ bank: "new" });
    expect((await fresh.signInSettings()).handoffUrl).toBeNull();
    await fresh.saveAddress({ subdomain: "seva", installName: "Seva" });
    expect((await fresh.signInSettings()).handoffUrl).toBe("https://seva.app.finous.site/?from=bank");
  });

  it("starts with single sign-on off, and remembers what is saved", async () => {
    const api = createMockConsoleApi();
    expect((await api.signInSettings()).sso.enabled).toBe(false);
    const sso = { enabled: true, provider: "Microsoft Entra", entityId: "urn:demo", signInUrl: "https://login.example/demo" };
    await api.saveSingleSignOn(sso);
    expect((await api.signInSettings()).sso).toEqual(sso);
    expect(api.saved.sso).toEqual([sso]);
  });

  it("lists the demo bank's keys without any secret, and a new bank has none", async () => {
    const keys = (await createMockConsoleApi().signInSettings()).keys;
    expect(keys.map((k) => k.name)).toEqual(["Branch app", "Reporting"]);
    for (const k of keys) expect(Object.keys(k).sort()).toEqual(["createdAt", "id", "lastUsed", "name", "prefix"]);
    expect((await createMockConsoleApi({ bank: "new" }).signInSettings()).keys).toEqual([]);
  });

  it("makes a key, shows its secret once, and keeps only the start of it", async () => {
    const api = createMockConsoleApi();
    const made = await api.createKey("  Mobile team ");
    expect(made.secret).toMatch(/^fk_live_[0-9a-f]{20,}$/);
    expect(made.key).toMatchObject({ name: "Mobile team", prefix: made.secret.slice(0, 12), createdAt: MOCK_NOW, lastUsed: null });
    const listed = (await api.signInSettings()).keys.find((k) => k.id === made.key.id)!;
    expect(JSON.stringify(listed)).not.toContain(made.secret);
    expect(listed.prefix).toBe(made.secret.slice(0, 12));
  });

  it("gives each key its own id, even after others were made", async () => {
    const api = createMockConsoleApi();
    const a = await api.createKey("A1");
    const b = await api.createKey("B2");
    expect(new Set([a.key.id, b.key.id, "k1", "k2"]).size).toBe(4);
  });

  it("rotates a key: a new secret and start, the same name and id, never used since", async () => {
    const api = createMockConsoleApi();
    const before = (await api.signInSettings()).keys.find((k) => k.id === "k1")!;
    const rotated = await api.rotateKey("k1");
    expect(rotated.key).toMatchObject({ id: "k1", name: "Branch app", createdAt: MOCK_NOW, lastUsed: null });
    expect(rotated.key.prefix).not.toBe(before.prefix);
    expect(rotated.secret.startsWith(rotated.key.prefix)).toBe(true);
    expect((await api.signInSettings()).keys).toHaveLength(2);
    await expect(api.rotateKey("nope")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("products", () => {
  it("lists the demo bank's products, three live and two draft, and a new bank has none", async () => {
    const list = await createMockConsoleApi().products();
    expect(list.map((p) => [p.name, p.live])).toEqual([["Home loan", true], ["Personal loan", true], ["Vehicle loan", false], ["Fixed deposit", true], ["Recurring deposit", false]]);
    expect(await createMockConsoleApi({ bank: "new" }).products()).toEqual([]);
  });

  it("reads one product, and says not found for one that isn't there", async () => {
    const api = createMockConsoleApi();
    expect((await api.product("p4")).name).toBe("Fixed deposit");
    await expect(api.product("nope")).rejects.toMatchObject({ code: "not_found" });
  });

  it("adds a product with a new id and the time it was changed", async () => {
    const api = createMockConsoleApi();
    const made = await api.saveProduct(DRAFT);
    expect(made).toMatchObject({ id: "p6", name: "Gold loan", changedAt: MOCK_NOW, live: false });
    expect((await api.products()).at(-1)?.name).toBe("Gold loan");
    expect(api.saved.products).toEqual([made]);
  });

  it("changes a product in place, keeping its id and place in the list", async () => {
    const api = createMockConsoleApi();
    const changed = await api.saveProduct({ ...(await api.product("p3")), live: true, rate: 9.25 });
    expect(changed).toMatchObject({ id: "p3", live: true, rate: 9.25, changedAt: MOCK_NOW });
    const list = await api.products();
    expect(list.map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(list[2].rate).toBe(9.25);
    await expect(api.saveProduct({ ...DRAFT, id: "nope" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("opportunities", () => {
  it("lists them newest first, with the bank's feed connected", async () => {
    const list = await createMockConsoleApi().opportunities({});
    expect(list.feedConnected).toBe(true);
    expect(list.items).toHaveLength(12);
    const dates = list.items.map((o) => o.detectedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("filters by type, status and branch, alone and together", async () => {
    const api = createMockConsoleApi();
    const ids = async (f: Parameters<typeof api.opportunities>[0]) => (await api.opportunities(f)).items.map((o) => o.id);
    expect(await ids({ type: "maturing" })).toEqual(["o2", "o6", "o10"]);
    expect((await ids({ status: "closed" }))).toEqual(["o8"]);
    expect((await ids({ branch: "Station branch" })).sort()).toEqual(["o11", "o4", "o7"]);
    expect(await ids({ type: "topup", status: "new", branch: "Main branch" })).toEqual(["o1"]);
    expect(await ids({ type: "insurance", status: "closed" })).toEqual([]);
  });

  it("says there is nothing to find until the feed is connected, and a new bank has no one", async () => {
    const notConnected = await createMockConsoleApi({ feed: "not_connected" }).opportunities({});
    expect(notConnected.feedConnected).toBe(false);
    const fresh = await createMockConsoleApi({ bank: "new" }).opportunities({});
    expect(fresh).toEqual({ feedConnected: false, items: [] });
  });

  it("opens one with what the customer shared, the product's name, and the last contact", async () => {
    const api = createMockConsoleApi();
    const o3 = await api.opportunity("o3", viewer);
    expect(o3).toMatchObject({ customer: "Amit J.", productName: "Home loan", lastContact: "2026-11-15T10:15:00Z" });
    expect(o3.figures.length).toBeGreaterThan(0);
    const o4 = await api.opportunity("o4", viewer);
    expect(o4).toMatchObject({ productId: null, productName: null, lastContact: null });
    await expect(api.opportunity("nope", viewer)).rejects.toMatchObject({ code: "not_found" });
  });

  it("writes every opening to the staff access log, with who, when and which customer", async () => {
    const api = createMockConsoleApi();
    const before = (await api.accessLog()).length;
    await api.opportunity("o1", viewer);
    await api.opportunity("o1", viewer);
    const log = await api.accessLog();
    expect(log).toHaveLength(before + 2);
    expect(log[0]).toEqual({ id: expect.any(String), at: MOCK_NOW, staff: "Meera Joshi", customer: "Rohit K.", ref: "C-1041", reason: "Viewed opportunity" });
    expect(new Set(log.map((e) => e.id)).size).toBe(log.length);
  });

  it("does not log an opening that failed", async () => {
    const api = createMockConsoleApi();
    const before = (await api.accessLog()).length;
    await expect(api.opportunity("nope", viewer)).rejects.toBeDefined();
    api.failNext("opportunity");
    await expect(api.opportunity("o1", viewer)).rejects.toBeDefined();
    expect(await api.accessLog()).toHaveLength(before);
  });

  it("exports the filtered rows, and logs the export with how many customers", async () => {
    const api = createMockConsoleApi();
    const rows = await api.exportOpportunities({ type: "maturing" }, viewer);
    expect(rows.map((o) => o.id)).toEqual(["o2", "o6", "o10"]);
    expect((await api.accessLog())[0]).toMatchObject({ staff: "Meera Joshi", customer: "3 customers", ref: "—", reason: "Exported opportunity list" });
  });

  it("starts a new bank with an empty log and no follow-ups", async () => {
    const api = createMockConsoleApi({ bank: "new" });
    expect(await api.accessLog()).toEqual([]);
    expect(await api.customerRequests()).toEqual([]);
  });
});

describe("follow-ups", () => {
  it("lists what happened newest first, and nothing for a customer nobody has called", async () => {
    const api = createMockConsoleApi();
    const list = await api.followUps("o5");
    expect(list.map((f) => f.status)).toEqual(["interested", "contacted"]);
    expect(await api.followUps("o1")).toEqual([]);
    await expect(api.followUps("nope")).rejects.toMatchObject({ code: "not_found" });
  });

  it("adds an update at the top, and moves the opportunity's status and assignee with it", async () => {
    const api = createMockConsoleApi();
    const entry = await api.addFollowUp("o1", { status: "contacted", note: "  Called, no answer. ", assigneeId: "s4" }, viewer);
    expect(entry).toMatchObject({ by: "Meera Joshi", status: "contacted", note: "Called, no answer.", assignee: "Suresh Pawar", at: MOCK_NOW });
    expect((await api.followUps("o1"))[0]).toEqual(entry);
    const o1 = (await api.opportunities({})).items.find((o) => o.id === "o1")!;
    expect(o1).toMatchObject({ status: "contacted", assignee: "Suresh Pawar" });
    expect((await api.opportunity("o1", viewer)).lastContact).toBe(MOCK_NOW);
    expect(api.saved.followUps).toEqual([{ id: "o1", by: "admin@demobank.example" }]);
  });

  it("can leave a customer with nobody assigned, and ignores an assignee that isn't staff", async () => {
    const api = createMockConsoleApi();
    expect((await api.addFollowUp("o3", { status: "interested", note: "Thinking it over.", assigneeId: null }, viewer)).assignee).toBeNull();
    expect((await api.addFollowUp("o3", { status: "interested", note: "Thinking it over.", assigneeId: "zzz" }, viewer)).assignee).toBeNull();
    await expect(api.addFollowUp("nope", { status: "new", note: "x", assigneeId: null }, viewer)).rejects.toMatchObject({ code: "not_found" });
  });

  it("gives every update its own id", async () => {
    const api = createMockConsoleApi();
    const a = await api.addFollowUp("o1", { status: "contacted", note: "First.", assigneeId: null }, viewer);
    const b = await api.addFollowUp("o2", { status: "contacted", note: "Second.", assigneeId: null }, viewer);
    expect(a.id).not.toBe(b.id);
  });
});

describe("compliance records", () => {
  it("counts who is sharing and who stopped, with the latest changes", async () => {
    const ledger = await createMockConsoleApi().consentLedger();
    expect(ledger).toMatchObject({ sharing: 471, stopped: 38 });
    expect(ledger.changes).toHaveLength(12);
    expect(ledger.changes.some((c) => c.sharing) && ledger.changes.some((c) => !c.sharing)).toBe(true);
    expect(await createMockConsoleApi({ bank: "new" }).consentLedger()).toEqual({ sharing: 0, stopped: 0, changes: [] });
  });

  it("lists customer requests, and marks one done by the person who did it", async () => {
    const api = createMockConsoleApi();
    expect((await api.customerRequests()).map((r) => r.status)).toEqual(["open", "open", "done", "done"]);
    await api.completeRequest("r1", viewer);
    expect((await api.customerRequests()).find((r) => r.id === "r1")?.status).toBe("done");
    expect(api.saved.completed).toEqual([{ id: "r1", by: "admin@demobank.example" }]);
    await expect(api.completeRequest("nope", viewer)).rejects.toMatchObject({ code: "not_found" });
  });

  it("copies what it returns, so editing it can't change the store", async () => {
    const api = createMockConsoleApi();
    (await api.customerRequests())[0].status = "done";
    expect((await api.customerRequests())[0].status).toBe("open");
    (await api.products())[0].live = false;
    expect((await api.products())[0].live).toBe(true);
    (await api.opportunities({})).items[0].status = "closed";
    expect((await api.opportunities({})).items[0].status).toBe("new");
  });
});
