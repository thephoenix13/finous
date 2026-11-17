import { ApiError, type ApiErrorCode } from "./errors";
import type {
  AppAddress,
  Branding,
  ComplianceDocument,
  ConsoleApi,
  InviteDraft,
  LanguageSettings,
  Overview,
  RequestOptions,
  StaffDirectory,
  StaffMember,
  TicketDraft,
} from "./types";

type Methods = Exclude<keyof ConsoleApi, "demo">;

export type MockOptions = {
  /** "demo" is a bank with a few months of sample figures. "new" has just been set up and has no customers. */
  bank?: "demo" | "new";
};

export type MockConsoleApi = ConsoleApi & {
  /** Make the next call to `method` reject with `code`, then behave normally. */
  failNext(method: Methods, code?: ApiErrorCode): void;
  /** What has been saved, for tests to look at. */
  readonly saved: { branding: Branding[]; address: AppAddress[]; languages: LanguageSettings[]; tickets: TicketDraft[] };
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

const DOCUMENTS: ComplianceDocument[] = [
  { id: "dpa", title: "Data processing agreement", summary: "Sets out who holds customer data and what Finous may do with it.", version: null, date: null, href: null },
  { id: "security", title: "Security summary", summary: "How customer data is protected, and the results of independent testing.", version: null, date: null, href: null },
  { id: "privacy", title: "Privacy notice", summary: "What customers are told about their data. Every version is kept.", version: "1.0", date: "2026-10-20", href: null },
];

const abortError = () => new DOMException("The request was cancelled.", "AbortError");

/**
 * An in-memory console API for the demo and for tests. Reads copy their data, so a caller can never change the store
 * by mutating what it was given. Saves are remembered, and the overview's launch steps follow them.
 */
export function createMockConsoleApi({ bank = "demo" }: MockOptions = {}): MockConsoleApi {
  const isDemo = bank === "demo";
  const failures = new Map<Methods, ApiErrorCode>();
  const saved: MockConsoleApi["saved"] = { branding: [], address: [], languages: [], tickets: [] };

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

  // The new bank starts with nothing done. The demo bank starts with everything done.
  const done = { branding: isDemo, address: isDemo, languages: isDemo, invited: isDemo };

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

  return {
    demo: isDemo,
    saved,

    failNext(method, code = "unavailable") {
      failures.set(method, code);
    },

    overview: (options) =>
      read(
        "overview",
        (): Overview => ({
          bankName: branding.name,
          period: "October 2026",
          signUps: isDemo ? 1240 : 0,
          activeThisMonth: isDemo ? 612 : 0,
          sharingPercent: isDemo ? 38 : null,
          advisorQuestions: isDemo ? 2310 : 0,
          feed: { state: "not_connected" },
          launch: [
            { id: "branding", label: "Set your bank's name and colours", done: done.branding, to: "/settings/app/branding" },
            { id: "address", label: "Choose your web address", done: done.address, to: "/settings/app/address" },
            { id: "languages", label: "Decide languages and the advisor", done: done.languages, to: "/settings/app/languages" },
            { id: "team", label: "Invite your team", done: done.invited, to: "/settings/team/invite" },
          ],
        }),
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
  };
}
