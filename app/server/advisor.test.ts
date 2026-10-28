import { describe, expect, it, vi } from "vitest";
import { createLimiter, DEFAULT_MODEL, handleAdvisor, MAX_CONTEXT_BYTES, MAX_QUESTION, readAnswer, systemPrompt, type Deps } from "./advisor";

const body = (over: Record<string, unknown> = {}) => ({ question: "Should I prepay my home loan?", lang: "en", context: { saved: 53600 }, ...over });
const post = (b: unknown, headers: Record<string, string> = {}) =>
  new Request("https://finous.test/api/advisor", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(b) });

/** A fake Anthropic that answers with `text`, and remembers what it was sent. */
function fakeClaude(text: string, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init! });
    return new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status });
  }) as unknown as typeof fetch;
  return { fetchFn, calls, sent: () => JSON.parse(String(calls[0].init.body)) as { model: string; system: string; messages: { role: string; content: string }[]; max_tokens: number } };
}
const deps = (over: Partial<Deps> = {}): Deps => ({ apiKey: "sk-test-key", ...over });

describe("handleAdvisor: a good question", () => {
  it("calls Claude with the key, the version and the default model, and returns the answer and its sources", async () => {
    const claude = fakeClaude('{"answer":"You owe ₹62,00,000.","sources":["HDFC Home Loan"]}');
    const res = await handleAdvisor(post(body()), deps({ fetch: claude.fetchFn }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "You owe ₹62,00,000.", sources: ["HDFC Home Loan"] });
    expect(claude.calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    const headers = claude.calls[0].init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-test-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(claude.sent().model).toBe(DEFAULT_MODEL);
  });

  it("uses the model it is given", async () => {
    const claude = fakeClaude("{}");
    await handleAdvisor(post(body()), deps({ fetch: claude.fetchFn, model: "claude-sonnet-5-5" }));
    expect(claude.sent().model).toBe("claude-sonnet-5-5");
  });

  it("puts the user's figures and the rules in the system prompt, and only the question in the user turn", async () => {
    const claude = fakeClaude("{}");
    await handleAdvisor(post(body({ context: { saved: 53600, banks: [{ name: "HDFC Bank", balance: 284000 }] } })), deps({ fetch: claude.fetchFn }));
    const sent = claude.sent();
    expect(sent.system).toContain('"saved":53600');
    expect(sent.system).toContain("HDFC Bank");
    expect(sent.system).toMatch(/never invent/i);
    expect(sent.system).toMatch(/not a SEBI-registered adviser/);
    expect(sent.messages).toEqual([{ role: "user", content: "Should I prepay my home loan?" }]);
    expect(JSON.stringify(sent)).not.toContain("sk-test-key");
  });

  it("asks for Hindi when the app is in Hindi, and English otherwise", () => {
    expect(systemPrompt({ question: "q", lang: "hi", context: {} })).toContain("Answer in Hindi");
    expect(systemPrompt({ question: "q", lang: "en", context: {} })).toContain("Answer in English");
  });

  it("sends earlier turns so a follow-up has something to follow, as alternating user and assistant turns", async () => {
    const claude = fakeClaude("{}");
    await handleAdvisor(
      post(body({ question: "What would you do?", history: [{ from: "user", text: "Should I prepay?" }, { from: "advisor", text: "It depends." }] })),
      deps({ fetch: claude.fetchFn }),
    );
    expect(claude.sent().messages).toEqual([
      { role: "user", content: "Should I prepay?" },
      { role: "assistant", content: "It depends." },
      { role: "user", content: "What would you do?" },
    ]);
  });

  it("repairs a history that would break the alternation: a leading advisor turn, or two user turns in a row", async () => {
    const claude = fakeClaude("{}");
    await handleAdvisor(
      post(body({ question: "Now?", history: [{ from: "advisor", text: "Hello" }, { from: "user", text: "A" }, { from: "user", text: "B" }] })),
      deps({ fetch: claude.fetchFn }),
    );
    const roles = claude.sent().messages.map((m) => m.role);
    expect(roles[0]).toBe("user");
    expect(roles.at(-1)).toBe("user");
    roles.forEach((r, i) => i > 0 && expect(r).not.toBe(roles[i - 1]));
  });

  it("keeps only the last six turns, each cut to a sensible length", async () => {
    const claude = fakeClaude("{}");
    const history = Array.from({ length: 20 }, (_, i) => ({ from: i % 2 === 0 ? "user" : "advisor", text: `turn ${i} ${"x".repeat(5000)}` }));
    await handleAdvisor(post(body({ history })), deps({ fetch: claude.fetchFn }));
    const sent = claude.sent();
    expect(sent.messages.length).toBeLessThanOrEqual(7);
    expect(sent.messages.every((m) => m.content.length <= 1_000 || m.content === "Should I prepay my home loan?")).toBe(true);
  });

  it("returns plain text as the answer when the model ignores the JSON format", async () => {
    const claude = fakeClaude("You owe ₹62,00,000 at 8.9%.");
    const res = await handleAdvisor(post(body()), deps({ fetch: claude.fetchFn }));
    expect(await res.json()).toEqual({ text: "You owe ₹62,00,000 at 8.9%.", sources: [] });
  });
});

describe("readAnswer", () => {
  it("reads JSON wrapped in other words, and drops sources that are not text", () => {
    expect(readAnswer('Here you go: {"answer":" Fine. ","sources":["A",3,"","B"]} thanks')).toEqual({ text: "Fine.", sources: ["A", "B"] });
  });
  it("keeps at most eight sources", () => {
    const sources = Array.from({ length: 12 }, (_, i) => `s${i}`);
    expect(readAnswer(JSON.stringify({ answer: "x", sources })).sources).toHaveLength(8);
  });
  it("rescues the answer from JSON that was cut off, instead of showing the braces", () => {
    expect(readAnswer('{"answer": "You owe \u20b962,00,000 on the loan and hold \\"cash\\" too, so the buffer is').text).toBe('You owe \u20b962,00,000 on the loan and hold "cash" too, so the buffer is');
    expect(readAnswer('{"answer": "Short answer.", "sources": ["HDFC Bank \u2022').text).toBe("Short answer.");
  });
  it("falls back to the raw text when there is no answer to rescue", () => {
    expect(readAnswer('{"answer":"  ","sources":[]}').text).toBe('{"answer":"  ","sources":[]}');
    expect(readAnswer("Just words.").text).toBe("Just words.");
    expect(readAnswer('{"answer": "bad \\q escape').text).toContain("answer");
  });
});

describe("handleAdvisor: what it refuses", () => {
  it("says it is unavailable, without calling anyone, when there is no key", async () => {
    const claude = fakeClaude("{}");
    const res = await handleAdvisor(post(body()), { fetch: claude.fetchFn });
    expect(res.status).toBe(503);
    expect(claude.calls).toHaveLength(0);
  });

  it("accepts only POST", async () => {
    const res = await handleAdvisor(new Request("https://finous.test/api/advisor"), deps());
    expect(res.status).toBe(405);
  });

  it.each([
    ["no question", { question: undefined }, "invalid"],
    ["a blank question", { question: "   " }, "empty"],
    ["a question that is too long", { question: "x".repeat(MAX_QUESTION + 1) }, "too_long"],
    ["an unknown language", { lang: "fr" }, "invalid"],
    ["no figures", { context: undefined }, "invalid"],
    ["figures as a list", { context: [1] }, "invalid"],
    ["too many figures", { context: { blob: "x".repeat(MAX_CONTEXT_BYTES) } }, "too_large"],
  ])("rejects %s with a 400 and does not call Claude", async (_name, over, error) => {
    const claude = fakeClaude("{}");
    const res = await handleAdvisor(post(body(over)), deps({ fetch: claude.fetchFn }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
    expect(claude.calls).toHaveLength(0);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await handleAdvisor(new Request("https://finous.test/api/advisor", { method: "POST", body: "nope" }), deps());
    expect(res.status).toBe(400);
  });

  it("accepts a question of exactly the limit", async () => {
    const claude = fakeClaude("{}");
    const res = await handleAdvisor(post(body({ question: "x".repeat(MAX_QUESTION) })), deps({ fetch: claude.fetchFn }));
    expect(res.status).toBe(200);
  });
});

describe("handleAdvisor: when Claude cannot answer", () => {
  it.each([
    ["an error status", () => fakeClaude("{}", 500).fetchFn],
    ["an empty reply", () => (async () => new Response(JSON.stringify({ content: [] }), { status: 200 })) as unknown as typeof fetch],
    ["a network failure", () => (async () => Promise.reject(new Error("down"))) as unknown as typeof fetch],
    ["a reply that is not JSON", () => (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch],
  ])("answers 502 for %s, never leaks the key, and logs the cause without it", async (_name, make) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleAdvisor(post(body()), deps({ fetch: make() }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("sk-test-key");
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("sk-test-key");
    expect(JSON.stringify(log.mock.calls)).not.toContain("53600");
  });

  it("allows the model room for a full answer", async () => {
    const claude = fakeClaude("{}");
    await handleAdvisor(post(body()), deps({ fetch: claude.fetchFn }));
    expect(claude.sent().max_tokens).toBeGreaterThanOrEqual(1000);
  });
});

describe("rate limiting", () => {
  it("allows a few calls a minute per caller, then says 429, and lets that caller back in a minute later", () => {
    let t = 0;
    const limiter = createLimiter(2, 100, () => t);
    expect([limiter.allow("a"), limiter.allow("a"), limiter.allow("a")]).toEqual([true, true, false]);
    expect(limiter.allow("b")).toBe(true);
    t = 61_000;
    expect(limiter.allow("a")).toBe(true);
  });

  it("stops everyone at the daily ceiling, and starts a new day after 24 hours", () => {
    let t = 0;
    const limiter = createLimiter(100, 3, () => t);
    expect(["a", "b", "c", "d"].map((k) => limiter.allow(k))).toEqual([true, true, true, false]);
    t = 86_400_001;
    expect(limiter.allow("e")).toBe(true);
  });

  it("is applied by the handler before Claude is called, keyed on the caller's address", async () => {
    const claude = fakeClaude("{}");
    const limiter = createLimiter(1, 100);
    const d = deps({ fetch: claude.fetchFn, limiter });
    expect((await handleAdvisor(post(body(), { "x-forwarded-for": "1.2.3.4, 10.0.0.1" }), d)).status).toBe(200);
    expect((await handleAdvisor(post(body(), { "x-forwarded-for": "1.2.3.4" }), d)).status).toBe(429);
    expect((await handleAdvisor(post(body(), { "x-forwarded-for": "5.6.7.8" }), d)).status).toBe(200);
    expect(claude.calls).toHaveLength(2);
  });
});
