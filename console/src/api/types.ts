import type { Role } from "../lib/access";

export type RequestOptions = { signal?: AbortSignal };

/** One step to get a bank launched, shown on the overview while the bank has no customers yet. */
export type LaunchStep = { id: string; label: string; done: boolean; to: string };

export type FeedStatus = { state: "not_connected" } | { state: "healthy" | "failing"; lastRun: string };

/** Totals only. Nothing here is about one customer. */
export type Overview = {
  bankName: string;
  /** What the figures cover, for example "October 2026". */
  period: string;
  signUps: number;
  activeThisMonth: number;
  /** Share of customers who chose to share with the bank, 0 to 100. Null when nobody has signed up. */
  sharingPercent: number | null;
  advisorQuestions: number;
  feed: FeedStatus;
  launch: LaunchStep[];
};

export type Branding = {
  name: string;
  /** A data URL of the uploaded logo, or null before one is uploaded. */
  logo: string | null;
  brandColour: string;
  onBrandColour: string;
  disclaimer: string;
};

export type AppAddress = { subdomain: string; installName: string };

export type AdvisorMode = "off" | "rules" | "ai";

export type LanguageSettings = { english: boolean; hindi: boolean; advisor: AdvisorMode };

export type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  /** A branch name, or null for all branches. */
  branch: string | null;
  /** ISO time of the last visit, or null if they have never signed in. */
  lastActive: string | null;
  status: "active" | "invited";
};

export type InviteDraft = { email: string; role: Role; branch: string | null };

export type StaffDirectory = { members: StaffMember[]; branches: string[] };

export type ComplianceDocument = {
  id: string;
  title: string;
  /** What it is for, in a line. */
  summary: string;
  version: string | null;
  /** ISO date of this version, or null if it hasn't been shared yet. */
  date: string | null;
  /** Where to download it. Null until Finous has shared it. */
  href: string | null;
};

export type TicketDraft = { topic: string; subject: string; message: string };

/** Who is doing something that gets logged: the staff member behind a view, an export or a follow-up. */
export type Viewer = { staffId: string; name: string };

// ---- Integration: the bank's data feed, and how the bank's app signs people in -------------------------------

export type FeedRun = { at: string; ok: boolean; rowsRead: number; rowsRejected: number; message: string | null };

export type FeedDetail = { state: "not_connected" } | { state: "healthy" | "failing"; lastRun: string; nextRun: string; rowsRead: number; runs: FeedRun[] };

/** A field Finous needs from the bank's file. `required` ones must be matched to a column before the feed can run. */
export type FeedField = { key: string; label: string; hint: string; required: boolean };

export type FeedMapping = {
  /** The column headings of the bank's sample file. */
  columns: string[];
  fields: FeedField[];
  /** Field key to the column it comes from. A missing key, or an empty string, means "not matched". */
  mapping: Record<string, string>;
};

export type DryRun = {
  rowsRead: number;
  accepted: number;
  rejected: { row: number; reason: string }[];
  /** The first test customer as Finous would store it, so the bank can check it by eye. */
  preview: { field: string; value: string }[];
};

export type ApiKeyInfo = { id: string; name: string; /** The first characters, safe to show. */ prefix: string; createdAt: string; lastUsed: string | null };

export type SingleSignOn = { enabled: boolean; provider: string; entityId: string; signInUrl: string };

export type SignInSettings = {
  sso: SingleSignOn;
  /** The link the bank puts in its own app to open Finous without a second sign-up. */
  handoffUrl: string | null;
  keys: ApiKeyInfo[];
};

/** A key as it was just made. The secret is shown this once and never stored where it can be read again. */
export type NewKey = { key: ApiKeyInfo; secret: string };

// ---- Products, and the customers who could use them -----------------------------------------------------------

export type ProductKind = "loan" | "deposit";

export type Product = {
  id: string;
  name: string;
  kind: ProductKind;
  /** Per year, in percent. */
  rate: number;
  tenureMin: number;
  tenureMax: number;
  eligibility: string;
  fees: string;
  disclosureEn: string;
  disclosureHi: string;
  /** Whether customers can see it in the app. */
  live: boolean;
  changedAt: string;
};

export type ProductDraft = Omit<Product, "id" | "changedAt"> & { id?: string };

export type OpportunityType = "topup" | "refinance" | "maturing" | "insurance";
export type OpportunityStatus = "new" | "contacted" | "interested" | "closed";

