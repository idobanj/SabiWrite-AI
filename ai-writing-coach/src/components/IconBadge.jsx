import { cn } from "../lib/cn";

const toneClasses = {
  brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/10",
  emerald: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10",
  red: "bg-red-50 text-red-500 dark:bg-red-500/10",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
  indigo: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10",
  warning: "bg-amber-50 text-warning dark:bg-amber-500/10",
};

const sizeClasses = {
  sm: "w-9 h-9 [&_svg]:w-4 [&_svg]:h-4",
  md: "w-12 h-12 [&_svg]:w-6 [&_svg]:h-6",
  lg: "w-14 h-14 [&_svg]:w-7 [&_svg]:h-7",
};

/** Square rounded-2xl container for a Lucide icon. */
export function IconBadge({ children, tone = "brand", size = "md", className }) {
  return (
    <div
      className={cn(
        "rounded-2xl flex items-center justify-center flex-shrink-0",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </div>
  );
}
