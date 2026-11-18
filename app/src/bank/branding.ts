/**
 * What a bank looks like to a customer: parsing what the database returns, and turning it into colours that are safe to show.
 *
 * This file imports nothing, because the Vercel functions under api/ use it too and run as plain Node ES modules.
 */

export type AdvisorMode = "off" | "rules" | "ai";

export type BankBranding = {
  id: string;
  subdomain: string;
  name: string;
  /** The label under the icon once the app is installed on a phone. */
  installName: string;
  /** A small image as a data URL, or null. Only ever shown as an image, never placed into the page. */
  logo: string | null;
  brandColour: string;
  onBrandColour: string;
  disclaimer: string;
  english: boolean;
  hindi: boolean;
  advisor: AdvisorMode;
};

// ── The bank's address ────────────────────────────────────────────────────────────────────────────

/** The same rule the database enforces for a bank's address. */
export const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/**
 * "seva.app.finous.site" is the bank "seva". "app.finous.site" and anything else is not a bank. On a developer's machine
 * "seva.localhost" works the same way, so a bank can be tried without a domain. A port is ignored.
 */
export function bankSubdomainFromHost(host: string | null | undefined, appDomain: string): string | null {
  const name = (host ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const domain = appDomain.trim().toLowerCase();
  for (const base of [domain, "localhost"]) {
    if (!name.endsWith(`.${base}`)) continue;
    const label = name.slice(0, -(base.length + 1));
    return SUBDOMAIN_PATTERN.test(label) ? label : null;
  }
  return null;
}

// ── Colours ────────────────────────────────────────────────────────────────────────────────────────

/** The colour the app puts behind everything. A bank's brand colour has to stand out against it. */
export const PAGE_BACKGROUND = "#F3F7FF";
/** WCAG AA for normal text: the text colour that sits on the brand colour, and brand-coloured text on the page. */
export const MIN_TEXT_CONTRAST = 4.5;
/** WCAG AA for the edges of buttons and focus rings against the page. */
export const MIN_UI_CONTRAST = 3;

type Rgb = [number, number, number];

const HEX = /^#[0-9a-f]{6}$/i;

function parseHex(hex: string): Rgb | null {
  return HEX.test(hex) ? ([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb) : null;
}

const toHex = (rgb: Rgb) => `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1 to 21. Null if either is not a six-digit colour. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `amount` of the way from `from` to `to`: 0 is `from`, 1 is `to`. */
function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from)!;
  const b = parseHex(to)!;
  return toHex(a.map((v, i) => v + (b[i] - v) * amount) as Rgb);
}

/** `colour` made darker, only as far as it takes to reach `target` against `against`. Unchanged if it already does. */
function darkenUntil(colour: string, against: string, target: number): string {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mix(colour, "#000000", step / 20);
    if ((contrastRatio(candidate, against) ?? 0) >= target) return candidate;
  }
  return "#000000";
}

/** The CSS variables a bank sets. Names match src/styles/tokens.css. */
export type BrandTokens = Record<`--${string}`, string>;

/**
 * The colours to apply for a bank, or null to stay on Finous blue. A pair is used only if the text on the brand colour is
 * readable (4.5:1) and the brand colour stands out against the page (3:1): the console checks this too, and the app checks
 * again because the row could have been written some other way.
 */
export function brandTokens(bank: Pick<BankBranding, "brandColour" | "onBrandColour">): BrandTokens | null {
  const { brandColour: brand, onBrandColour: on } = bank;
  const onBrand = contrastRatio(on, brand);
  const onPage = contrastRatio(brand, PAGE_BACKGROUND);
  if (onBrand === null || onPage === null || onBrand < MIN_TEXT_CONTRAST || onPage < MIN_UI_CONTRAST) return null;
  const [r, g, b] = parseHex(brand)!;
  const tint = mix(brand, "#FFFFFF", 0.88);
  return {
    "--brand": brand,
    "--on-brand": on,
    "--brand-strong": mix(brand, "#000000", 0.2),
    // Brand-coloured words (a link) sit on the page, so they need the stricter ratio that a button edge does not.
    "--brand-text": darkenUntil(brand, PAGE_BACKGROUND, MIN_TEXT_CONTRAST),
    "--sh-brand": `0 8px 20px rgb(${r} ${g} ${b} / 0.3)`,
    // The default accent (Home), used for tinted cards and ghost buttons: text on the tint has to read too.
    "--d": brand,
    "--dn": tint,
    "--dt": darkenUntil(brand, tint, MIN_TEXT_CONTRAST + 2.5),
  };
}

// ── Reading a row ──────────────────────────────────────────────────────────────────────────────────

const LOGO_PATTERN = /^data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;
/** The same ceiling as the database. */
export const MAX_LOGO_LENGTH = 700_000;

const text = (value: unknown, min: number, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
};

/**
 * One row from bank_public(), checked field by field. Returns null if anything essential is wrong, and drops a bad logo
 * rather than the whole bank. Colours are put into one spelling (upper case) so they compare and display the same.
 */
export function parseBranding(row: unknown): BankBranding | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const id = text(r.id, 1, 64);
  const subdomain = typeof r.subdomain === "string" && SUBDOMAIN_PATTERN.test(r.subdomain) ? r.subdomain : null;
  const name = text(r.name, 2, 60);
  const installName = text(r.install_name, 2, 30);
  const disclaimer = text(r.disclaimer, 10, 400);
  const brandColour = typeof r.brand_colour === "string" && HEX.test(r.brand_colour) ? r.brand_colour.toUpperCase() : null;
  const onBrandColour = typeof r.on_brand_colour === "string" && HEX.test(r.on_brand_colour) ? r.on_brand_colour.toUpperCase() : null;
  if (!id || !subdomain || !name || !installName || !disclaimer || !brandColour || !onBrandColour) return null;
  const logo = typeof r.logo === "string" && r.logo.length <= MAX_LOGO_LENGTH && LOGO_PATTERN.test(r.logo) ? r.logo : null;
  const english = r.english !== false;
  const hindi = r.hindi !== false;
  const advisor: AdvisorMode = r.advisor === "off" || r.advisor === "ai" ? r.advisor : "rules";
  // A bank with no language switched on cannot exist in the database; if one arrives anyway, offer both rather than none.
  return { id, subdomain, name, installName, logo, brandColour, onBrandColour, disclaimer, english: english || hindi ? english : true, hindi: english || hindi ? hindi : true, advisor };
}
