import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";

// Routes that should be full-bleed (no sidebar, no top header).
const FULL_BLEED_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

/**
 * Two-pane shell: sidebar on the left, main content on the right.
 * Sidebar and top header are hidden on landing + auth pages.
 * On mobile the sidebar is a slide-in drawer controlled by the
 * TopHeader hamburger button.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const isFullBleed = FULL_BLEED_PATHS.has(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  // Reset scroll on every route change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  if (isFullBleed) {
    return (
      <div className="flex h-full overflow-hidden">
        <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar mobileOpen={mobileNavOpen} onNavigate={closeMobileNav} />
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
        <TopHeader onOpenMenu={() => setMobileNavOpen(true)} />
        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}