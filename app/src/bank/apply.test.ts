// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyBank, BANK_ICON_URL, BANK_MANIFEST_URL } from "./apply";
import { parseBranding, type BankBranding } from "./branding";

const make = (over: Record<string, unknown> = {}): BankBranding =>
  parseBranding({
    id: "b1",
    subdomain: "seva",
    name: "Seva Co-operative Bank",
    install_name: "Seva Money",
    logo: "data:image/png;base64,iVBORw0KGgo=",
    brand_colour: "#0F6B4A",
    on_brand_colour: "#FFFFFF",
    disclaimer: "Regulated by the RBI. Not investment advice.",
    english: true,
    hindi: true,
    advisor: "rules",
    ...over,
  })!;

const HEAD = `
  <title>Finous</title>
  <meta name="apple-mobile-web-app-title" content="Finous" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />`;

const root = document.documentElement;
const link = (rel: string) => document.head.querySelector(`link[rel="${rel}"]`);

beforeEach(() => {
  document.head.innerHTML = HEAD;
  document.title = "Finous";
});
afterEach(() => {
  document.head.innerHTML = "";
  root.removeAttribute("style");
  root.removeAttribute("data-tenant");
});

describe("applyBank", () => {
  it("makes the page the bank's: title, install name, colours, manifest and icons", () => {
    applyBank(make());
    expect(document.title).toBe("Seva Co-operative Bank");
    expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Seva Money");
    expect(root.style.getPropertyValue("--brand")).toBe("#0F6B4A");
    expect(root.style.getPropertyValue("--on-brand")).toBe("#FFFFFF");
    expect(root).toHaveAttribute("data-tenant", "seva");
    expect(link("manifest")).toHaveAttribute("href", BANK_MANIFEST_URL);
    expect(link("icon")).toHaveAttribute("href", BANK_ICON_URL);
    expect(link("icon")).toHaveAttribute("type", "image/png");
    expect(link("apple-touch-icon")).toHaveAttribute("href", BANK_ICON_URL);
  });

  it("puts everything back exactly as it was", () => {
    const before = document.head.innerHTML;
    const undo = applyBank(make());
    undo();
    expect(document.head.innerHTML).toBe(before);
    expect(document.title).toBe("Finous");
    expect(root.style.getPropertyValue("--brand")).toBe("");
    expect(root).not.toHaveAttribute("data-tenant");
  });

  it("restores a value the page already had, not just removes it", () => {
    root.style.setProperty("--brand", "#123456");
    const undo = applyBank(make());
    expect(root.style.getPropertyValue("--brand")).toBe("#0F6B4A");
    undo();
    expect(root.style.getPropertyValue("--brand")).toBe("#123456");
  });

  it("stays Finous blue, but still the bank's name and icon, when the colours do not read", () => {
    applyBank(make({ brand_colour: "#CFE8FF" }));
    expect(root.style.getPropertyValue("--brand")).toBe("");
    expect(root.style.getPropertyValue("--on-brand")).toBe("");
    expect(document.title).toBe("Seva Co-operative Bank");
    expect(link("manifest")).toHaveAttribute("href", BANK_MANIFEST_URL);
  });

  it("leaves the home-screen icon alone for an SVG logo, because iOS needs a PNG", () => {
    applyBank(make({ logo: "data:image/svg+xml;base64,AAAA" }));
    expect(link("icon")).toHaveAttribute("href", BANK_ICON_URL);
    expect(link("icon")).toHaveAttribute("type", "image/svg+xml");
    expect(link("apple-touch-icon")).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  });

  it("leaves both icons alone when there is no logo", () => {
    applyBank(make({ logo: null }));
    expect(link("icon")).toHaveAttribute("href", "/favicon.svg");
    expect(link("apple-touch-icon")).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  });

  it("makes a link the page lacks, and removes it again", () => {
    document.head.innerHTML = "<title>Finous</title>";
    const undo = applyBank(make());
    expect(link("manifest")).toHaveAttribute("href", BANK_MANIFEST_URL);
    expect(link("icon")).not.toBeNull();
    undo();
    expect(document.head.querySelector("link")).toBeNull();
  });

  it("does not need an install-name tag to exist", () => {
    document.head.innerHTML = "<title>Finous</title>";
    expect(() => applyBank(make())()).not.toThrow();
  });
});
