import { forwardRef } from "react";
import { cn } from "../lib/cn";

const variantClasses = {
  primary:
    "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30",
  secondary:
    "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-600 dark:hover:bg-slate-800 dark:text-slate-300",
  danger: "bg-error hover:bg-red-600 text-white shadow-md shadow-red-500/20",
  outline:
    "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-200",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-xs",
  lg: "px-6 py-3.5 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50";

export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth,
    leftIcon,
    rightIcon,
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        base,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});
