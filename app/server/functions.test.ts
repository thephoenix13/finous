import { describe, expect, it } from "vitest";
import advisorEntry from "../api/advisor.ts?raw";
import bankIconEntry from "../api/bank-icon.ts?raw";
import manifestEntry from "../api/manifest.ts?raw";
import bankServer from "./bank.ts?raw";
import brandingShared from "../src/bank/branding.ts?raw";

const ENTRIES = { "api/advisor.ts": advisorEntry, "api/bank-icon.ts": bankIconEntry, "api/manifest.ts": manifestEntry };

/** Every relative import in a file, as written. */
const relativeImports = (source: string) => [...source.matchAll(/(?:from|import)\s+"(\.{1,2}\/[^"]*)"/g)].map((m) => m[1]);

/**
 * Vercel runs everything under api/ as plain Node ES modules, where a relative import must name its extension.
 * Without ".js" the function fails at start-up with ERR_MODULE_NOT_FOUND (it did, on the first deploy), and no other test sees it.
 */
describe("functions under api/", () => {
  for (const [name, source] of Object.entries(ENTRIES)) {
    it(`${name} imports its own modules with an explicit .js extension`, () => {
      const relative = relativeImports(source);
      expect(relative.length).toBeGreaterThan(0);
      for (const path of relative) expect(path, `${path} needs a .js extension`).toMatch(/\.js$/);
    });
  }

  it("the server code they import follows the same rule", () => {
    for (const path of relativeImports(bankServer)) expect(path, `${path} needs a .js extension`).toMatch(/\.js$/);
  });

  it("the branding code the app and the functions share imports nothing, so Node can run it as it is", () => {
    expect(relativeImports(brandingShared)).toEqual([]);
    expect(brandingShared).not.toMatch(/^\s*import\s/m);
  });

  it("no function is added without being covered here", () => {
    const files = Object.keys(import.meta.glob("../api/*.ts", { query: "?raw", eager: false })).map((p) => p.replace("../", ""));
    expect(files.sort()).toEqual(Object.keys(ENTRIES).sort());
  });

  it("the bank functions use only the public Supabase key, never the service role key", () => {
    for (const source of [bankIconEntry, manifestEntry, bankServer]) expect(source).not.toMatch(/SERVICE_ROLE|service_role/i);
  });
});
