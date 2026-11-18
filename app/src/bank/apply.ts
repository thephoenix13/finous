import { brandTokens, type BankBranding } from "./branding";

/** Where the page's install name, icons and colours come from for a bank. The function reads the bank from the address. */
export const BANK_MANIFEST_URL = "/api/manifest";
export const BANK_ICON_URL = "/api/bank-icon";

type Restore = () => void;

function setAttribute(element: Element, name: string, value: string): Restore {
  const before = element.getAttribute(name);
  element.setAttribute(name, value);
  return () => (before === null ? element.removeAttribute(name) : element.setAttribute(name, before));
}

/** The <link> with this rel, made if the page has none, so the change can be undone either way. */
function linkFor(rel: string): { link: HTMLLinkElement; created: boolean } {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (existing) return { link: existing, created: false };
  const link = document.createElement("link");
  link.rel = rel;
  document.head.appendChild(link);
  return { link, created: true };
}

function pointLink(rel: string, href: string, type?: string): Restore {
  const { link, created } = linkFor(rel);
  if (created) {
    link.setAttribute("href", href);
    if (type) link.setAttribute("type", type);
    return () => link.remove();
  }
  const restoreHref = setAttribute(link, "href", href);
  const restoreType = type ? setAttribute(link, "type", type) : () => undefined;
  return () => {
    restoreHref();
    restoreType();
  };
}

/**
 * Makes the page the bank's: its colours, its title, and the name and icon of the installed app. Returns a function that puts
 * everything back. A colour pair that fails the contrast check is skipped, and the page stays Finous blue.
 */
export function applyBank(bank: BankBranding): Restore {
  const restores: Restore[] = [];
  const root = document.documentElement;

  const tokens = brandTokens(bank);
  if (tokens) {
    for (const [name, value] of Object.entries(tokens)) {
      const before = root.style.getPropertyValue(name);
      root.style.setProperty(name, value);
      restores.push(() => (before ? root.style.setProperty(name, before) : root.style.removeProperty(name)));
    }
  }
  restores.push(setAttribute(root, "data-tenant", bank.subdomain));

  const title = document.title;
  document.title = bank.name;
  restores.push(() => (document.title = title));

  const appTitle = document.head.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appTitle) restores.push(setAttribute(appTitle, "content", bank.installName));

  restores.push(pointLink("manifest", BANK_MANIFEST_URL));
  // The icon people see in a browser tab and on a home screen: the logo if there is one. iOS wants a PNG, so an SVG logo is not
  // offered there and the home-screen icon stays Finous's.
  if (bank.logo) {
    restores.push(pointLink("icon", BANK_ICON_URL, bank.logo.startsWith("data:image/svg") ? "image/svg+xml" : bank.logo.startsWith("data:image/png") ? "image/png" : "image/jpeg"));
    if (!bank.logo.startsWith("data:image/svg")) restores.push(pointLink("apple-touch-icon", BANK_ICON_URL));
  }

  return () => restores.reverse().forEach((undo) => undo());
}
