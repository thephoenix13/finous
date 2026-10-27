import { spawn } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { CHROME_START_TIMEOUT_MS, describeExit, sleep, waitFor, watchProcess } from "./wait.mjs";

/** Starts a Node process running `source`, watched the way pwa-check.mjs watches Chrome. */
function run(source) {
  const child = spawn(process.execPath, ["-e", source], { stdio: ["ignore", "ignore", "pipe"] });
  return { child, ...watchProcess(child, "Chrome") };
}
/** Waits until `failFast` has something to say, or fails the test. */
async function reasonAfterExit(failFast) {
  return waitFor(() => failFast(), "the process to end", { timeoutMs: 10_000, intervalMs: 10 });
}

describe("CHROME_START_TIMEOUT_MS", () => {
  it("gives Chrome 30 seconds, double what it had", () => {
    expect(CHROME_START_TIMEOUT_MS).toBe(30_000);
  });
});

describe("waitFor", () => {
  it("returns the first truthy value", async () => {
    await expect(waitFor(() => "ready", "x")).resolves.toBe("ready");
  });

  it("keeps trying while the answer is falsy, then returns it", async () => {
    let calls = 0;
    const value = await waitFor(() => (++calls < 4 ? undefined : "up"), "x", { intervalMs: 1 });
    expect(value).toBe("up");
    expect(calls).toBe(4);
  });

  it("treats a throw as not ready yet, and keeps going", async () => {
    let calls = 0;
    const value = await waitFor(
      () => {
        if (++calls < 3) throw new Error("connection refused");
        return { port: 9333 };
      },
      "x",
      { intervalMs: 1 },
    );
    expect(value).toEqual({ port: 9333 });
  });

  it("waits for an async check", async () => {
    let calls = 0;
    await expect(waitFor(async () => ++calls > 2, "x", { intervalMs: 1 })).resolves.toBe(true);
  });

  it("stops calling once it has an answer", async () => {
    const fn = vi.fn(() => "done");
    await waitFor(fn, "x");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("times out, naming what it waited for and for how long", async () => {
    await expect(waitFor(() => false, "Chrome's debugging port", { timeoutMs: 1_000, intervalMs: 100 })).rejects.toThrow(
      "timed out after 1s waiting for Chrome's debugging port",
    );
  });

  it("waits out the whole timeout, not a fixed number of tries", async () => {
    const start = Date.now();
    await expect(waitFor(() => false, "x", { timeoutMs: 300, intervalMs: 20 })).rejects.toThrow("timed out");
    expect(Date.now() - start).toBeGreaterThanOrEqual(290);
  });

  it("tries at least once even with no time to spare", async () => {
    const fn = vi.fn(() => "ok");
    await expect(waitFor(fn, "x", { timeoutMs: 0 })).resolves.toBe("ok");
  });

  it("gives up at once, with the reason, when failFast says the thing can no longer happen", async () => {
    let calls = 0;
    const start = Date.now();
    await expect(
      waitFor(() => false, "Chrome's debugging port", { timeoutMs: 30_000, intervalMs: 5, failFast: () => (++calls > 3 ? "Chrome exited with code 1 before it was ready." : undefined) }),
    ).rejects.toThrow("Chrome's debugging port: Chrome exited with code 1 before it was ready.");
    expect(Date.now() - start).toBeLessThan(2_000); // not the 30 seconds
  });

  it("asks failFast before the first attempt, so a process that is already dead is not polled", async () => {
    const fn = vi.fn(() => "ok");
    await expect(waitFor(fn, "x", { failFast: () => "already gone" })).rejects.toThrow("x: already gone");
    expect(fn).not.toHaveBeenCalled();
  });

  it("does not fail fast while failFast has nothing to say", async () => {
    await expect(waitFor(() => "ok", "x", { failFast: () => undefined })).resolves.toBe("ok");
  });
});

describe("describeExit", () => {
  it("says the exit code, and quotes the last five lines of what the process printed", () => {
    const stderr = ["one", "two", "three", "four", "five", "six", "seven"].join("\n");
    const message = describeExit("Chrome", { code: 1, signal: null, stderr });
    expect(message).toContain("Chrome exited with code 1 before it was ready.");
    expect(message).toContain("three");
    expect(message).toContain("seven");
    expect(message).not.toContain("two");
  });

  it("says the signal when the process was stopped by one", () => {
    expect(describeExit("Chrome", { code: null, signal: "SIGKILL", stderr: "" })).toContain("Chrome was stopped by SIGKILL before it was ready.");
  });

  it("says so when the process printed nothing", () => {
    expect(describeExit("Chrome", { code: 9, signal: null, stderr: "  \n" })).toContain("It printed nothing.");
  });

  it("copes with Windows line endings and blank lines", () => {
    const message = describeExit("Chrome", { code: 1, signal: null, stderr: "first\r\n\r\nsecond\r\n" });
    expect(message).toContain("first");
    expect(message).toContain("second");
    expect(message).not.toContain("\r");
  });

  it("names the process it is talking about", () => {
    expect(describeExit("the preview server", { code: 1, signal: null, stderr: "" })).toMatch(/^the preview server exited/);
  });
});

describe("watchProcess, with real processes", () => {
  it("has nothing to say while the process is running", async () => {
    const { child, failFast } = run("setTimeout(() => {}, 5000)");
    try {
      await sleep(100);
      expect(failFast()).toBeUndefined();
    } finally {
      child.kill();
    }
  });

  it("reports a process that exits at once: its exit code and what it printed", async () => {
    const { failFast } = run("console.error('FATAL: no display'); process.exit(3)");
    const reason = await reasonAfterExit(failFast);
    expect(reason).toContain("Chrome exited with code 3 before it was ready.");
    expect(reason).toContain("FATAL: no display");
  });

  it("reports a process that exits without a word", async () => {
    const { failFast } = run("process.exit(7)");
    const reason = await reasonAfterExit(failFast);
    expect(reason).toContain("exited with code 7");
    expect(reason).toContain("It printed nothing.");
  });

  it("keeps only the last of a very chatty process, so the report stays short", async () => {
    const { failFast } = run("for (let i = 0; i < 2000; i++) console.error('line ' + i); process.exit(1)");
    const reason = await reasonAfterExit(failFast);
    expect(reason).toContain("line 1999");
    expect(reason).not.toContain("line 5\n");
    expect(reason.length).toBeLessThan(500);
  });

  it("reports a program that cannot be started at all, with the reason", async () => {
    const child = spawn("definitely-not-a-real-chrome-binary", [], { stdio: ["ignore", "ignore", "pipe"] });
    const { failFast } = watchProcess(child, "Chrome");
    const reason = await reasonAfterExit(failFast);
    expect(reason).toContain("Chrome could not be started");
    expect(reason).toMatch(/ENOENT/);
  });

  it("keeps the first reason: a later event does not overwrite it", async () => {
    const { failFast } = run("console.error('first reason'); process.exit(4)");
    const first = await reasonAfterExit(failFast);
    await sleep(50);
    expect(failFast()).toBe(first);
  });

  it("ends a waitFor straight away when Chrome has already died, instead of waiting out the timeout", async () => {
    const { failFast } = run("console.error('Missing X server'); process.exit(1)");
    const start = Date.now();
    await expect(waitFor(() => false, "Chrome's debugging port", { timeoutMs: 30_000, intervalMs: 10, failFast })).rejects.toThrow(/Chrome's debugging port: Chrome exited with code 1 .*Missing X server/s);
    expect(Date.now() - start).toBeLessThan(5_000);
  });
});
