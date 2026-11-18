import { handleManifest } from "../server/bank.js";

// Vercel provides process.env; this project does not install the Node types, so say what is used.
declare const process: { env: Record<string, string | undefined> };

/** GET /api/manifest: the installed app's name and icon for the bank at the address the request came to. Uses the public Supabase settings the app already has. */
export async function GET(request: Request): Promise<Response> {
  return handleManifest(request, {
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
    appDomain: process.env.VITE_APP_DOMAIN,
  });
}
