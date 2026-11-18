import { handleIcon } from "../server/bank.js";

// Vercel provides process.env; this project does not install the Node types, so say what is used.
declare const process: { env: Record<string, string | undefined> };

/** GET /api/bank-icon: the bank's logo, or its first letter on its colour, for the bank at the address the request came to. */
export async function GET(request: Request): Promise<Response> {
  return handleIcon(request, {
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
    appDomain: process.env.VITE_APP_DOMAIN,
  });
}
