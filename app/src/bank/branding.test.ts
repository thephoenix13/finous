import { describe, expect, it } from "vitest";
import { bankSubdomainFromHost, brandTokens, contrastRatio, MAX_LOGO_LENGTH, PAGE_BACKGROUND, parseBranding } from "./branding";

const DOMAIN = "app.finous.site";

describe("bankSubdomainFromHost", () => {
  it.each([
    ["seva.app.finous.site", "seva"],
    ["SEVA.App.Finous.Site", "seva"],
    ["seva.app.finous.site:443", "seva"],
    ["seva.app.finous.site.", "seva"],
    ["first-bank.app.finous.site", "first-bank"],
    ["seva.localhost", "seva"],
    ["seva.localhost:5173", "seva"],
  ])("%s is the bank %s", (host, expected) => {
    expect(bankSubdomainFromHost(host, DOMAIN)).toBe(expected);
  });

  it.each([
    "app.finous.site", // Finous's own address
    "localhost",
    "localhost:5173",
    "finous-app.vercel.app",
    "www.finous.site",
    "a.b.app.finous.site", // two labels: not one bank's address
    "x.app.finous.site", // too short to be an address
    "-seva.app.finous.site",
    "seva-.app.finous.site",
    "se_va.app.finous.site",
    "seva.app.finous.site.evil.example", // our domain in the middle of someone else's
    "evilapp.finous.site",
    "",
  ])("%s is not a bank", (host) => {
    expect(bankSubdomainFromHost(host, DOMAIN)).toBeNull();
  });

  it("treats a missing host as not a bank", () => {
    expect(bankSubdomainFromHost(undefined, DOMAIN)).toBeNull();
    expect(bankSubdomainFromHost(null, DOMAIN)).toBeNull();
  });

  it("uses the domain it is given", () => {
    expect(bankSubdomainFromHost("seva.staging.finous.site", "staging.finous.site")).toBe("seva");
    expect(bankSubdomainFromHost("seva.app.finous.site", "staging.finous.site")).toBeNull();
  });
});

const png = "data:image/png;base64,iVBORw0KGgo=";
const row = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  subdomain: "seva",
  name: "Seva Co-operative Bank",
  install_name: "Seva Money",
  logo: png,
  brand_colour: "#0f6b4a",
  on_brand_colour: "#ffffff",
  disclaimer: "Regulated by the RBI. Not investment advice.",
  english: true,
  hindi: true,
  advisor: "rules",
  ...over,
});

describe("parseBranding", () => {
  it("reads a row, putting colours into upper case", () => {
    expect(parseBranding(row())).toEqual({
      id: "b1",
      subdomain: "seva",
      name: "Seva Co-operative Bank",
      installName: "Seva Money",
      logo: png,
      brandColour: "#0F6B4A",
      onBrandColour: "#FFFFFF",
      disclaimer: "Regulated by the RBI. Not investment advice.",
      english: true,
      hindi: true,
      advisor: "rules",
    });
  });

  it("trims names and the disclaimer", () => {
    const bank = parseBranding(row({ name: "  Seva Bank  ", disclaimer: "  Regulated by the RBI.  " }));
    expect(bank?.name).toBe("Seva Bank");
    expect(bank?.disclaimer).toBe("Regulated by the RBI.");
  });

  it.each([
    ["no row", null],
    ["a string", "seva"],
    ["no id", row({ id: undefined })],
    ["a bad address", row({ subdomain: "Seva Bank" })],
    ["a one-letter name", row({ name: "S" })],
    ["a name over 60", row({ name: "x".repeat(61) })],
    ["a one-letter install name", row({ install_name: "S" })],
    ["an install name over 30", row({ install_name: "x".repeat(31) })],
    ["a short disclaimer", row({ disclaimer: "Short" })],
    ["a disclaimer over 400", row({ disclaimer: "x".repeat(401) })],
    ["a colour with no #", row({ brand_colour: "0F6B4A" })],
    ["a three-digit colour", row({ brand_colour: "#0f6" })],
    ["a colour name", row({ brand_colour: "green" })],
    ["a colour that carries markup", row({ on_brand_colour: "#FFFFFF;}</style><script>" })],
    ["a missing text colour", row({ on_brand_colour: null })],
  ])("refuses a row with %s", (_name, bad) => {
    expect(parseBranding(bad)).toBeNull();
  });

  it("drops a logo that is not a small image, and keeps the bank", () => {
    for (const logo of [
      "https://evil.example/logo.png",
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "data:image/gif;base64,R0lGOD",
      "data:image/png;base64,not base64!",
      "data:image/png,rawbytes",
      `data:image/png;base64,${"A".repeat(MAX_LOGO_LENGTH)}`,
      42,
    ]) {
      const bank = parseBranding(row({ logo }));
      expect(bank, String(logo).slice(0, 40)).not.toBeNull();
      expect(bank?.logo).toBeNull();
    }
  });

  it("accepts each logo format the database allows", () => {
    for (const logo of ["data:image/png;base64,AAAA", "data:image/jpeg;base64,AAAA", "data:image/svg+xml;base64,AAAA"]) {
      expect(parseBranding(row({ logo }))?.logo).toBe(logo);
    }
  });

  it("has no logo when there is none", () => {
    expect(parseBranding(row({ logo: null }))?.logo).toBeNull();
  });

  it("falls back to the safest advisor setting when it is unrecognised", () => {
    expect(parseBranding(row({ advisor: "off" }))?.advisor).toBe("off");
    expect(parseBranding(row({ advisor: "ai" }))?.advisor).toBe("ai");
    expect(parseBranding(row({ advisor: "rules" }))?.advisor).toBe("rules");
    expect(parseBranding(row({ advisor: "anything" }))?.advisor).toBe("rules");
    expect(parseBranding(row({ advisor: undefined }))?.advisor).toBe("rules");
  });

  it("keeps a language switched off, but never leaves a bank with none", () => {
    expect(parseBranding(row({ english: false, hindi: true }))).toMatchObject({ english: false, hindi: true });
    expect(parseBranding(row({ english: true, hindi: false }))).toMatchObject({ english: true, hindi: false });
    expect(parseBranding(row({ english: false, hindi: false }))).toMatchObject({ english: true, hindi: true });
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for the same colour", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#1E5EFF", "#1E5EFF")).toBeCloseTo(1, 5);
  });

  it("does not depend on which colour is first", () => {
    expect(contrastRatio("#0F6B4A", "#FFFFFF")).toBe(contrastRatio("#FFFFFF", "#0F6B4A"));
  });

  it("is null for something that is not a six-digit colour", () => {
    expect(contrastRatio("red", "#FFFFFF")).toBeNull();
    expect(contrastRatio("#FFF", "#000000")).toBeNull();
  });
});

