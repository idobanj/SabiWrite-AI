import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

/**
 * useAuth — exposes the current Supabase session + auth actions.
 *
 * Wraps the Supabase JS client so the rest of the app doesn't import
 * `supabase` directly. This keeps auth concerns in one file and makes
 * the rest of the code easier to mock in tests.
 *
 * What it provides:
 *   - session:      the current Supabase session (or null if signed out)
 *   - profile:      the current user's profiles row (or null)
 *   - loading:      true until the initial session check finishes
 *   - signIn:       email + password login
 *   - signUp:       email + password registration (creates auth.users + profiles row)
 *   - signInWithGoogle: OAuth login
 *   - signOut:      clear session
 *   - refreshProfile: re-fetch the profile row
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the profile row that matches the current user.
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      // If the row doesn't exist yet, that's fine — the trigger should
      // have created it. Log but don't crash.
      // eslint-disable-next-line no-console
      console.warn("[auth] fetchProfile error:", error.message);
      setProfile(null);
      return;
    }
    setProfile(data);
  }, []);

  // On mount, get the current session and start listening for changes.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Check if the URL contains auth callback tokens (#access_token or ?code=)
    const hasAuthCallback =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.search.includes("code="));

    // Listen for sign-in / sign-out events.
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user?.id) {
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Initial session check from localStorage
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) {
        setSession(data.session);
        fetchProfile(data.session.user.id);
        setLoading(false);
      } else if (!hasAuthCallback) {
        // Only mark loading as complete if we are not actively waiting
        // for onAuthStateChange to exchange an OAuth callback from the URL.
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password, remember = true) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    // The Supabase client is created with `persistSession: true`, so the
    // session is stored in localStorage and auto-refreshed in the background
    // — the user stays signed in across browser restarts, tab closes, and
    // page refreshes. The `remember` flag here is reserved for the
    // sessionStorage-only mode (a future enhancement); for now the
    // contract is "stay signed in until you click Sign out".
    if (!remember) {
      // eslint-disable-next-line no-console
      console.warn(
        "[auth] remember=false is not yet supported; session will be persisted."
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app/workspace`,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  // Send a password reset email. The link in that email redirects to
  // /reset-password, where the user lands with a recovery session.
  const resetPassword = useCallback(async (email) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  }, []);

  // Update the password for the currently-authed user (recovery flow).
  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile(session?.user?.id);
  }, [fetchProfile, session?.user?.id]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}