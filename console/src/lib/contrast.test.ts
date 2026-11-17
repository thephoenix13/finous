import { describe, expect, it } from "vitest";
import { contrastRatio, normaliseHex, parseHex } from "./contrast";

describe("parseHex", () => {
  it("reads six and three digit colours, with or without the hash", () => {
    expect(parseHex("#1e5eff")).toEqual([30, 94, 255]);
    expect(parseHex("1E5EFF")).toEqual([30, 94, 255]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("  #0b1b3f ")).toEqual([11, 27, 63]);
  });

  it("rejects anything else", () => {
    for (const bad of ["", "#12", "#12345", "#1234567", "blue", "#gggggg", "rgb(1,2,3)"]) expect(parseHex(bad)).toBeNull();
  });
});

describe("normaliseHex", () => {
  it("gives one spelling: # and six upper case digits", () => {
    expect(normaliseHex("1e5eff")).toBe("#1E5EFF");
    expect(normaliseHex("#abc")).toBe("#AABBCC");
    expect(normaliseHex("#000")).toBe("#000000");
  });

  it("is null for a non-colour", () => {
    expect(normaliseHex("nope")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for the same colour", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
  });

  it("does not depend on which colour is first", () => {
    expect(contrastRatio("#1e5eff", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#1e5eff")!, 10);
  });

  it("matches a known value: white on the Finous blue is about 5.1", () => {
    expect(contrastRatio("#ffffff", "#1e5eff")).toBeGreaterThan(5);
    expect(contrastRatio("#ffffff", "#1e5eff")).toBeLessThan(5.3);
  });

  it("is null if either side is not a colour", () => {
    expect(contrastRatio("x", "#fff")).toBeNull();
    expect(contrastRatio("#fff", "x")).toBeNull();
  });
});
