/**
 * PWA smoke test. Serves the production build, drives a real headless Chrome over the DevTools protocol,
 * and checks the guarantees from Architecture v1.1:
 *
 *   - the service worker installs and controls the page
 *   - it caches the app shell only (nothing under /api, no runtime caches)
 *   - offline, the shell still loads and shows "You're offline", including on a deep link
 *   - coming back online recovers without a reload
 *   - the manifest is installable (192, 512 and maskable icons, standalone)
 *
 * Usage: npm run build && npm run test:pwa
 * Chrome is found automatically; set CHROME_PATH to override. Exits non-zero on any failure.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEW_PORT = 4173;
const DEBUG_PORT = 9333;
const BASE = `http://localhost:${PREVIEW_PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n        ${detail}`}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

async function waitFor(fn, what, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* not ready yet */
    }
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${what}`);
}

if (!existsSync(join(root, "dist", "sw.js"))) {
  console.error("dist/sw.js not found. Run `npm run build` first.");
  process.exit(2);
}
const chromePath = findChrome();
if (!chromePath) {
  console.error("No Chrome or Edge found. Install one or set CHROME_PATH.");
  process.exit(2);
}

const children = [];
const profile = mkdtempSync(join(tmpdir(), "finous-pwa-"));
let ws;

async function cleanup() {
  try {
    ws?.close();
  } catch {
    /* already closed */
  }
  for (const c of children) c.kill();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* Chrome may still hold the profile on Windows; the OS temp cleaner will remove it */
  }
}

try {
  // Serve the production build. Run vite directly (not via npx) so killing it really stops it.
  const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");
  children.push(spawn(process.execPath, [viteBin, "preview", "--port", String(PREVIEW_PORT), "--strictPort"], { cwd: root, stdio: "ignore" }));
  await waitFor(() => fetch(BASE).then((r) => r.ok), "the preview server");

  const chromeArgs = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    ...(process.env.CI ? ["--no-sandbox"] : []),
    "about:blank",
  ];
  children.push(spawn(chromePath, chromeArgs, { stdio: "ignore" }));

  const wsUrl = await waitFor(async () => {
    const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
    return list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  }, "Chrome's debugging port");

  ws = new WebSocket(wsUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    ws.onopen = resolveOpen;
    ws.onerror = rejectOpen;
  });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const id = ++nextId;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result?.result?.value;
  };
  const setOffline = (offline) =>
    send("Network.emulateNetworkConditions", { offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1 });
  const heading = () => evaluate("document.querySelector('h1')?.textContent ?? null");

  await send("Page.enable");
  await send("Network.enable");
  await send("Runtime.enable");

  // 1. First visit: the service worker installs
  await send("Page.navigate", { url: `${BASE}/` });
  const state = await waitFor(
    () => evaluate("navigator.serviceWorker.getRegistration().then(r => r ? (r.active ? 'active' : 'pending') : 'none')").then((s) => s === "active" && s),
    "the service worker to activate",
  ).catch(() => "never activated");
  check("service worker installs and activates on first visit", state === "active", `state: ${state}`);

  // 2. Reload: the page is now controlled by it
  await send("Page.reload");
  await waitFor(() => heading(), "the app to render after reload");
  const controlled = await evaluate("!!navigator.serviceWorker.controller");
  check("service worker controls the page after a reload", controlled === true);

  // 3. Cache holds the shell, and only the shell
  const cache = JSON.parse(
    await evaluate(`(async () => {
      const names = await caches.keys();
      const urls = [];
      for (const n of names) for (const r of await (await caches.open(n)).keys()) urls.push(new URL(r.url).pathname);
      return JSON.stringify({ names, urls });
    })()`),
  );
  check("only the precache exists (no runtime caches)", cache.names.length > 0 && cache.names.every((n) => n.startsWith("workbox-precache")), `caches: ${cache.names.join(", ")}`);
  check("nothing under /api is cached", cache.urls.every((u) => !u.includes("/api")), cache.urls.filter((u) => u.includes("/api")).join(", "));
  check("the shell is precached (index.html, JS, CSS, icons)", ["/index.html", "/icons/icon-192.png"].every((p) => cache.urls.includes(p)) && cache.urls.some((u) => u.endsWith(".js")) && cache.urls.some((u) => u.endsWith(".css")), `cached: ${cache.urls.join(", ")}`);

  // 4. Offline: the shell still loads and says so
  await setOffline(true);
  await send("Page.reload");
  await waitFor(() => heading(), "the shell to load offline");
  check("offline: the app shell loads from the service worker and shows the offline screen", (await heading()) === "You're offline", `heading: ${await heading()}`);
  check("offline: the tab bar is still there", (await evaluate("document.querySelectorAll('nav a').length")) === 4);

  // 5. Back online: recovers without a reload
  await setOffline(false);
  const recovered = await waitFor(async () => (await heading()) !== "You're offline" && (await heading()), "recovery").catch(() => null);
  check("back online: recovers without a reload", Boolean(recovered), `heading: ${await heading()}`);

  // 6. Deep link while offline still resolves to the shell
  await setOffline(true);
  await send("Page.navigate", { url: `${BASE}/plans` });
  await waitFor(() => heading(), "the deep link to load offline");
  check("offline: a deep link (/plans) resolves to the shell", (await evaluate("location.pathname")) === "/plans" && (await heading()) === "You're offline");
  await setOffline(false);

  // 7. Manifest is installable
  const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
  const has = (size, purpose) => manifest.icons?.some((i) => i.sizes === size && (i.purpose ?? "any") === purpose);
  check("manifest: standalone, start_url and scope set", manifest.display === "standalone" && manifest.start_url === "/" && manifest.scope === "/");
  check("manifest: 192 and 512 icons, plus a maskable icon", has("192x192", "any") && has("512x512", "any") && has("512x512", "maskable"));
  const iconStatuses = await Promise.all((manifest.icons ?? []).map((i) => fetch(`${BASE}/${i.src}`).then((r) => r.status)));
  check("manifest: every icon loads", iconStatuses.length > 0 && iconStatuses.every((s) => s === 200), iconStatuses.join(", "));
} catch (err) {
  check("script ran to completion", false, String(err?.stack ?? err));
} finally {
  await cleanup();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
