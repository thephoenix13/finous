import { describe, expect, it } from "vitest";
import { parseInteger, parsePercent, parseRupees, readFields, toField, type FieldSpec } from "./formFields";

describe("parseRupees", () => {
  it.each([
    ["240000", 240000],
    ["2,40,000", 240000],
    ["240,000", 240000],
    ["12,34,567", 1234567],
    ["1,234,567", 1234567],
    ["₹ 2,40,000", 240000],
    ["₹2,40,000.00", 240000],
    ["  500 ", 500],
    ["0", 0],
  ])("reads %j as %i", (text, n) => {
    expect(parseRupees(text)).toBe(n);
  });

  it("is undefined for blank", () => {
    expect(parseRupees("")).toBeUndefined();
    expect(parseRupees("   ")).toBeUndefined();
  });

  it.each(["abc", "-5", "10.5", "1,2,3", "12,34", "2,40,00", "1e5", "2 lakh", "₹", "5,", ",500", "99999999999999999999"])("rejects %j", (text) => {
    expect(parseRupees(text)).toBeNull();
  });
});

describe("parseInteger and parsePercent", () => {
  it("reads whole numbers only", () => {
    expect(parseInteger("12")).toBe(12);
    expect(parseInteger("")).toBeUndefined();
    expect(parseInteger("1.5")).toBeNull();
    expect(parseInteger("-1")).toBeNull();
    expect(parseInteger("1,000")).toBeNull();
  });

  it("reads a percent with up to two decimals, and a trailing %", () => {
    expect(parsePercent("8.5")).toBe(8.5);
    expect(parsePercent("8.25 %")).toBe(8.25);
    expect(parsePercent("9%")).toBe(9);
    expect(parsePercent("")).toBeUndefined();
    expect(parsePercent("8.255")).toBeNull();
    expect(parsePercent("-1")).toBeNull();
    expect(parsePercent("eight")).toBeNull();
  });
});

describe("readFields", () => {
  const specs: FieldSpec[] = [
    { key: "name", type: "text", required: true },
    { key: "balance", type: "rupees", required: true },
    { key: "emi", type: "rupees", min: 1 },
    { key: "last4", type: "last4", required: true },
    { key: "rate", type: "percent", min: 0, max: 40 },
    { key: "month", type: "month" },
    { key: "kind", type: "select", options: ["home", "car"] },
    { key: "auto", type: "switch" },
  ];
  const good = { name: " HDFC ", balance: "2,84,000", last4: "4821", rate: "8.9", month: "2025-03", kind: "home", auto: "true" };

  it("returns clean values, with blank optional fields left out", () => {
    expect(readFields(specs, good)).toEqual({
      ok: true,
      values: { name: "HDFC", balance: 284000, emi: undefined, last4: "4821", rate: 8.9, month: "2025-03", kind: "home", auto: true },
    });
  });

  it("treats a missing switch as off, and a missing optional field as not stated", () => {
    const r = readFields(specs, { name: "x", balance: "1", last4: "1234" });
    expect(r).toMatchObject({ ok: true, values: { auto: false, emi: undefined, rate: undefined, month: undefined, kind: undefined } });
  });

  it("reports every problem at once, each with its reason", () => {
    const r = readFields(specs, { name: "  ", balance: "lots", emi: "0", last4: "12", rate: "41", month: "March", kind: "boat" });
    expect(r).toEqual({ ok: false, errors: { name: "required", balance: "invalid", emi: "range", last4: "invalid", rate: "range", month: "invalid", kind: "invalid" } });
  });

  it("accepts a number exactly at its limits", () => {
    expect(readFields([{ key: "r", type: "percent", min: 0, max: 40 }], { r: "40" })).toMatchObject({ ok: true });
    expect(readFields([{ key: "r", type: "percent", min: 0, max: 40 }], { r: "0" })).toMatchObject({ ok: true });
    expect(readFields([{ key: "r", type: "percent", min: 0, max: 40 }], { r: "40.01" })).toMatchObject({ ok: false });
  });

  it("does not accept a month of 00 or 13", () => {
    expect(readFields([{ key: "m", type: "month" }], { m: "2026-13" })).toMatchObject({ ok: false });
    expect(readFields([{ key: "m", type: "month" }], { m: "2026-00" })).toMatchObject({ ok: false });
    expect(readFields([{ key: "m", type: "month" }], { m: "2026-12" })).toMatchObject({ ok: true });
  });
});

describe("toField", () => {
  it("puts a number back as plain digits and an unstated figure as blank", () => {
    expect(toField(240000)).toBe("240000");
    expect(toField(0)).toBe("0");
    expect(toField(undefined)).toBe("");
  });
});
