import { cn } from "../lib/cn";

/**
 * Animated block placeholder. Use it for any content that's still loading.
 * Width defaults to full; pass `w` to size it. Pass `h` to set the height
 * (defaults to a paragraph-line height). Multiple stacked Skeletons with
 * different widths make convincing text-row placeholders.
 *
 * @param {{ className?: string, w?: string, h?: string }} props
 */
export function Skeleton({ className, w, h }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse",
        w ?? "w-full",
        h ?? "h-3",
        className
      )}
    />
  );
}

/**
 * A single fake table row with N columns. Use inside the <tbody> while
 * a table page is loading.
 *
 * @param {{ columns?: number, compact?: boolean }} props
 */
export function TableRowSkeleton({ columns = 5, compact = false }) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className={compact ? "p-3" : "p-4"}>
          <Skeleton
            w={
              i === 0
                ? "w-32"
                : i === 1
                ? "w-48 sm:w-64"
                : i === 2
                ? "w-20"
                : i === 3
                ? "w-14"
                : "w-20"
            }
            h="h-3"
          />
        </td>
      ))}
    </tr>
  );
}

/**
 * A full skeleton body for a table — 6 rows by default.
 *
 * @param {{ rows?: number, columns?: number, compact?: boolean }} props
 */
export function TableBodySkeleton({ rows = 6, columns = 5, compact = false }) {
  return (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton
          key={i}
          columns={columns}
          compact={compact}
        />
      ))}
    </tbody>
  );
}

/**
 * A single metric-card-shaped skeleton. Matches the size of the dashboard's
 * <MetricCard> so the layout doesn't shift when real data lands.
 */
export function MetricCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm p-4 sm:p-5 lg:p-6 flex items-center justify-between gap-4">
      <div className="space-y-2.5 flex-1 min-w-0">
        <Skeleton w="w-24" h="h-2.5" />
        <Skeleton w="w-16" h="h-7" />
      </div>
      <Skeleton w="w-12" h="h-12" className="rounded-2xl" />
    </div>
  );
}

/**
 * A bar-shaped skeleton for things like the top-mistake bars on the
 * dashboard. Each entry is a label row + a filled bar row.
 */
export function BarRowSkeleton() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton w="w-40" h="h-3" />
        <Skeleton w="w-20" h="h-3" />
      </div>
      <Skeleton w="w-full" h="h-2.5" className="rounded-full" />
    </div>
  );
}
