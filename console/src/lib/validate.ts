import { contrastRatio, MIN_TEXT_CONTRAST, MIN_UI_CONTRAST, normaliseHex, PAGE_BACKGROUND } from "./contrast";

/** The domain every bank's customer app lives under. Staff pick only the first part. */
export const APP_DOMAIN = "finous.site";

/** Names that would confuse people or collide with Finous's own addresses. */
const RESERVED = new Set(["www", "app", "api", "admin", "console", "business", "mail", "support", "help", "status", "finous", "demo", "staging", "test"]);

/** Why a web address can't be used, or null if it can. Letters, digits and hyphens, 3 to 30 long, not a reserved word. */
export function validateSubdomain(value: string): string | null {
  const s = value.trim();
  if (s === "") return "Choose an address for your app.";
  if (s.length < 3) return "Use at least 3 characters.";
  if (s.length > 30) return "Use 30 characters or fewer.";
  if (!/^[a-z0-9-]+$/.test(s)) return "Use lower case letters, digits and hyphens only.";
  if (s.startsWith("-") || s.endsWith("-")) return "Start and end with a letter or digit.";
  if (RESERVED.has(s)) return "That address is reserved. Choose another.";
  return null;
}

/** The name phones show under the app icon. */
export function validateInstallName(value: string): string | null {
  const s = value.trim();
  if (s.length < 2) return "Enter the name phones should show, at least 2 characters.";
  if (s.length > 30) return "Use 30 characters or fewer.";
  return null;
}

export const INSTALL_NAME_SOFT_LIMIT = 12;

export type BrandingInput = { name: string; brandColour: string; onBrandColour: string; disclaimer: string };
export type BrandingErrors = Partial<Record<keyof BrandingInput, string>>;

/**
 * Checks the branding form. The two colours must be real colours, and the pair must stay readable:
 * text on the brand colour at AA for text, and the brand colour against the customer app's page at the level
 * buttons and focus rings need. A pair that fails either is blocked, not warned about.
 */
export function validateBranding(input: BrandingInput): BrandingErrors {
  const errors: BrandingErrors = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = "Enter your bank's name, at least 2 characters.";
  else if (name.length > 60) errors.name = "Use 60 characters or fewer.";

  const brand = normaliseHex(input.brandColour);
  const on = normaliseHex(input.onBrandColour);
  if (!brand) errors.brandColour = "Enter a colour like #1E5EFF.";
  if (!on) errors.onBrandColour = "Enter a colour like #FFFFFF.";

  if (brand && on) {
    const text = contrastRatio(on, brand) ?? 0;
    if (text < MIN_TEXT_CONTRAST) {
      errors.onBrandColour = `Text on your brand colour has a contrast of ${text.toFixed(1)}:1. It needs at least ${MIN_TEXT_CONTRAST}:1. Try white or a very dark colour.`;
    }
  }
  if (brand && !errors.brandColour) {
    const ui = contrastRatio(brand, PAGE_BACKGROUND) ?? 0;
    if (ui < MIN_UI_CONTRAST) {
      errors.brandColour = `This colour is too pale against the app's background (${ui.toFixed(1)}:1). It needs at least ${MIN_UI_CONTRAST}:1 so buttons and focus rings can be seen.`;
    }
  }

  const disclaimer = input.disclaimer.trim();
  if (disclaimer.length < 10) errors.disclaimer = "Write the disclaimer customers will see, at least 10 characters.";
  else if (disclaimer.length > 400) errors.disclaimer = "Use 400 characters or fewer.";
  return errors;
}

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"] as const;
export const LOGO_MAX_BYTES = 512 * 1024;

/** Why a chosen logo file can't be used, or null if it can. */
export function checkLogo(file: { type: string; size: number }): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return "Use a PNG, JPEG or SVG file.";
  if (file.size > LOGO_MAX_BYTES) return "Use a file under 512 KB.";
  return null;
}

export type InviteInput = { email: string; role: string; branch: string };
export type InviteErrors = Partial<Record<keyof InviteInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateInvite(input: InviteInput, existingEmails: readonly string[]): InviteErrors {
  const errors: InviteErrors = {};
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) errors.email = "Enter a work email like name@yourbank.example.";
  else if (existingEmails.some((e) => e.toLowerCase() === email)) errors.email = "This person already has access or an open invitation.";
  if (!input.role) errors.role = "Choose a role.";
  if (!input.branch) errors.branch = "Choose a branch, or All branches.";
  return errors;
}
