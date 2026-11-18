import { describe, expect, it, vi } from "vitest";
import { bankManifest, handleIcon, handleManifest, hostOf, letterIcon, type Deps } from "./bank.js";
import { parseBranding, type BankBranding } from "../src/bank/branding.js";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const row = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  subdomain: "seva",
  name: "Seva Co-operative Bank",
  install_name: "Seva Money",
  logo: PNG,
  brand_colour: "#0F6B4A",
  on_brand_colour: "#FFFFFF",
  disclaimer: "Regulated by the RBI. Not investment advice.",
  english: true,
  hindi: true,
  advisor: "rules",
  ...over,
});
const bank = (over: Record<string, unknown> = {}): BankBranding => parseBranding(row(over))!;

const ask = (path: string, host: string | null, headers: Record<string, string> = {}) =>
  new Request(`https://finous-app.vercel.app${path}`, { headers: { ...(host ? { "x-forwarded-host": host } : {}), ...headers } });

/** A Supabase that answers bank_public with these rows, and remembers how it was asked. */
function supabase(rows: unknown, status = 200) {
  const fetchFn = vi.fn(async () => new Response(JSON.stringify(rows), { status, headers: { "Content-Type": "application/json" } }));
  const deps: Deps = { supabaseUrl: "https://project.supabase.co", anonKey: "public-anon-key", fetch: fetchFn as unknown as typeof fetch };
  return { deps, fetchFn };
}

describe("hostOf", () => {
  it("prefers the forwarded host, then the host header, then the url", () => {
    expect(hostOf(ask("/x", "seva.app.finous.site"))).toBe("seva.app.finous.site");
    expect(hostOf(ask("/x", "seva.app.finous.site, proxy.internal"))).toBe("seva.app.finous.site");
    expect(hostOf(new Request("https://a.example/x", { headers: { host: "seva.app.finous.site" } }))).toBe("seva.app.finous.site");
    expect(hostOf(new Request("https://seva.app.finous.site/x"))).toBe("seva.app.finous.site");
  });
});

