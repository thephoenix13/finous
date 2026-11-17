/** Every address in the console, so a link and the route it points at can't drift apart. */
export const ROUTES = {
  overview: "/",
  signIn: "/sign-in",
  verify: "/sign-in/verify",
  opportunities: "/opportunities",
  campaigns: "/campaigns",
  products: "/products",
  reports: "/reports",
  branding: "/settings/app/branding",
  address: "/settings/app/address",
  languages: "/settings/app/languages",
  integration: "/settings/integration",
  team: "/settings/team",
  invite: "/settings/team/invite",
  compliance: "/settings/compliance",
  billing: "/settings/billing",
  help: "/help",
} as const;
