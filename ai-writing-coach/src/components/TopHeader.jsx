import { useLocation, Link, useNavigate } from "react-router-dom";
import { Menu, Settings, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "./Button";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";

const titleMap = {
  "/app/workspace": {
    title: "Writing Desk",
    subtitle: "Paste a sentence, get it back corrected.",
  },
  "/app/analytics": {
    title: "Progress",
    subtitle: "Your mistake patterns over time.",
  },
  "/app/focus": {
    title: "Practice",
    subtitle: "Short drills built from your recurring slips.",
  },
  "/app/history": {
    title: "History",
    subtitle: "Everything you've submitted, in one place.",
  },
  "/app/profile": {
    title: "Account",
    subtitle: "Your name, goal, and sign-in.",
  },
};

/** Top header. Faithful port of HTML #topHeader with theme toggle + auth user. */
export function TopHeader() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const { profile, session, signOut } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const config = titleMap[pathname] ?? { title: "Dashboard", subtitle: "" };

  const displayName =
    profile?.full_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "You";
  const initials = displayName.slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    try {
      await signOut();
      show("Signed out. See you soon!");
      navigate("/", { replace: true });
    } catch (err) {
      show(err?.message ?? "Sign-out failed.");
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 select-none">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2 rounded-xl"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <div className="flex flex-col">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {config.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {config.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggle}
          aria-label="Toggle theme"
          className="px-2"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        <Link to="/app/profile">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Settings className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          aria-label="Sign out"
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
          className="hidden md:inline-flex"
        >
          <span className="hidden lg:inline">Sign out</span>
        </Button>

        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700" />

        <Link to="/app/profile" className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[10rem]">
              {displayName}
            </span>
            <span className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider">
              My account
            </span>
          </div>
          <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}