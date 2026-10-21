import { supabase } from "./supabase";

function signInRequired() {
  const error = new Error("Your session has ended. Please sign in again.");
  error.code = "AUTH_SESSION_REQUIRED";
  return error;
}

function sessionFailure(error) {
  return error && ![400, 401, 403].includes(error.status)
    ? new Error("Couldn't verify your sign-in. Check your connection and try again.")
    : signInRequired();
}

/** Verify the current token and keep a stale UI account from owning a save. */
export async function requireSession(expectedUserId) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const initial = await supabase.auth.getSession();
  let session = initial.data?.session;
  if (initial.error || !session?.access_token || !session?.user?.id) {
    throw sessionFailure(initial.error);
  }

  let verified = await supabase.auth.getUser(session.access_token);
  if (verified.error || !verified.data?.user) {
    // Refresh once for a rejected token. A temporary Auth outage should not
    // be presented as a sign-out or discard an otherwise valid session.
    if (verified.error && ![401, 403].includes(verified.error.status)) {
      throw sessionFailure(verified.error);
    }
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data?.session;
    if (refreshed.error || !session?.access_token || !session?.user?.id) {
      throw sessionFailure(refreshed.error);
    }
    verified = await supabase.auth.getUser(session.access_token);
    if (verified.error || !verified.data?.user) throw sessionFailure(verified.error);
  }

  if (expectedUserId && verified.data.user.id !== expectedUserId) {
    const error = new Error("Your signed-in account changed. Reload this page before checking your draft.");
    error.code = "AUTH_ACCOUNT_CHANGED";
    throw error;
  }

  return { ...session, user: verified.data.user };
}
