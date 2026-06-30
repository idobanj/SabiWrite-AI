import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  PenTool,
  BarChart3,
  BookOpen,
  History,
  User,
  X,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";

const navEntries = [
  { to: "/app/workspace", label: "Writing Desk", icon: PenTool, badge: "New" },
  { to: "/app/analytics", label: "Progress", icon: BarChart3 },
  { to: "/app/focus", label: "Practice", icon: BookOpen },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/profile", label: "Settings", icon: Settings },
];

const baseItem =
  "flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group";

/**
 * Navigation rail. On desktop (md+) it lives in the layout's left column.
 * On mobile it slides in as a drawer, controlled by the `mobileOpen` prop.
 *
 * Owns the user footer (avatar, settings, sign out) so the top header
 * stays focused on the page title and theme toggle.
 */
export function Sidebar({ mobileOpen = false, onNavigate }) {
  const { profile, session, signOut } = useAuth();
  const { show } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "You";
  const email = session?.user?.email ?? "";
  const initials = displayName.slice(0, 1).toUpperCase();

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onNavigate?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onNavigate]);

  // Close automatically when the route changes (e.g. user tapped a link).
  useEffect(() => {
    if (mobileOpen) onNavigate?.();
    // We intentionally only depend on pathname so the closure doesn't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (err) {
      show(err?.message ?? "Sign-out failed.");
    }
  };

  const inner = (
    <>
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-6 py-5 hover:bg-slate-800/40 transition-all group flex-1"
          title="Return to Landing Page"
          onClick={onNavigate}
        >
          <div className="p-2 bg-brand-500 rounded-xl text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-tight group-hover:text-brand-100 transition-colors">
              SabiWrite AI
            </h1>
            <span className="text-xs text-slate-500 font-medium">
              AI Writing Coach
            </span>
          </div>
        </NavLink>
        {/* Mobile-only close button */}
        <button
          type="button"
          onClick={onNavigate}
          className="md:hidden mr-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Workspace
        </div>
        {navEntries.map((entry) => (
          <SidebarLink key={entry.to} entry={entry} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* User footer: avatar + name, settings icon, sign out */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50">
          <NavLink
            to="/app/profile"
            onClick={onNavigate}
            className="flex items-center gap-3 flex-1 min-w-0"
            title="Open account"
          >
            <div className="w-10 h-10 rounded-full border border-slate-700 bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {email || "Signed in"}
              </p>
            </div>
          </NavLink>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={`${baseItem} text-slate-300 hover:bg-slate-800 hover:text-white justify-start`}
          title="Sign out"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: in-flow aside, always visible at md+ */}
      <aside className="hidden md:flex w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 border-r border-slate-800 flex-shrink-0 z-20 flex-col">
        {inner}
      </aside>

      {/* Mobile: fixed drawer, slides in from the left */}
      {/* Backdrop */}
      <div
        onClick={onNavigate}
        className={`md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 text-slate-300 z-50 flex flex-col shadow-2xl transition-transform duration-200 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {inner}
      </aside>
    </>
  );
}

function SidebarLink({ entry, onNavigate }) {
  const Icon = entry.icon;
  return (
    <NavLink
      to={entry.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${baseItem} ${
          isActive
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`
      }
    >
      <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
      <span>{entry.label}</span>
      {entry.badge ? (
        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-brand-500 text-white rounded-full">
          {entry.badge}
        </span>
      ) : null}
    </NavLink>
  );
}