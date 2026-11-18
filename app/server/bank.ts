/**
 * A bank's installed app: the name under the home-screen icon, and the icon. Browsers fetch both without running the app, so a
 * function has to answer, and it finds the bank from the address the request came to. Kept free of Vercel and Node specifics so
 * it can be tested with a fake `fetch`; api/manifest.ts and api/bank-icon.ts are the thin entry points.
 *
 * It reads only what a visitor who isn't signed in could read: bank_public() returns a live bank's branding and nothing else.
 */
import { bankSubdomainFromHost, brandTokens, parseBranding, PAGE_BACKGROUND, type BankBranding } from "../src/bank/branding.js";

export type Deps = {
  supabaseUrl?: string;
  /** The publishable (anon) key, which is meant to be public. Never the service role key. */
  anonKey?: string;
  /** Where banks' apps live. */
  appDomain?: string;
  fetch?: typeof fetch;
};

export const DEFAULT_APP_DOMAIN = "app.finous.site";
export const ICON_PATH = "/api/bank-icon";
const LOOKUP_TIMEOUT_MS = 5_000;
// Short, so a bank's change shows within minutes; the installed app only re-reads this now and then.
const CACHE = "public, max-age=300";

const NOT_FOUND = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
const UNAVAILABLE = () => new Response("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });

/** The host the visitor typed. Behind Vercel's proxy that is in x-forwarded-host. */
export function hostOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("host") || new URL(request.url).host;
}

type Found = { bank: BankBranding } | "none" | "unavailable";

async function findBank(request: Request, deps: Deps): Promise<Found> {
  const subdomain = bankSubdomainFromHost(hostOf(request), deps.appDomain || DEFAULT_APP_DOMAIN);
  if (!subdomain) return "none";
  if (!deps.supabaseUrl || !deps.anonKey) return "unavailable";
  try {
    const res = await (deps.fetch ?? fetch)(`${deps.supabaseUrl}/rest/v1/rpc/bank_public`, {
      method: "POST",
      headers: { apikey: deps.anonKey, Authorization: `Bearer ${deps.anonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_subdomain: subdomain }),
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return "unavailable";
    const rows: unknown = await res.json();
    const bank = Array.isArray(rows) && rows[0] ? parseBranding(rows[0]) : null;
    return bank ? { bank } : "none";
  } catch {
    return "unavailable";
  }
}

const logoType = (logo: string) => /^data:(image\/(?:png|jpeg|svg\+xml));base64,/.exec(logo)?.[1] ?? null;

/** The Web App Manifest for a bank's app. */
export function bankManifest(bank: BankBranding) {
  // Brand colours only when they pass the same contrast check the app applies; otherwise Finous's own.
  const colour = brandTokens(bank) ? bank.brandColour : PAGE_BACKGROUND;
  const type = bank.logo ? logoType(bank.logo) : null;
  const icons =
    type === "image/png" || type === "image/jpeg"
      ? [
          { src: ICON_PATH, sizes: "192x192", type, purpose: "any" },
          { src: ICON_PATH, sizes: "512x512", type, purpose: "any" },
        ]
      : [{ src: ICON_PATH, sizes: "any", type: "image/svg+xml", purpose: "any" }];
  return {
    name: bank.name,
    short_name: bank.installName,
    description: "Every account. One number. Read-only, revocable anytime.",
    lang: bank.english ? "en-IN" : "hi-IN",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PAGE_BACKGROUND,
    theme_color: colour,
    icons,
  };
}

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** An icon for a bank with no logo: its first letter on its colour. Colours are checked hex by parseBranding, and the letter is escaped. */
export function letterIcon(bank: BankBranding): string {
  const letter = escapeXml((Array.from(bank.name).find((ch) => /[\p{L}\p{N}]/u.test(ch)) ?? "F").toUpperCase());
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" fill="${bank.brandColour}"/>` +
    `<text x="256" y="350" font-family="Roboto, Arial, Helvetica, sans-serif" font-size="300" text-anchor="middle" fill="${bank.onBrandColour}">${letter}</text></svg>`
  );
}

// An SVG opened directly in a browser can run scripts. This stops every one of them (sandbox), and nothing else is allowed to load.
const IMAGE_HEADERS = { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", "X-Content-Type-Options": "nosniff", "Cache-Control": CACHE };

/** GET /api/manifest */
export async function handleManifest(request: Request, deps: Deps): Promise<Response> {
  const found = await findBank(request, deps);
  if (found === "none") return NOT_FOUND();
  if (found === "unavailable") return UNAVAILABLE();
  return new Response(JSON.stringify(bankManifest(found.bank)), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": CACHE } });
}

/** GET /api/bank-icon: the bank's logo as it was saved, or its letter on its colour. */
export async function handleIcon(request: Request, deps: Deps): Promise<Response> {
  const found = await findBank(request, deps);
  if (found === "none") return NOT_FOUND();
  if (found === "unavailable") return UNAVAILABLE();
  const { bank } = found;
  const type = bank.logo ? logoType(bank.logo) : null;
  if (bank.logo && type) {
    try {
      const bytes = Uint8Array.from(atob(bank.logo.slice(bank.logo.indexOf(",") + 1)), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { ...IMAGE_HEADERS, "Content-Type": type } });
    } catch {
      // A logo that will not decode is treated as no logo.
    }
  }
  return new Response(letterIcon(bank), { headers: { ...IMAGE_HEADERS, "Content-Type": "image/svg+xml" } });
}
