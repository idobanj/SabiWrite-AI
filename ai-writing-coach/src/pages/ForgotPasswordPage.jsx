import { Link } from "react-router-dom";
import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";

/**
 * Request a password reset email. Supabase sends a link that redirects
 * to /reset-password, where the user lands with a recovery session.
 */
export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { show } = useToast();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      show("Enter the email you signed up with.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email);
      // Always show the same confirmation regardless of whether the email
      // exists — don't leak which accounts are registered.
      setSentTo(email);
    } catch (err) {
      show(err?.message ?? "Could not send the reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Reset your password.
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            We'll email you a link to set a new one.
          </p>
        </div>

        <Card className="p-7 space-y-5">
          {sentTo ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Check your inbox.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  If <span className="font-medium text-slate-700 dark:text-slate-200">{sentTo}</span>{" "}
                  has an account, a reset link is on its way. The link expires
                  in an hour.
                </p>
              </div>
              <Link to="/login">
                <Button variant="secondary" fullWidth size="lg">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition"
                  />
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={submitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {submitting ? "Sending…" : "Send reset link"}
              </Button>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-1">
                Remembered it?{" "}
                <Link
                  to="/login"
                  className="text-brand-500 font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
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