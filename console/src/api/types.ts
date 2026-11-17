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
};
