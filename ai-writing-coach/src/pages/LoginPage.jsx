import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // Where to send the user after a successful sign-in.
  const returnTo = location.state?.from?.pathname ?? "/app/workspace";

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      show("Need both an email and a password to sign you in.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(returnTo, { replace: true });
    } catch (err) {
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