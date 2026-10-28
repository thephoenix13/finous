import { createLimiter, handleAdvisor } from "../server/advisor.js";

// Vercel provides process.env; this project does not install the Node types, so say what is used.
declare const process: { env: Record<string, string | undefined> };

// One limiter per running instance: a few questions a minute for each caller, and a daily ceiling for everyone.
const limiter = createLimiter(8, 400);

/** POST /api/advisor. The key is ANTHROPIC_API_KEY, set in the Vercel project; ANTHROPIC_MODEL optionally overrides the model. */
export async function POST(request: Request): Promise<Response> {
  return handleAdvisor(request, { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL, limiter });
}
