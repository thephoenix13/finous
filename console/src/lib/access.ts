export type Role = "admin" | "compliance" | "marketing" | "branch" | "readonly";

export const ROLES: readonly Role[] = ["admin", "compliance", "marketing", "branch", "readonly"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  compliance: "Compliance",
  marketing: "Marketing",
  branch: "Branch",
  readonly: "Read-only",
};

/** A part of the console that a role can or cannot open. The sidebar and the route guard both read this. */
export type Area =
  | "overview"
  | "opportunities"
  | "campaigns"
  | "products"
  | "reports"
  | "app"
  | "integration"
  | "team"
  | "compliance"
  | "billing"
  | "help";

export const AREA_LABEL: Record<Area, string> = {
  overview: "Overview",
  opportunities: "Opportunities",
  campaigns: "Campaigns",
  products: "Products",
  reports: "Reports",
  app: "Branding and app",
  integration: "Integration",
  team: "Team",
  compliance: "Compliance",
  billing: "Billing",
  help: "Help",
};

const EVERYONE: readonly Role[] = ROLES;

/** Totals first: everyone sees the overview, reports and help. Customer-level and setup screens are narrower. */
const ALLOWED: Record<Area, readonly Role[]> = {
  overview: EVERYONE,
  opportunities: ["admin", "marketing", "branch"],
  campaigns: ["admin", "marketing"],
  products: ["admin", "compliance", "marketing"],
  reports: EVERYONE,
  app: ["admin"],
  integration: ["admin"],
  team: ["admin"],
  compliance: ["admin", "compliance"],
  billing: ["admin"],
  help: EVERYONE,
};

export function canOpen(role: Role, area: Area): boolean {
  return ALLOWED[area].includes(role);
}

/** The roles that can open an area, for the "who to ask" line on the no-access screen. */
export function rolesThatCanOpen(area: Area): readonly Role[] {
  return ALLOWED[area];
}
