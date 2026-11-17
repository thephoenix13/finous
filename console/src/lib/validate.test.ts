import { describe, expect, it } from "vitest";
import { checkLogo, LOGO_MAX_BYTES, validateBranding, validateInstallName, validateInvite, validateKeyName, validateSso, validateSubdomain } from "./validate";

describe("validateSubdomain", () => {
  it("accepts letters, digits and inner hyphens", () => {
    for (const ok of ["abc", "demo-coop", "bank123", "a1b", "x".repeat(30)]) expect(validateSubdomain(ok)).toBeNull();
  });

  it("rejects the wrong shapes, each for its own reason", () => {
    expect(validateSubdomain("")).toMatch(/choose an address/i);
    expect(validateSubdomain("ab")).toMatch(/at least 3/);
    expect(validateSubdomain("x".repeat(31))).toMatch(/30 characters or fewer/);
    expect(validateSubdomain("Has-Caps")).toMatch(/lower case/);
    expect(validateSubdomain("has space")).toMatch(/lower case/);
    expect(validateSubdomain("-start")).toMatch(/start and end/i);
    expect(validateSubdomain("end-")).toMatch(/start and end/i);
  });

  it("rejects reserved words", () => {
    for (const word of ["www", "admin", "console", "business", "finous", "api"]) expect(validateSubdomain(word)).toMatch(/reserved/);
  });

  it("allows exactly 3 and exactly 30 characters", () => {
    expect(validateSubdomain("abc")).toBeNull();
    expect(validateSubdomain("a".repeat(30))).toBeNull();
    expect(validateSubdomain("a".repeat(31))).not.toBeNull();
  });
});

describe("validateInstallName", () => {
  it("needs 2 to 30 characters", () => {
    expect(validateInstallName("A")).not.toBeNull();
    expect(validateInstallName("  A ")).not.toBeNull();
    expect(validateInstallName("AB")).toBeNull();
    expect(validateInstallName("x".repeat(30))).toBeNull();
    expect(validateInstallName("x".repeat(31))).not.toBeNull();
  });
});

const GOOD = { name: "Demo Bank", brandColour: "#0B6E4F", onBrandColour: "#FFFFFF", disclaimer: "We give information, not advice." };

