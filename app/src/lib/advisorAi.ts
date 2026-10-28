import { buildContext, type AdvisorData, type Reply } from "./advisor";

export type Turn = { from: "user" | "advisor"; text: string };

const TIMEOUT_MS = 25_000;

/**
 * Asks the AI advisor (POST /api/advisor, which holds the key). Rejects on anything but a good answer, so the caller can fall
 * back to the rules in advisor.ts: no key, a rate limit, a timeout, a bad reply.
 */
export async function askAi(
  input: { question: string; lang: "en" | "hi"; data: AdvisorData; history: Turn[] },
  fetchFn: typeof fetch = fetch,
): Promise<Pick<Reply, "text" | "sources">> {
  const res = await fetchFn("/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: input.question, lang: input.lang, context: buildContext(input.data, input.lang), history: input.history }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`advisor ${res.status}`);
  const body = (await res.json()) as { text?: unknown; sources?: unknown };
  if (typeof body.text !== "string" || !body.text.trim()) throw new Error("advisor: empty answer");
  return { text: body.text, sources: Array.isArray(body.sources) ? body.sources.filter((s): s is string => typeof s === "string") : [] };
}
