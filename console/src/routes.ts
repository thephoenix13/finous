/** Every address in the console, so a link and the route it points at can't drift apart. */
export const ROUTES = {
  overview: "/",
  signIn: "/sign-in",
  verify: "/sign-in/verify",
  opportunities: "/opportunities",
  campaigns: "/campaigns",
  products: "/products",
  newProduct: "/products/new",
  reports: "/reports",
  branding: "/settings/app/branding",
  address: "/settings/app/address",
  languages: "/settings/app/languages",
  integration: "/settings/integration",
  mapping: "/settings/integration/mapping",
  access: "/settings/integration/access",
  team: "/settings/team",
  invite: "/settings/team/invite",
  compliance: "/settings/compliance",
  consents: "/settings/compliance/consents",
  accessLog: "/settings/compliance/access-log",
  requests: "/settings/compliance/requests",
  billing: "/settings/billing",
  help: "/help",
} as const;

export const opportunityRoute = (id: string) => `/opportunities/${id}`;
export const followUpRoute = (id: string) => `/opportunities/${id}/follow-up`;
export const editProductRoute = (id: string) => `/products/${id}/edit`;
