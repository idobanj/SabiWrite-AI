import { createClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase client. The anon key is safe in the browser — RLS policies
 * on every table ensure users only see their own data.
 *
 * Service role key + Gemini API key are NEVER imported here. Those live in
 * Edge Function env vars and stay on the server.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Soft warning — we still allow the app to render the landing page
  // without env vars set during early development.
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set. " +
      "Auth and data features will be disabled until you add them to .env."
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

/** Edge Function base URL — derived from VITE_SUPABASE_URL when available. */
export const FUNCTIONS_BASE = supabaseUrl ? `${supabaseUrl}/functions/v1` : "";

/**
 * Helper for invoking Supabase Edge Functions with the user's auth token.
 * Uses supabase.functions.invoke() which automatically refreshes the JWT
 * before every call — prevents "Invalid or expired token" errors.
 */
export async function invokeFunction(functionName, body) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Check your .env file.");
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    // Preserve the original error text so callers see the detail field
    const message = error.message ?? String(error);
    throw new Error(`Function ${functionName} failed: ${message}`);
  }

  return data;
}
