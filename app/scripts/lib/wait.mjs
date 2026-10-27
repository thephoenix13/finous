/**
 * Waiting helpers for scripts/pwa-check.mjs, kept apart so they can be tested.
 *
 * The smoke test starts a preview server and Chrome and polls until each is ready. Two things made that fragile on a
 * busy CI runner: Chrome was given a flat 15 seconds, and if it died on start-up nothing said so, the script just
 * waited out the clock and reported "timed out". These helpers give Chrome longer and fail at once, with Chrome's own
 * last words, when it has already gone.
 */

/** How long Chrome gets to open its debugging port. A cold start on a shared runner can take well over 15 seconds. */
export const CHROME_START_TIMEOUT_MS = 30_000;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls `fn` until it returns something truthy, and returns that. A throw counts as "not ready yet".
 *
 * @template T
 * @param {() => T | Promise<T>} fn
 * @param {string} what  What is being waited for, named in the error.
 * @param {{ timeoutMs?: number, intervalMs?: number, failFast?: () => string | undefined }} [options]
 *   `failFast` is asked before every attempt. If it returns text, the wait ends at once with that text as the reason,
 *   instead of running out the clock for something that can no longer happen.
 */
export async function waitFor(fn, what, { timeoutMs = 15_000, intervalMs = 250, failFast } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const reason = failFast?.();
    if (reason) throw new Error(`${what}: ${reason}`);
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      /* not ready yet */
    }
    if (Date.now() >= deadline) throw new Error(`timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${what}`);
    await sleep(intervalMs);
  }
}

/**
 * A sentence for a process that is no longer running, with the last of what it printed to stderr.
 *
 * @param {string} name
 * @param {{ code: number | null, signal: string | null, stderr: string }} exit
 */
export function describeExit(name, { code, signal, stderr }) {
  const how = signal ? `was stopped by ${signal}` : `exited with code ${code}`;
  const lines = stderr.trim().split(/\r?\n/).filter(Boolean).slice(-5);
  const output = lines.length ? `Last output:\n          ${lines.join("\n          ")}` : "It printed nothing.";
  return `${name} ${how} before it was ready. ${output}`;
}

/**
 * Watches a child process so a wait can stop the moment it dies. Reads stderr (keeping the last 4 KB), which also
 * stops a chatty process from filling the pipe and stalling; spawn it with `stdio: ["ignore", "ignore", "pipe"]`.
 *
 * @param {import("node:child_process").ChildProcess} child
 * @param {string} name  How to refer to it in messages, for example "Chrome".
 * @returns {{ failFast: () => string | undefined }}  Pass as `waitFor`'s `failFast`.
 */
export function watchProcess(child, name) {
  let stderr = "";
  let ended;
  child.stderr?.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-4000);
  });
  // "error" is a process that could not even start (a wrong path). "close" comes after stderr has been read in full.
  child.on("error", (error) => {
    ended ??= `${name} could not be started: ${error.message}`;
  });
  child.on("close", (code, signal) => {
    ended ??= describeExit(name, { code, signal, stderr });
  });
  return { failFast: () => ended };
}
