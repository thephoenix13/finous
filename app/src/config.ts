/** The wording people agree to when they join the beta. Change the version when the wording changes, so everyone is asked again. */
export const BETA_CONSENT_VERSION = "2026-11-beta-1";
export const PRIVACY_NOTICE_VERSION = "2026-11-1";

/** Where the Privacy Notice lives. Set VITE_PRIVACY_NOTICE_URL in Vercel; without it the consent screen shows no link. */
export const PRIVACY_NOTICE_URL: string | undefined = import.meta.env.VITE_PRIVACY_NOTICE_URL || undefined;

export const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL || undefined;
/** The publishable (anon) key. It is meant to be public: the database rules, not secrecy, protect the data. */
export const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY || undefined;
