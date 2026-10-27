import { describe, expect, it } from "vitest";
import { en } from "./locales/en";
import { hi } from "./locales/hi";

/** { a: { b: "x" } } -> { "a.b": "x" } */
function flatten(obj: object, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();
const DEVANAGARI = /[ऀ-ॿ]/;

const flatEn = flatten(en);
const flatHi = flatten(hi);
const keys = Object.keys(flatEn);

describe("message catalogs", () => {
  it("has the same keys in English and Hindi", () => {
    // The type system already forces this for hi.ts; the test also catches extra keys added through casts.
    expect(Object.keys(flatHi).sort()).toEqual([...keys].sort());
  });

  it("has no empty strings", () => {
    expect(keys.filter((k) => flatEn[k].trim() === "")).toEqual([]);
    expect(keys.filter((k) => flatHi[k].trim() === "")).toEqual([]);
  });

  it("keeps the same {{placeholders}} in both languages", () => {
    const mismatched = keys.filter((k) => placeholders(flatEn[k]).join() !== placeholders(flatHi[k]).join());
    expect(mismatched).toEqual([]);
  });

  it("has actually translated every Hindi string (not a copy of the English)", () => {
    expect(keys.filter((k) => flatHi[k] === flatEn[k])).toEqual([]);
  });

  it("writes every Hindi string in Devanagari", () => {
    expect(keys.filter((k) => !DEVANAGARI.test(flatHi[k]))).toEqual([]);
  });

  it("keeps the English offline title the offline smoke test looks for", () => {
    // scripts/pwa-check.mjs finds the offline screen by this exact heading.
    expect(en.offline.title).toBe("You're offline");
  });
});