describe("validateBranding", () => {
  it("accepts a readable pair", () => {
    expect(validateBranding(GOOD)).toEqual({});
  });

  it("blocks text that is hard to read on the brand colour, and says by how much", () => {
    const errors = validateBranding({ ...GOOD, brandColour: "#1E5EFF", onBrandColour: "#6B8FFF" });
    expect(errors.onBrandColour).toMatch(/contrast of \d\.\d:1/);
    expect(errors.onBrandColour).toMatch(/at least 4\.5:1/);
  });

  it("blocks a brand colour too pale to see against the app background", () => {
    const errors = validateBranding({ ...GOOD, brandColour: "#E8C547", onBrandColour: "#000000" });
    expect(errors.brandColour).toMatch(/too pale/);
    expect(errors.onBrandColour).toBeUndefined();
  });

  it("asks for real colours", () => {
    const errors = validateBranding({ ...GOOD, brandColour: "green", onBrandColour: "nope" });
    expect(errors.brandColour).toMatch(/#1E5EFF/);
    expect(errors.onBrandColour).toMatch(/#FFFFFF/);
  });

  it("accepts the short hex form and lower case", () => {
    expect(validateBranding({ ...GOOD, brandColour: "#063", onBrandColour: "#fff" })).toEqual({});
  });

  it("checks the name and the disclaimer lengths at their edges", () => {
    expect(validateBranding({ ...GOOD, name: "A" }).name).toBeDefined();
    expect(validateBranding({ ...GOOD, name: "AB" }).name).toBeUndefined();
    expect(validateBranding({ ...GOOD, name: "x".repeat(60) }).name).toBeUndefined();
    expect(validateBranding({ ...GOOD, name: "x".repeat(61) }).name).toBeDefined();
    expect(validateBranding({ ...GOOD, disclaimer: "too short" }).disclaimer).toBeDefined();
    expect(validateBranding({ ...GOOD, disclaimer: "x".repeat(10) }).disclaimer).toBeUndefined();
    expect(validateBranding({ ...GOOD, disclaimer: "x".repeat(400) }).disclaimer).toBeUndefined();
    expect(validateBranding({ ...GOOD, disclaimer: "x".repeat(401) }).disclaimer).toBeDefined();
  });

  it("trims before measuring", () => {
    expect(validateBranding({ ...GOOD, name: "   A   " }).name).toBeDefined();
  });
});

describe("checkLogo", () => {
  it("accepts PNG, JPEG and SVG up to the size limit", () => {
    for (const type of ["image/png", "image/jpeg", "image/svg+xml"]) expect(checkLogo({ type, size: 1000 })).toBeNull();
    expect(checkLogo({ type: "image/png", size: LOGO_MAX_BYTES })).toBeNull();
  });

  it("rejects other types and files that are too big", () => {
    expect(checkLogo({ type: "application/pdf", size: 10 })).toMatch(/PNG, JPEG or SVG/);
    expect(checkLogo({ type: "image/gif", size: 10 })).toMatch(/PNG, JPEG or SVG/);
    expect(checkLogo({ type: "image/png", size: LOGO_MAX_BYTES + 1 })).toMatch(/512 KB/);
  });
});

describe("validateInvite", () => {
  const ok = { email: "new@bank.example", role: "marketing", branch: "all" };

  it("accepts a new colleague", () => {
    expect(validateInvite(ok, ["old@bank.example"])).toEqual({});
  });

  it("asks for a real email, a role and a branch", () => {
    expect(validateInvite({ ...ok, email: "nope" }, []).email).toMatch(/work email/);
    expect(validateInvite({ ...ok, email: "a@b" }, []).email).toBeDefined();
    expect(validateInvite({ ...ok, role: "" }, []).role).toBeDefined();
    expect(validateInvite({ ...ok, branch: "" }, []).branch).toBeDefined();
  });

  it("refuses an email that already has access, ignoring case and spaces", () => {
    expect(validateInvite({ ...ok, email: "  OLD@Bank.example " }, ["old@bank.example"]).email).toMatch(/already/);
  });
});

describe("validateSso", () => {
  const on = { enabled: true, provider: "Okta", entityId: "urn:demo", signInUrl: "https://login.example/demo" };

  it("asks for nothing while single sign-on is off, so half-finished entries can be kept", () => {
    expect(validateSso({ enabled: false, provider: "", entityId: "", signInUrl: "not a url" })).toEqual({});
  });

  it("accepts a complete set", () => {
    expect(validateSso(on)).toEqual({});
    expect(validateSso({ ...on, provider: "  Okta ", signInUrl: " https://login.example/demo " })).toEqual({});
  });

  it("asks for each of the three when it is on", () => {
    const errors = validateSso({ enabled: true, provider: "", entityId: "", signInUrl: "" });
    expect(Object.keys(errors).sort()).toEqual(["entityId", "provider", "signInUrl"]);
  });

  it("checks the two text fields at their minimum lengths", () => {
    expect(validateSso({ ...on, provider: "O" }).provider).toBeDefined();
    expect(validateSso({ ...on, provider: "Ok" }).provider).toBeUndefined();
    expect(validateSso({ ...on, entityId: "ab" }).entityId).toBeDefined();
    expect(validateSso({ ...on, entityId: "abc" }).entityId).toBeUndefined();
  });

  it("accepts only an https address", () => {
    for (const bad of ["http://login.example", "login.example", "ftp://login.example", "javascript:alert(1)", "https://", "  "]) {
      expect(validateSso({ ...on, signInUrl: bad }).signInUrl, bad).toBeDefined();
    }
    expect(validateSso({ ...on, signInUrl: "https://login.example/a?b=1" }).signInUrl).toBeUndefined();
  });
});

describe("validateKeyName", () => {
  it("needs 2 to 40 characters once trimmed", () => {
    expect(validateKeyName("")).not.toBeNull();
    expect(validateKeyName(" a ")).not.toBeNull();
    expect(validateKeyName("ab")).toBeNull();
    expect(validateKeyName("x".repeat(40))).toBeNull();
    expect(validateKeyName("x".repeat(41))).not.toBeNull();
  });
});
