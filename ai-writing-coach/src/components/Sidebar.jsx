import { NavLink } from "react-router-dom";
import {
  GraduationCap,
  PenTool,
  BarChart3,
  BookOpen,
  History,
  User,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const navEntries = [
  { to: "/app/workspace", label: "Writing Desk", icon: PenTool, badge: "New" },
  { to: "/app/analytics", label: "Progress Stats", icon: BarChart3 },
  { to: "/app/focus", label: "Practice Path", icon: BookOpen },
  { to: "/app/history", label: "Writing History", icon: History },
];

const accountEntries = [{ to: "/app/profile", label: "My Account", icon: User }];

const baseItem =
  "flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group";

/**
 * Vertical navigation rail. Faithful port of the HTML #sidebar.
 * User footer reflects the live Supabase session.
 */
export function Sidebar() {
  const { profile, session } = useAuth();

  // Derive a short, friendly display name from auth + profile metadata.
  const displayName =
    profile?.full_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "You";
  const email = session?.user?.email ?? "";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 border-r border-slate-800 flex-shrink-0 z-20 transition-all duration-300">
      {/* Brand */}
      <NavLink
        to="/"
        className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 hover:bg-slate-800/40 transition-all group"
        title="Return to Landing Page"
      >
        <div className="p-2 bg-brand-500 rounded-xl text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-base tracking-tight leading-tight group-hover:text-brand-100 transition-colors">
            Error Coach
          </h1>
          <span className="text-xs text-slate-500 font-medium">
            AI Writing MVP
          </span>
        </div>
      </NavLink>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Workspace
        </div>
        {navEntries.map((entry) => (
          <SidebarLink key={entry.to} entry={entry} />
        ))}

        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Account & Settings
        </div>
        {accountEntries.map((entry) => (
          <SidebarLink key={entry.to} entry={entry} />
        ))}
      </nav>

      {/* User footer */}
      <NavLink
        to="/app/profile"
        className="p-4 border-t border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 transition-colors block"
        title="Open account"
      >
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50">
          <div className="w-10 h-10 rounded-full border border-slate-700 bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
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
        </div>
      </NavLink>
    </aside>
  );
}

function SidebarLink({ entry }) {
  const Icon = entry.icon;
  return (
    <NavLink
      to={entry.to}
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