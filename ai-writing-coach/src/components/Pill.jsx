import { Info } from "lucide-react";
import { cn } from "../lib/cn";

const colorClasses = {
  brand:
    "bg-brand-50 text-brand-500 border border-brand-100 dark:bg-brand-500/10 dark:border-brand-500/30",
  emerald:
    "bg-emerald-50 text-emerald-500 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30",
  amber:
    "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30",
  red: "bg-red-50 text-error border border-red-100 dark:bg-red-500/10 dark:border-red-500/30",
  indigo:
    "bg-indigo-50 text-indigo-500 border border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30",
  slate:
    "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

export function Pill({ children, color = "slate", className, icon }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
        colorClasses[color],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
