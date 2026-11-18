import type { BankBranding } from "./branding";

/**
 * Sample banks for trying the app on a developer's machine, with no database: `npm run dev`, then open
 * http://seva.localhost:5173, http://kosh.localhost:5173 or http://pale.localhost:5173. Only used in development builds.
 */

const svg = (body: string) => `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)}`;

export const DEV_BANKS: Record<string, BankBranding> = {
  // Green, both languages, rules-only advisor, with a logo.
  seva: {
    id: "dev-seva",
    subdomain: "seva",
    name: "Seva Co-operative Bank",
    installName: "Seva Money",
    logo: svg('<circle cx="32" cy="32" r="28" fill="#0F6B4A"/><path d="M20 34l8 8 16-18" stroke="#fff" stroke-width="6" fill="none"/>'),
    brandColour: "#0F6B4A",
    onBrandColour: "#FFFFFF",
    disclaimer: "Seva Co-operative Bank is regulated by the Reserve Bank of India. Finous shows your own figures and is not investment advice.",
    english: true,
    hindi: true,
    advisor: "rules",
  },
  // Hindi only, no advisor, no logo.
  kosh: {
    id: "dev-kosh",
    subdomain: "kosh",
    name: "कोष सहकारी बैंक",
    installName: "कोष",
    logo: null,
    brandColour: "#8A3B12",
    onBrandColour: "#FFFFFF",
    disclaimer: "यह ऐप कोष सहकारी बैंक के ग्राहकों के लिए है। Finous निवेश सलाह नहीं देता।",
    english: false,
    hindi: true,
    advisor: "off",
  },
  // A colour pair that fails the contrast check: the app must stay Finous blue.
  pale: {
    id: "dev-pale",
    subdomain: "pale",
    name: "Pale Bank",
    installName: "Pale",
    logo: null,
    brandColour: "#CFE8FF",
    onBrandColour: "#FFFFFF",
    disclaimer: "Pale Bank is a sample used to check that unreadable colours are refused.",
    english: true,
    hindi: true,
    advisor: "ai",
  },
};