const bank = (brandColour: string, onBrandColour: string) => ({ brandColour, onBrandColour });

describe("brandTokens", () => {
  it("returns the bank's colours for a pair that reads", () => {
    const tokens = brandTokens(bank("#0F6B4A", "#FFFFFF"));
    expect(tokens).toMatchObject({ "--brand": "#0F6B4A", "--on-brand": "#FFFFFF", "--d": "#0F6B4A" });
    expect(tokens?.["--sh-brand"]).toBe("0 8px 20px rgb(15 107 74 / 0.3)");
  });

  it("returns null, so the app stays Finous blue, when the text on the brand colour is unreadable", () => {
    expect(brandTokens(bank("#0F6B4A", "#1A7A57"))).toBeNull();
    // 4.4:1 is just under the line
    const near = ["#767676", "#777777"];
    expect(contrastRatio(near[0], "#FFFFFF")!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(near[1], "#FFFFFF")!).toBeLessThan(4.5);
    expect(brandTokens(bank("#777777", "#FFFFFF"))).toBeNull();
    expect(brandTokens(bank("#767676", "#FFFFFF"))).not.toBeNull();
  });

  it("returns null when the brand colour does not stand out against the page", () => {
    expect(brandTokens(bank("#CFE8FF", "#000000"))).toBeNull();
    expect(brandTokens(bank("#FFFFFF", "#000000"))).toBeNull();
    // Readable text on it, but still under 3:1 against the page: a button edge or focus ring would not show.
    const middling = "#9FB4D9";
    expect(contrastRatio("#000000", middling)!).toBeGreaterThan(4.5);
    expect(contrastRatio(middling, PAGE_BACKGROUND)!).toBeLessThan(3);
    expect(contrastRatio(middling, PAGE_BACKGROUND)!).toBeGreaterThan(1.5);
    expect(brandTokens(bank(middling, "#000000"))).toBeNull();
  });

  it("returns null for a colour that is not a colour", () => {
    expect(brandTokens(bank("green", "#FFFFFF"))).toBeNull();
    expect(brandTokens(bank("#0F6B4A", "white"))).toBeNull();
  });

  // Whatever the bank picks, the combinations the app actually draws must read: this is the property that matters.
  it.each(["#0F6B4A", "#1E5EFF", "#B3261E", "#6A1B9A", "#8A3B12", "#006064", "#444444", "#E65100", "#FF6F00", "#00897B", "#3949AB", "#C2185B", "#7CB342"])(
    "keeps every combination readable for %s",
    (colour) => {
      const tokens = brandTokens(bank(colour, "#FFFFFF"));
      if (!tokens) return; // refused: the app stays blue, which is also fine
      const on = (a: string, b: string) => contrastRatio(tokens[a as keyof typeof tokens], tokens[b as keyof typeof tokens]) ?? 0;
      expect(on("--on-brand", "--brand")).toBeGreaterThanOrEqual(4.5); // button text
      expect(on("--on-brand", "--brand-strong")).toBeGreaterThanOrEqual(4.5); // pressed button text
      expect(contrastRatio(tokens["--brand-text"], PAGE_BACKGROUND)!).toBeGreaterThanOrEqual(4.5); // a link on the page
      expect(on("--dt", "--dn")).toBeGreaterThanOrEqual(4.5); // text on a tinted card or a ghost button
      expect(contrastRatio(tokens["--brand"], PAGE_BACKGROUND)!).toBeGreaterThanOrEqual(3); // button edge, focus ring
    },
  );

  it("does not darken a brand colour that already reads as text", () => {
    expect(brandTokens(bank("#0F6B4A", "#FFFFFF"))?.["--brand-text"]).toBe("#0F6B4A");
  });

  it("darkens one that is bright enough for a button but too light for words", () => {
    const tokens = brandTokens(bank("#E65100", "#000000"));
    expect(tokens).not.toBeNull();
    expect(tokens!["--brand-text"]).not.toBe("#E65100");
    expect(contrastRatio(tokens!["--brand-text"], PAGE_BACKGROUND)!).toBeGreaterThanOrEqual(4.5);
  });

  it("only names variables the app defines", () => {
    const names = Object.keys(brandTokens(bank("#0F6B4A", "#FFFFFF"))!).sort();
    expect(names).toEqual(["--brand", "--brand-strong", "--brand-text", "--d", "--dn", "--dt", "--on-brand", "--sh-brand"]);
  });
});
