import { formatDate, formatRupees } from "../lib/format";
import { APP_DOMAIN } from "../lib/validate";
import { ApiError, type ApiErrorCode } from "./errors";
import {
  ACCESS_LOG,
  CONSENT_CHANGES,
  FEED_COLUMNS,
  FEED_FIELDS,
  FEED_MAPPING_DONE,
  FEED_RUNS,
  FEED_SAMPLE,
  FIGURES,
  FOLLOW_UPS,
  KEYS,
  MOCK_NOW,
  OPPORTUNITIES,
  PRODUCTS,
  REQUESTS,
} from "./fixtures";
import type {
  AccessLogEntry,
  ApiKeyInfo,
  AppAddress,
  Branding,
  ComplianceDocument,
  ConsoleApi,
  CustomerRequest,
  DryRun,
  FeedDetail,
  FollowUp,
  InviteDraft,
  LanguageSettings,
  NewKey,
  Opportunity,
  OpportunityFilter,
  Overview,
  Product,
  ProductDraft,
  RequestOptions,
  SingleSignOn,
  StaffDirectory,
  StaffMember,
  TicketDraft,
  Viewer,
} from "./types";

type Methods = Exclude<keyof ConsoleApi, "demo">;

export type MockOptions = {
  /** "demo" is a bank with a few months of sample figures. "new" has just been set up and has no customers. */
  bank?: "demo" | "new";
  /** The bank's data feed. The demo bank is connected by default and a new bank is not. "failing" has a last run that broke. */
  feed?: "connected" | "failing" | "not_connected";
};

export type MockConsoleApi = ConsoleApi & {
  /** Make the next call to `method` reject with `code`, then behave normally. */
  failNext(method: Methods, code?: ApiErrorCode): void;
  /** What has been saved, for tests to look at. */
  readonly saved: {
    branding: Branding[];
    address: AppAddress[];
    languages: LanguageSettings[];
    tickets: TicketDraft[];
    mappings: Record<string, string>[];
    sso: SingleSignOn[];
    products: Product[];
    followUps: { id: string; by: string }[];
    completed: { id: string; by: string }[];
  };
};

/** Addresses another bank already holds. */
const TAKEN = ["alpha-bank", "beta-bank"];

const DEMO_STAFF: StaffMember[] = [
  { id: "s1", name: "Meera Joshi", email: "admin@demobank.example", role: "admin", branch: null, lastActive: "2026-11-16T09:30:00Z", status: "active" },
  { id: "s2", name: "Imran Shaikh", email: "compliance@demobank.example", role: "compliance", branch: null, lastActive: "2026-11-14T11:05:00Z", status: "active" },
  { id: "s3", name: "Neha Patil", email: "marketing@demobank.example", role: "marketing", branch: null, lastActive: "2026-11-12T15:40:00Z", status: "active" },
  { id: "s4", name: "Suresh Pawar", email: "branch@demobank.example", role: "branch", branch: "Main branch", lastActive: "2026-11-10T08:15:00Z", status: "active" },
  { id: "s5", name: "Kavita Rao", email: "readonly@demobank.example", role: "readonly", branch: null, lastActive: null, status: "active" },
];

const NEW_STAFF: StaffMember[] = [DEMO_STAFF[0]];

const BRANCHES = ["Main branch", "Market Road branch", "Station branch"];

/** How the bank's own branch codes read to staff. */
const BRANCH_NAMES: Record<string, string> = { MAIN: "Main branch", MKTRD: "Market Road branch", STN: "Station branch" };

const DOCUMENTS: ComplianceDocument[] = [
  { id: "dpa", title: "Data processing agreement", summary: "Sets out who holds customer data and what Finous may do with it.", version: null, date: null, href: null },
  { id: "security", title: "Security summary", summary: "How customer data is protected, and the results of independent testing.", version: null, date: null, href: null },
  { id: "privacy", title: "Privacy notice", summary: "What customers are told about their data. Every version is kept.", version: "1.0", date: "2026-10-20", href: null },
];

