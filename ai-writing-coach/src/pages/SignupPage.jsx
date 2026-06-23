import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";

export function SignupPage() {
  const { signUp } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const returnTo = location.state?.from?.pathname ?? "/app/workspace";

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
      show(err?.message ?? "Couldn't create your account. Try again in a moment.");
    } finally {
      setSubmitting(false);
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
              disabled={submitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {submitting ? "Creating account…" : "Create my account"}
            </Button>
          </form>

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