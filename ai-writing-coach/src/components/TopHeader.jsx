import { useLocation } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "./Button";
import { useTheme } from "../hooks/useTheme";

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

/**
 * Top header. Page title on the left, theme toggle on the right.
 * Auth/identity controls live in the sidebar, not here.
 */
export function TopHeader({ onOpenMenu }) {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  const config = titleMap[pathname] ?? { title: "Dashboard", subtitle: "" };

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2 rounded-xl"
          aria-label="Open menu"
          onClick={onOpenMenu}
        >
          <Menu className="w-6 h-6" />
        </Button>
        <div className="flex flex-col min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {config.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {config.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
}