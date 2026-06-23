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
        },
      })
    : null;

/** Edge Function base URL — derived from VITE_SUPABASE_URL when available. */
export const FUNCTIONS_BASE = supabaseUrl ? `${supabaseUrl}/functions/v1` : "";

/**
 * Helper for invoking Supabase Edge Functions with the user's auth token.
 * Use this in every API call from the client.
 */
export async function invokeFunction(functionName, body) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Check your .env file.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${FUNCTIONS_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey ?? "",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Function ${functionName} failed: ${res.status} ${text}`);
  }

  return await res.json();
}
