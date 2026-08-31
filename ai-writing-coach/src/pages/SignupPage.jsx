import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
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

export function SignupPage() {
  const { session, loading, signUp, signInWithGoogle } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const returnTo = location.state?.from?.pathname ?? "/app/workspace";

  useEffect(() => {
    if (!loading && session) {
      navigate(returnTo, { replace: true });
    }
  }, [session, loading, navigate, returnTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email || !password) {
      show("Fill in all three fields to get started.");
      return;
    }
    if (password.length < 6) {
      show("Password needs at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signUp(email, password, fullName.trim());
      if (result?.session) {
        // Auto-confirm is on, user is signed in immediately.
        navigate(returnTo, { replace: true });
      } else {
        // Email confirmation required.
        show(
          "Account created. Check your inbox for the confirmation link before signing in."
        );
        navigate("/login", { replace: true });
      }
    } catch (err) {
      console.error("[signup] Sign-up failed:", err);
      show(err?.message ?? "Couldn't create your account. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("[signup] Google sign-in failed:", err);
      show(err?.message ?? "Google sign-in didn't go through.");
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Let's set you up.
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Three fields and you're in. No credit card, no email marketing,
            no nonsense.
          </p>
        </div>

        <Card className="p-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              id="fullName"
              label="What should we call you?"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={setFullName}
              placeholder="Your name"
              icon={<User className="w-4 h-4" />}
            />
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
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="6+ characters"
              icon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={submitting || googleSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {submitting ? "Creating account…" : "Create my account"}
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
            Already have one?{" "}
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="text-brand-500 font-semibold hover:underline"
            >
              Sign in
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

function Field({ id, label, type, value, onChange, placeholder, icon, autoComplete }) {
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
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required
          minLength={type === "password" ? 6 : undefined}
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