describe("handleManifest", () => {
  it("serves the bank's installed-app manifest", async () => {
    const { deps, fetchFn } = supabase([row()]);
    const res = await handleManifest(ask("/api/manifest", "seva.app.finous.site"), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/manifest+json");
    const manifest = await res.json();
    expect(manifest).toMatchObject({ name: "Seva Co-operative Bank", short_name: "Seva Money", start_url: "/", scope: "/", display: "standalone", theme_color: "#0F6B4A" });
    expect(manifest.icons).toEqual([
      { src: "/api/bank-icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/bank-icon", sizes: "512x512", type: "image/png", purpose: "any" },
    ]);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("asks bank_public for the address, with only the public key", async () => {
    const { deps, fetchFn } = supabase([row()]);
    await handleManifest(ask("/api/manifest", "seva.app.finous.site"), deps);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/rpc/bank_public");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ p_subdomain: "seva" });
    expect(init.headers).toMatchObject({ apikey: "public-anon-key", Authorization: "Bearer public-anon-key" });
  });

  it("is 404 on Finous's own address, and never asks the database", async () => {
    const { deps, fetchFn } = supabase([row()]);
    for (const host of ["app.finous.site", "finous-app.vercel.app", "localhost:3000", "a.b.app.finous.site"]) {
      expect((await handleManifest(ask("/api/manifest", host), deps)).status, host).toBe(404);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("is 404 when there is no live bank at the address", async () => {
    const { deps } = supabase([]);
    expect((await handleManifest(ask("/api/manifest", "nobody.app.finous.site"), deps)).status).toBe(404);
  });

  it("is 404 for a row that is not a valid bank", async () => {
    const { deps } = supabase([row({ brand_colour: "nope" })]);
    expect((await handleManifest(ask("/api/manifest", "seva.app.finous.site"), deps)).status).toBe(404);
  });

  it("is 503, and not cached, when the database cannot be reached", async () => {
    const down = supabase({ message: "boom" }, 500);
    const res = await handleManifest(ask("/api/manifest", "seva.app.finous.site"), down.deps);
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const thrown: Deps = { supabaseUrl: "https://p.supabase.co", anonKey: "k", fetch: (async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch };
    expect((await handleManifest(ask("/api/manifest", "seva.app.finous.site"), thrown)).status).toBe(503);
  });

  it("is 503 when the function has no Supabase settings", async () => {
    expect((await handleManifest(ask("/api/manifest", "seva.app.finous.site"), {})).status).toBe(503);
    expect((await handleManifest(ask("/api/manifest", "seva.app.finous.site"), { supabaseUrl: "https://p.supabase.co" })).status).toBe(503);
  });

  it("answers only for the domain it is told banks live under", async () => {
    const { deps } = supabase([row()]);
    expect((await handleManifest(ask("/x", "seva.staging.finous.site"), { ...deps, appDomain: "staging.finous.site" })).status).toBe(200);
    expect((await handleManifest(ask("/x", "seva.app.finous.site"), { ...deps, appDomain: "staging.finous.site" })).status).toBe(404);
    // An empty setting means "not set", not "any domain"
    expect((await handleManifest(ask("/x", "seva.app.finous.site"), { ...deps, appDomain: "" })).status).toBe(200);
  });

  it("is cached for minutes, not days, so a change to the branding shows soon", async () => {
    const { deps } = supabase([row()]);
    expect((await handleManifest(ask("/x", "seva.app.finous.site"), deps)).headers.get("Cache-Control")).toBe("public, max-age=300");
  });
});

describe("bankManifest", () => {
  it("uses Finous's colour, not the bank's, when the bank's pair does not read", () => {
    expect(bankManifest(bank({ brand_colour: "#CFE8FF" })).theme_color).toBe("#F3F7FF");
  });

  it("offers an SVG logo or a letter icon at any size, and a JPEG at the two sizes", () => {
    const svg = bankManifest(bank({ logo: "data:image/svg+xml;base64,AAAA" })).icons;
    expect(svg).toEqual([{ src: "/api/bank-icon", sizes: "any", type: "image/svg+xml", purpose: "any" }]);
    expect(bankManifest(bank({ logo: null })).icons).toEqual(svg);
    expect(bankManifest(bank({ logo: "data:image/jpeg;base64,AAAA" })).icons.map((i) => [i.sizes, i.type])).toEqual([
      ["192x192", "image/jpeg"],
      ["512x512", "image/jpeg"],
    ]);
  });

  it("is in Hindi when the bank offers only Hindi", () => {
    expect(bankManifest(bank({ english: false })).lang).toBe("hi-IN");
    expect(bankManifest(bank()).lang).toBe("en-IN");
  });
});

describe("handleIcon", () => {
  it("serves the logo exactly as saved", async () => {
    const { deps } = supabase([row()]);
    const res = await handleIcon(ask("/api/bank-icon", "seva.app.finous.site"), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([...Uint8Array.from(atob("iVBORw0KGgo="), (c) => c.charCodeAt(0))]);
  });

  it("stops any script in a logo from running if the address is opened directly", async () => {
    const hostile = btoa('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const { deps } = supabase([row({ logo: `data:image/svg+xml;base64,${hostile}` })]);
    const res = await handleIcon(ask("/api/bank-icon", "seva.app.finous.site"), deps);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(res.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("makes a letter icon in the bank's colours when there is no logo", async () => {
    const { deps } = supabase([row({ logo: null })]);
    const res = await handleIcon(ask("/api/bank-icon", "seva.app.finous.site"), deps);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    const svg = await res.text();
    expect(svg).toContain('fill="#0F6B4A"');
    expect(svg).toContain('fill="#FFFFFF"');
    expect(svg).toContain(">S</text>");
  });

  it("treats a logo that will not decode as no logo", async () => {
    // Passes parseBranding's pattern (valid base64 characters) but is not decodable: one stray character
    const { deps } = supabase([row({ logo: "data:image/png;base64,A" })]);
    const res = await handleIcon(ask("/api/bank-icon", "seva.app.finous.site"), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
  });

  it("is 404 and 503 in the same cases as the manifest", async () => {
    expect((await handleIcon(ask("/x", "app.finous.site"), supabase([row()]).deps)).status).toBe(404);
    expect((await handleIcon(ask("/x", "nobody.app.finous.site"), supabase([]).deps)).status).toBe(404);
    expect((await handleIcon(ask("/x", "seva.app.finous.site"), {})).status).toBe(503);
  });

  it("has no caching header that could outlive a change by days", async () => {
    const { deps } = supabase([row()]);
    expect((await handleIcon(ask("/x", "seva.app.finous.site"), deps)).headers.get("Cache-Control")).toBe("public, max-age=300");
  });
});

describe("letterIcon", () => {
  it("uses the first letter or digit, upper case, in any script", () => {
    expect(letterIcon(bank({ name: "seva bank" }))).toContain(">S</text>");
    expect(letterIcon(bank({ name: "  (3) Star Bank" }))).toContain(">3</text>");
    expect(letterIcon(bank({ name: "कोष सहकारी बैंक" }))).toContain(">क</text>");
  });

  it("escapes a name that tries to carry markup", () => {
    // parseBranding allows any characters in a name, so the icon must not trust it. The first letter is taken, never the whole name.
    const svg = letterIcon(bank({ name: "<script>alert(1)</script> Bank" }));
    expect(svg).not.toContain("<script");
    expect(svg).toContain(">S</text>");
    expect(letterIcon(bank({ name: "&Co Bank" }))).not.toContain("&Co");
  });
});