/** A customer who chose to share, and a product they could use. Only people who shared ever appear. */
export type Opportunity = {
  id: string;
  /** The customer's name, shortened, for example "Rohit K.". */
  customer: string;
  /** A reference that stays the same, for example "C-1041". */
  ref: string;
  type: OpportunityType;
  status: OpportunityStatus;
  branch: string;
  productId: string | null;
  detectedAt: string;
  assignee: string | null;
};

export type OpportunityFilter = { type?: OpportunityType; status?: OpportunityStatus; branch?: string };

export type OpportunityList = {
  /** False while no data has arrived from the bank, so there is nothing to find yet. */
  feedConnected: boolean;
  items: Opportunity[];
};

export type OpportunityDetail = Opportunity & {
  /** What the customer shared that raised this, as label and value. */
  figures: { label: string; value: string }[];
  productName: string | null;
  lastContact: string | null;
};

export type FollowUp = { id: string; at: string; by: string; status: OpportunityStatus; note: string; assignee: string | null };

export type FollowUpDraft = { status: OpportunityStatus; note: string; assigneeId: string | null };

// ---- Compliance records ---------------------------------------------------------------------------------------

export type ConsentChange = { id: string; customer: string; ref: string; sharing: boolean; at: string };

export type ConsentLedger = {
  /** Customers sharing with the bank now, and customers who shared and then stopped. */
  sharing: number;
  stopped: number;
  /** The most recent changes, newest first. Not every customer. */
  changes: ConsentChange[];
};

export type AccessLogEntry = { id: string; at: string; staff: string; customer: string; ref: string; reason: string };

export type CustomerRequest = { id: string; ref: string; kind: "export" | "delete"; receivedOn: string; dueOn: string; status: "open" | "done" };

/** Everything the console screens ask for. A mock today, an HTTP client when the backend exists. */
export type ConsoleApi = {
  /** True for the demo bank with sample figures. The screens say so. */
  readonly demo: boolean;
  overview(options?: RequestOptions): Promise<Overview>;
  branding(options?: RequestOptions): Promise<Branding>;
  saveBranding(branding: Branding): Promise<void>;
  address(options?: RequestOptions): Promise<AppAddress>;
  /** Whether a web address is free. The address the bank already holds counts as free to it. */
  addressAvailable(subdomain: string): Promise<boolean>;
  saveAddress(address: AppAddress): Promise<void>;
  languages(options?: RequestOptions): Promise<LanguageSettings>;
  saveLanguages(settings: LanguageSettings): Promise<void>;
  staff(options?: RequestOptions): Promise<StaffDirectory>;
  inviteStaff(draft: InviteDraft): Promise<StaffMember>;
  documents(options?: RequestOptions): Promise<ComplianceDocument[]>;
  raiseTicket(draft: TicketDraft): Promise<{ id: string }>;

  feed(options?: RequestOptions): Promise<FeedDetail>;
  feedMapping(options?: RequestOptions): Promise<FeedMapping>;
  saveFeedMapping(mapping: Record<string, string>): Promise<void>;
  /** Runs the mapping over the bank's sample file. Touches no real customer. */
  dryRun(mapping: Record<string, string>): Promise<DryRun>;
  signInSettings(options?: RequestOptions): Promise<SignInSettings>;
  saveSingleSignOn(sso: SingleSignOn): Promise<void>;
  createKey(name: string): Promise<NewKey>;
  rotateKey(id: string): Promise<NewKey>;

  products(options?: RequestOptions): Promise<Product[]>;
  product(id: string, options?: RequestOptions): Promise<Product>;
  saveProduct(draft: ProductDraft): Promise<Product>;

  opportunities(filter: OpportunityFilter, options?: RequestOptions): Promise<OpportunityList>;
  /** Opening a customer is logged against the staff member who did it. */
  opportunity(id: string, viewer: Viewer, options?: RequestOptions): Promise<OpportunityDetail>;
  followUps(id: string, options?: RequestOptions): Promise<FollowUp[]>;
  addFollowUp(id: string, draft: FollowUpDraft, by: Viewer): Promise<FollowUp>;
  /** The rows to export. Exporting is logged against the staff member who did it. */
  exportOpportunities(filter: OpportunityFilter, viewer: Viewer): Promise<Opportunity[]>;

  consentLedger(options?: RequestOptions): Promise<ConsentLedger>;
  accessLog(options?: RequestOptions): Promise<AccessLogEntry[]>;
  customerRequests(options?: RequestOptions): Promise<CustomerRequest[]>;
  completeRequest(id: string, by: Viewer): Promise<void>;
};
