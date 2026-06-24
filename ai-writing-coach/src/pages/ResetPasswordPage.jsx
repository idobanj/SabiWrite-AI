import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";

/**
 * Land here from the password-reset email link. Supabase attaches a
 * recovery session via the URL hash. The auth client's onAuthStateChange
 * fires PASSWORD_RECOVERY asynchronously after mount, so we listen for
 * that event directly instead of polling useAuth's session.
 *
 * Three terminal states:
 *   - "recovered": a recovery session is present → show the form
 *   - "expired":   no session after ~6s → show the "send a new link" page
 *   - "done":      user submitted a new password → show success
 */
export function ResetPasswordPage() {
  const { updatePassword, signOut } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading"); // loading | recovered | expired | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Subscribe to PASSWORD_RECOVERY directly. useAuth's loading flag flips
  // off too early to be reliable here, so we don't depend on it.
  useEffect(() => {
    if (!supabase) {
      setPhase("expired");
      return;
    }

    let cancelled = false;

    // Belt-and-braces: if a session is already in storage by the time we
    // mount (e.g. user landed on the page after Supabase processed the
    // hash), accept it immediately.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data?.session) setPhase("recovered");
    });

    // Listen for the recovery event itself.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setPhase("recovered");
      }
    });

    // Hard timeout: if neither path produces a session in 6s, give up.
    const timer = setTimeout(() => {
      if (!cancelled) setPhase((p) => (p === "loading" ? "expired" : p));
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      show("New password needs at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      show("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      await signOut();
      setPhase("done");
    } catch (err) {
      show(err?.message ?? "Could not update the password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return (
      <CenteredShell>
        <Card className="p-7 text-center space-y-4">
          <div className="w-10 h-10 mx-auto border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Confirming your reset link…
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Hang tight, this usually takes a second.
          </p>
        </Card>
      </CenteredShell>
    );
  }

  if (phase === "expired") {
    return (
      <CenteredShell>
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            That reset link has expired.
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reset links only work once and they time out after an hour.
            Request a new one to try again.
          </p>
          <div className="pt-2">
            <Link to="/forgot-password">
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Send me a new link
              </Button>
            </Link>
          </div>
          <p className="pt-3">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              ← Back to sign in
            </Link>
          </p>
        </div>
      </CenteredShell>
    );
  }

  if (phase === "done") {
    return (
      <CenteredShell>
        <Card className="p-7 text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Password updated.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in with your new password to get back in.
            </p>
          </div>
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to sign in
          </Button>
        </Card>
      </CenteredShell>
    );
  }

  // phase === "recovered"
  return (
    <CenteredShell>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Set a new password.
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pick something you'll remember this time.
          </p>
        </div>

        <Card className="p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              id="password"
              label="New password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
            />
            <Field
              id="confirm"
              label="Type it again"
              value={confirm}
              onChange={setConfirm}
              placeholder="Same password"
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={submitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {submitting ? "Saving…" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </CenteredShell>
  );
}

function CenteredShell({ children }) {
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16 bg-slate-50 dark:bg-slate-950">
      {children}
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Lock className="w-4 h-4" />
        </span>
        <input
          id={id}
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition"
        />
      </div>
    </div>
  );
}