const abortError = () => new DOMException("The request was cancelled.", "AbortError");

/** "Rohit Kulkarni" as staff see it: "Rohit K.". */
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

const humanise = (raw: string): string => {
  const text = raw.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The first test customer as Finous would hold it: masked, shortened, and in plain words. */
function previewOf(row: Record<string, string>, mapping: Record<string, string>): DryRun["preview"] {
  const value = (key: string) => (mapping[key] ? row[mapping[key]]?.trim() ?? "" : "");
  const out: DryRun["preview"] = [];
  const add = (key: string, shown: string) => {
    const field = FEED_FIELDS.find((f) => f.key === key);
    if (field && value(key) !== "") out.push({ field: field.label, value: shown });
  };
  add("customerRef", value("customerRef"));
  add("customerName", shortName(value("customerName")));
  add("accountNumber", `••••${value("accountNumber").slice(-4)}`);
  add("accountType", humanise(value("accountType")));
  add("balance", formatRupees(Number(value("balance"))));
  add("emi", formatRupees(Number(value("emi"))));
  add("interestRate", `${value("interestRate")}% a year`);
  add("nextDue", value("nextDue") ? formatDate(value("nextDue")) : "");
  add("maturity", value("maturity") ? formatDate(value("maturity")) : "");
  add("branch", BRANCH_NAMES[value("branch")] ?? value("branch"));
  return out;
}

function runDry(mapping: Record<string, string>): DryRun {
  const unmatched = FEED_FIELDS.find((f) => f.required && !FEED_COLUMNS.includes(mapping[f.key] ?? ""));
  if (unmatched) {
    return { rowsRead: FEED_SAMPLE.length, accepted: 0, rejected: FEED_SAMPLE.map((_, i) => ({ row: i + 1, reason: `${unmatched.label} is not matched to a column.` })), preview: [] };
  }
  const rejected: DryRun["rejected"] = [];
  let first: Record<string, string> | null = null;
  let accepted = 0;
  FEED_SAMPLE.forEach((row, i) => {
    const empty = FEED_FIELDS.find((f) => f.required && (row[mapping[f.key]] ?? "").trim() === "");
    if (empty) rejected.push({ row: i + 1, reason: `${empty.label} is empty.` });
    else {
      accepted += 1;
      first ??= row;
    }
  });
  return { rowsRead: FEED_SAMPLE.length, accepted, rejected, preview: first ? previewOf(first, mapping) : [] };
}

/** A made-up secret. The real backend makes a long random one and keeps only a hash. */
const makeSecret = () => `fk_live_${Math.random().toString(16).slice(2).padEnd(14, "0")}${Math.random().toString(16).slice(2).padEnd(14, "0")}`;

const matches = (o: Opportunity, f: OpportunityFilter) => (!f.type || o.type === f.type) && (!f.status || o.status === f.status) && (!f.branch || o.branch === f.branch);

/**
 * An in-memory console API for the demo and for tests. Reads copy their data, so a caller can never change the store
 * by mutating what it was given. Saves are remembered, the overview's launch steps follow them, and opening a customer
 * or exporting a list is written to the staff access log.
 */
export function createMockConsoleApi({ bank = "demo", feed }: MockOptions = {}): MockConsoleApi {
  const isDemo = bank === "demo";
  const feedMode = feed ?? (isDemo ? "connected" : "not_connected");
  const failures = new Map<Methods, ApiErrorCode>();
  const saved: MockConsoleApi["saved"] = { branding: [], address: [], languages: [], tickets: [], mappings: [], sso: [], products: [], followUps: [], completed: [] };

  let branding: Branding = isDemo
    ? {
        name: "Demo Co-operative Bank",
        logo: null,
        brandColour: "#0B6E4F",
        onBrandColour: "#FFFFFF",
        disclaimer: "Finous gives information, not advice. Offers shown are from Demo Co-operative Bank. Tap Learn more to talk to us.",
      }
    : {
        name: "New Co-operative Bank",
        logo: null,
        brandColour: "#1E5EFF",
        onBrandColour: "#FFFFFF",
        disclaimer: "Finous gives information, not advice. Offers shown are from your bank. Tap Learn more to talk to us.",
      };
  let address: AppAddress = isDemo ? { subdomain: "demo-coop", installName: "Demo Bank" } : { subdomain: "", installName: "" };
  let languages: LanguageSettings = { english: true, hindi: true, advisor: "rules" };
  let members: StaffMember[] = (isDemo ? DEMO_STAFF : NEW_STAFF).map((m) => ({ ...m }));
  let tickets = 1000;

  let mapping: Record<string, string> = isDemo ? { ...FEED_MAPPING_DONE } : {};
  let sso: SingleSignOn = { enabled: false, provider: "", entityId: "", signInUrl: "" };
  let keys: ApiKeyInfo[] = isDemo ? KEYS.map((k) => ({ ...k })) : [];
  let keyCount = keys.length;

  let products: Product[] = isDemo ? PRODUCTS.map((p) => ({ ...p })) : [];
  let opportunities: Opportunity[] = isDemo ? OPPORTUNITIES.map((o) => ({ ...o })) : [];
  const followUps: Record<string, FollowUp[]> = isDemo ? Object.fromEntries(Object.entries(FOLLOW_UPS).map(([id, list]) => [id, list.map((f) => ({ ...f }))])) : {};
  let log: AccessLogEntry[] = isDemo ? ACCESS_LOG.map((e) => ({ ...e })) : [];
  let requests: CustomerRequest[] = isDemo ? REQUESTS.map((r) => ({ ...r })) : [];

  // The new bank starts with nothing done. The demo bank starts with everything done.
  const done = { branding: isDemo, address: isDemo, languages: isDemo, invited: isDemo };

  const feedDetail = (): FeedDetail => {
    if (feedMode === "not_connected") return { state: "not_connected" };
    const runs = FEED_RUNS.map((r) => ({ ...r }));
    if (feedMode === "failing") runs[0] = { at: runs[0].at, ok: false, rowsRead: 0, rowsRejected: 0, message: "The file was not at the agreed location." };
    const latestGood = runs.find((r) => r.ok);
    return { state: runs[0].ok ? "healthy" : "failing", lastRun: runs[0].at, nextRun: "2026-11-18T02:00:00Z", rowsRead: latestGood?.rowsRead ?? 0, runs };
  };

  async function run<T>(method: Methods, value: () => T, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw abortError();
    await Promise.resolve();
    if (signal?.aborted) throw abortError();
    const code = failures.get(method);
    if (code) {
      failures.delete(method);
      throw new ApiError(code);
    }
    return value();
  }

  const read = <T>(method: Methods, value: () => T, options?: RequestOptions) => run(method, value, options?.signal);

  const writeLog = (viewer: Viewer, customer: string, ref: string, reason: string) => {
    log = [{ id: `a${log.length + 1}`, at: MOCK_NOW, staff: viewer.name, customer, ref, reason }, ...log];
  };

  const find = (id: string): Opportunity => {
    const found = opportunities.find((o) => o.id === id);
    if (!found) throw new ApiError("not_found");
    return found;
  };

  return {
    demo: isDemo,
    saved,

    failNext(method, code = "unavailable") {
      failures.set(method, code);
    },

    overview: (options) =>
      read(
        "overview",
        (): Overview => {
          const detail = feedDetail();
          return {
            bankName: branding.name,
            period: "October 2026",
            signUps: isDemo ? 1240 : 0,
            activeThisMonth: isDemo ? 612 : 0,
            sharingPercent: isDemo ? 38 : null,
            advisorQuestions: isDemo ? 2310 : 0,
            feed: detail.state === "not_connected" ? { state: "not_connected" } : { state: detail.state, lastRun: detail.lastRun },
            launch: [
              { id: "branding", label: "Set your bank's name and colours", done: done.branding, to: "/settings/app/branding" },
              { id: "address", label: "Choose your web address", done: done.address, to: "/settings/app/address" },
              { id: "languages", label: "Decide languages and the advisor", done: done.languages, to: "/settings/app/languages" },
              { id: "team", label: "Invite your team", done: done.invited, to: "/settings/team/invite" },
            ],
          };
        },
        options,
      ),

    branding: (options) => read("branding", () => ({ ...branding }), options),
    saveBranding: (next) =>
      run("saveBranding", () => {
        branding = { ...next };
        done.branding = true;
        saved.branding.push({ ...next });
      }),

    address: (options) => read("address", () => ({ ...address }), options),
    addressAvailable: (subdomain) => run("addressAvailable", () => subdomain === address.subdomain || !TAKEN.includes(subdomain)),
    saveAddress: (next) =>
      run("saveAddress", () => {
        if (next.subdomain !== address.subdomain && TAKEN.includes(next.subdomain)) throw new ApiError("conflict");
        address = { ...next };
        done.address = true;
        saved.address.push({ ...next });
      }),

    languages: (options) => read("languages", () => ({ ...languages }), options),
    saveLanguages: (next) =>
      run("saveLanguages", () => {
        languages = { ...next };
        done.languages = true;
        saved.languages.push({ ...next });
      }),

    staff: (options): Promise<StaffDirectory> => read("staff", () => ({ members: members.map((m) => ({ ...m })), branches: [...BRANCHES] }), options),
    inviteStaff: (draft: InviteDraft) =>
      run("inviteStaff", () => {
        const email = draft.email.trim().toLowerCase();
        if (members.some((m) => m.email === email)) throw new ApiError("conflict");
        const invited: StaffMember = { id: `s${members.length + 1}`, name: null, email, role: draft.role, branch: draft.branch, lastActive: null, status: "invited" };
        members = [...members, invited];
        done.invited = true;
        return { ...invited };
      }),

    documents: (options) => read("documents", () => DOCUMENTS.map((d) => ({ ...d })), options),

    raiseTicket: (draft) =>
      run("raiseTicket", () => {
        saved.tickets.push({ ...draft });
        tickets += 1;
        return { id: `T-${tickets}` };
      }),

    // ---- Integration ----

    feed: (options) => read("feed", feedDetail, options),

    feedMapping: (options) => read("feedMapping", () => ({ columns: [...FEED_COLUMNS], fields: FEED_FIELDS.map((f) => ({ ...f })), mapping: { ...mapping } }), options),
    saveFeedMapping: (next) =>
      run("saveFeedMapping", () => {
        mapping = { ...next };
        saved.mappings.push({ ...next });
      }),
    dryRun: (next) => run("dryRun", () => runDry(next)),

    signInSettings: (options) =>
      read(
        "signInSettings",
        () => ({
          sso: { ...sso },
          handoffUrl: address.subdomain ? `https://${address.subdomain}.${APP_DOMAIN}/?from=bank` : null,
          keys: keys.map((k) => ({ ...k })),
        }),
        options,
      ),
    saveSingleSignOn: (next) =>
      run("saveSingleSignOn", () => {
        sso = { ...next };
        saved.sso.push({ ...next });
      }),
    createKey: (name): Promise<NewKey> =>
      run("createKey", () => {
        keyCount += 1;
        const secret = makeSecret();
        const key: ApiKeyInfo = { id: `k${keyCount}`, name: name.trim(), prefix: secret.slice(0, 12), createdAt: MOCK_NOW, lastUsed: null };
        keys = [...keys, key];
        return { key: { ...key }, secret };
      }),
    rotateKey: (id): Promise<NewKey> =>
      run("rotateKey", () => {
        const current = keys.find((k) => k.id === id);
        if (!current) throw new ApiError("not_found");
        const secret = makeSecret();
        const key: ApiKeyInfo = { ...current, prefix: secret.slice(0, 12), createdAt: MOCK_NOW, lastUsed: null };
        keys = keys.map((k) => (k.id === id ? key : k));
        return { key: { ...key }, secret };
      }),

    // ---- Products ----

    products: (options) => read("products", () => products.map((p) => ({ ...p })), options),
    product: (id, options) =>
      read(
        "product",
        () => {
          const found = products.find((p) => p.id === id);
          if (!found) throw new ApiError("not_found");
          return { ...found };
        },
        options,
      ),
    saveProduct: (draft: ProductDraft) =>
      run("saveProduct", () => {
        const { id, ...fields } = draft;
        if (id) {
          const index = products.findIndex((p) => p.id === id);
          if (index < 0) throw new ApiError("not_found");
          const next: Product = { ...fields, id, changedAt: MOCK_NOW };
          products = products.map((p, i) => (i === index ? next : p));
          saved.products.push({ ...next });
          return { ...next };
        }
        const next: Product = { ...fields, id: `p${products.length + 1}`, changedAt: MOCK_NOW };
        products = [...products, next];
        saved.products.push({ ...next });
        return { ...next };
      }),

    // ---- Opportunities ----

    opportunities: (filter, options) =>
      read(
        "opportunities",
        () => ({
          feedConnected: feedMode !== "not_connected",
          items: opportunities.filter((o) => matches(o, filter)).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).map((o) => ({ ...o })),
        }),
        options,
      ),
    opportunity: (id, viewer, options) =>
      read(
        "opportunity",
        () => {
          const o = find(id);
          writeLog(viewer, o.customer, o.ref, "Viewed opportunity");
          const last = (followUps[id] ?? []).at(-1);
          return {
            ...o,
            figures: FIGURES[o.type].map((f) => ({ ...f })),
            productName: products.find((p) => p.id === o.productId)?.name ?? null,
            lastContact: last ? last.at : null,
          };
        },
        options,
      ),
    followUps: (id, options) =>
      read(
        "followUps",
        () => {
          find(id);
          return (followUps[id] ?? []).map((f) => ({ ...f })).reverse();
        },
        options,
      ),
    addFollowUp: (id, draft, by) =>
      run("addFollowUp", () => {
        const o = find(id);
        const assignee = draft.assigneeId ? members.find((m) => m.id === draft.assigneeId)?.name ?? null : null;
        const entry: FollowUp = { id: `f${Object.values(followUps).flat().length + 1}`, at: MOCK_NOW, by: by.name, status: draft.status, note: draft.note.trim(), assignee };
        followUps[id] = [...(followUps[id] ?? []), entry];
        opportunities = opportunities.map((x) => (x.id === o.id ? { ...x, status: draft.status, assignee } : x));
        saved.followUps.push({ id, by: by.staffId });
        return { ...entry };
      }),
    exportOpportunities: (filter, viewer) =>
      run("exportOpportunities", () => {
        const rows = opportunities.filter((o) => matches(o, filter)).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
        writeLog(viewer, `${rows.length} customers`, "—", "Exported opportunity list");
        return rows.map((o) => ({ ...o }));
      }),

    // ---- Compliance records ----

    consentLedger: (options) =>
      read(
        "consentLedger",
        () => ({ sharing: isDemo ? 471 : 0, stopped: isDemo ? 38 : 0, changes: isDemo ? CONSENT_CHANGES.map((c) => ({ ...c })) : [] }),
        options,
      ),
    accessLog: (options) => read("accessLog", () => log.map((e) => ({ ...e })), options),
    customerRequests: (options) => read("customerRequests", () => requests.map((r) => ({ ...r })), options),
    completeRequest: (id, by) =>
      run("completeRequest", () => {
        if (!requests.some((r) => r.id === id)) throw new ApiError("not_found");
        requests = requests.map((r) => (r.id === id ? { ...r, status: "done" } : r));
        saved.completed.push({ id, by: by.staffId });
      }),
  };
}
