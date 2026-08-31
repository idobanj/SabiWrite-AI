import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";

/**
 * Multicolored "G" mark from Google's official brand guidelines.
 * Inline SVG (rather than a third-party icon lib) so we don't pull in a
 * brand-asset dependency just for one button. Sized to match the other
 * Button leftIcons (w-4 h-4).
 */
function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.44 1.18 4.93l3.66-2.83z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage() {
  const { session, loading, signIn, signInWithGoogle } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Default true: the user explicitly opted in to "stay signed in" the
  // first time they logged in. They can untick it on a shared device.
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // Where to send the user after a successful sign-in.
  const returnTo = location.state?.from?.pathname ?? "/app/workspace";

  useEffect(() => {
    if (!loading && session) {
      navigate(returnTo, { replace: true });
    }
  }, [session, loading, navigate, returnTo]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      show("Need both an email and a password to sign you in.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password, remember);
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("[login] Sign-in failed:", err);
      show(err?.message ?? "Couldn't sign you in. Double-check the credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("[login] Google sign-in failed:", err);
      show(err?.message ?? "Google sign-in didn't go through.");
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pick up where you left off — your mistake history is right where
            you left it.
          </p>
        </div>

        <Card className="p-7 space-y-5">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              icon={<Lock className="w-4 h-4" />}
              footer={
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-slate-400 hover:text-brand-500 transition-colors"
                >
                  Forgot it?
                </Link>
              }
            />

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-500 focus:ring-2 focus:ring-brand-500/40 cursor-pointer accent-brand-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Keep me signed in on this device
              </span>
            </label>

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={submitting || googleSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            or
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <Button
            type="button"
            variant="outline"
            fullWidth
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={submitting || googleSubmitting}
            leftIcon={<GoogleIcon />}
          >
            {googleSubmitting ? "Taking you to Google…" : "Continue with Google"}
          </Button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-1">
            New here?{" "}
            <Link
              to="/signup"
              state={{ from: location.state?.from }}
              className="text-brand-500 font-semibold hover:underline"
            >
              Make an account
            </Link>
          </p>
        </Card>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            ← Back to landing
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, type, value, onChange, placeholder, icon, autoComplete, footer }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
        {footer}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition"
        />
      </div>
    </div>
  );
}