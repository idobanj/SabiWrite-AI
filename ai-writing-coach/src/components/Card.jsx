import { cn } from "../lib/cn";

export function Card({ className, children, interactive, padded = true, ...rest }) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm",
        padded && "p-6",
        interactive &&
          "hover:border-brand-500 hover:shadow-md transition-all duration-300 cursor-pointer",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
