/**
 * The Advisor's server side. The browser never holds the Anthropic key: it posts a question and the user's figures here, and
 * this calls Claude with the key from the environment. Kept free of Vercel and Node specifics so it can be tested with a fake
 * `fetch`; api/advisor.ts is the thin entry point.
 */

export type AdvisorRequest = {
  question: string;
  lang: "en" | "hi";
  /** The user's own figures, as the client read them from the Api. */
  context: Record<string, unknown>;
  /** The last few turns, so a follow-up such as "what would you do?" has something to follow. */
  history?: { from: "user" | "advisor"; text: string }[];
};

export type AdvisorAnswer = { text: string; sources: string[] };

export type Limiter = { allow(key: string): boolean };

export type Deps = {
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
  limiter?: Limiter;
};

export const DEFAULT_MODEL = "claude-haiku-5-5";
export const MAX_QUESTION = 500;
export const MAX_CONTEXT_BYTES = 8_000;
const MAX_HISTORY = 6;
const MAX_HISTORY_TEXT = 1_000;
const UPSTREAM_TIMEOUT_MS = 20_000;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** At most `perMinute` calls a minute for each caller and `perDay` in all, per running instance. Best effort: instances come and go. */
export function createLimiter(perMinute: number, perDay: number, now: () => number = Date.now): Limiter {
  const minute = new Map<string, { start: number; count: number }>();
  let day = { start: now(), count: 0 };
  return {
    allow(key) {
      const t = now();
      if (t - day.start >= 86_400_000) day = { start: t, count: 0 };
      if (day.count >= perDay) return false;
      const m = minute.get(key);
      if (!m || t - m.start >= 60_000) minute.set(key, { start: t, count: 1 });
      else if (m.count >= perMinute) return false;
      else m.count += 1;
      day.count += 1;
      return true;
    },
  };
}

function parse(body: unknown): AdvisorRequest | string {
  if (typeof body !== "object" || body === null) return "invalid";
  const b = body as Record<string, unknown>;
  if (typeof b.question !== "string") return "invalid";
  const question = b.question.trim();
  if (!question) return "empty";
  if (question.length > MAX_QUESTION) return "too_long";
  if (b.lang !== "en" && b.lang !== "hi") return "invalid";
  if (typeof b.context !== "object" || b.context === null || Array.isArray(b.context)) return "invalid";
  if (JSON.stringify(b.context).length > MAX_CONTEXT_BYTES) return "too_large";
  const history = Array.isArray(b.history)
    ? b.history
        .filter((h): h is { from: "user" | "advisor"; text: string } => typeof h === "object" && h !== null && ((h as { from?: unknown }).from === "user" || (h as { from?: unknown }).from === "advisor") && typeof (h as { text?: unknown }).text === "string")
        .slice(-MAX_HISTORY)
        .map((h) => ({ from: h.from, text: h.text.slice(0, MAX_HISTORY_TEXT) }))
    : [];
  return { question, lang: b.lang, context: b.context as Record<string, unknown>, history };
}

export function systemPrompt(req: AdvisorRequest): string {
  return [
    "You are the advisor inside Finous, a personal-finance app for people in India. You answer questions about the user's own money.",
    "",
    "Rules:",
    "- Use only the figures in the JSON below. Never invent a figure, an account, a rate or a date. If the data does not answer the question, say so.",
    "- Write rupee amounts with Indian grouping, for example ₹2,84,000.",
    "- Describe what the data shows and the general options and trade-offs. You are not a SEBI-registered adviser: never tell the user to buy, sell or switch a specific product, and never say what you would do. If asked, explain the trade-off instead.",
    "- Stay on the user's own money. For anything else, say what you can answer, in one sentence.",
    "- Be brief: at most 70 words, 3 or 4 short sentences, plain language, no headings or lists. Do not tell the user what to do with their money (no \"you should\" or \"consider\"); set out the facts and the trade-off.",
    req.lang === "hi" ? "- Answer in Hindi (Devanagari). Keep names of accounts and amounts as they appear." : "- Answer in English.",
    '- Reply with JSON only, in this shape: {"answer": string, "sources": string[]}. "sources" names the accounts or figures you used, as they appear in the data, for example "HDFC Bank •4821" or "Cash flow, Sep 2026". Use an empty list if you used none.',
    "",
    "The user's figures:",
    JSON.stringify(req.context),
  ].join("\n");
}

/** Reads the model's reply. It was asked for JSON; if it sent plain text instead, the text is still a usable answer. */
export function readAnswer(raw: string): AdvisorAnswer {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { answer?: unknown; sources?: unknown };
      if (typeof parsed.answer === "string" && parsed.answer.trim()) {
        const sources = Array.isArray(parsed.sources) ? parsed.sources.filter((s): s is string => typeof s === "string" && s.trim() !== "").slice(0, 8) : [];
        return { text: parsed.answer.trim(), sources };
      }
    } catch {
      // Fall through to the plain text.
    }
  }
  const partial = raw.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (partial) {
    try {
      const text = (JSON.parse(`"${partial[1]}"`) as string).trim();
      if (text) return { text, sources: [] };
    } catch {
      // A cut-off escape sequence; fall through to the plain text.
    }
  }
  return { text: raw.trim(), sources: [] };
}

export async function handleAdvisor(request: Request, deps: Deps): Promise<Response> {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!deps.apiKey) return json(503, { error: "unavailable" });

  const caller = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (deps.limiter && !deps.limiter.allow(caller)) return json(429, { error: "rate_limited" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid" });
  }
  const req = parse(body);
  if (typeof req === "string") return json(400, { error: req });

  const send = deps.fetch ?? fetch;
  const messages = [...(req.history ?? []).map((h) => ({ role: h.from === "user" ? "user" : "assistant", content: h.text })), { role: "user", content: req.question }];
  // The API wants the conversation to start with the user and alternate; drop any leading or repeated turns that break that.
  const turns: { role: string; content: string }[] = [];
  for (const m of messages) {
    if (turns.length === 0 ? m.role !== "user" : turns[turns.length - 1].role === m.role) continue;
    turns.push(m);
  }
  if (turns[turns.length - 1]?.role !== "user") turns.push({ role: "user", content: req.question });

  try {
    const upstream = await send("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": deps.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: deps.model || DEFAULT_MODEL, max_tokens: 1000, system: systemPrompt(req), messages: turns }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstream.ok) {
      console.error(`advisor: upstream answered ${upstream.status}`);
      return json(502, { error: "upstream" });
    }
    const data = (await upstream.json()) as { content?: { type?: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text;
    if (!text) {
      console.error("advisor: upstream sent no text");
      return json(502, { error: "upstream" });
    }
    return json(200, readAnswer(text));
  } catch (error) {
    console.error(`advisor: upstream call failed (${error instanceof Error ? error.name : "unknown"})`);
    return json(502, { error: "upstream" });
  }
}
