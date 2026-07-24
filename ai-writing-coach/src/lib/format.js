/**
 * Tiny formatting helpers shared across the app.
 *
 * Kept separate from any feature lib so the History page, Progress
 * dashboard, and Notification bell all render dates the same way.
 */

/**
 * Format an ISO date string or Date as a short, human-friendly relative
 * timestamp: "now", "5m", "2h", "3d", or "Jun 12" once the gap exceeds
 * a week. Used in the history list, recent drafts, and notification feed.
 *
 * @param {string | Date} input
 * @returns {string}
 */
export function fmtRelative(input) {
  const date = input instanceof Date ? input : new Date(input);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
