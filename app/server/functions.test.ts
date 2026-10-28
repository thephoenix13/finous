import { describe, expect, it } from "vitest";
import advisorEntry from "../api/advisor.ts?raw";

/**
 * Vercel runs everything under api/ as plain Node ES modules, where a relative import must name its extension.
 * Without ".js" the function fails at start-up with ERR_MODULE_NOT_FOUND (it did, on the first deploy), and no other test sees it.
 */
describe("functions under api/", () => {
  it("import their own modules with an explicit .js extension", () => {
    const relative = [...advisorEntry.matchAll(/from\s+"(\.{1,2}\/[^"]*)"/g)].map((m) => m[1]);
    expect(relative.length).toBeGreaterThan(0);
    for (const path of relative) expect(path, `${path} needs a .js extension`).toMatch(/\.js$/);
  });
});
