import { Flame, Repeat, Trophy } from "lucide-react";
import { IconBadge } from "./IconBadge";
import { fmtRelative } from "../lib/format";

/**
 * Map a notification kind to the small icon + tinted background we render
 * in the row. Lives here so the dropdown and any future surfaces stay in
 * sync.
 */
const KIND_VISUALS = {
  repeat_milestone: {
    icon: Repeat,
    tone: "indigo",
    label: "Recurring slip",
  },
  streak_at_risk: {
    icon: Flame,
    tone: "amber",
    label: "Streak at risk",
  },
  quiz_followup: {
    icon: Trophy,
    tone: "emerald",
    label: "Practice",
  },
};

/**
 * A single row in the notification dropdown.
 *
 * Pure presentational — reads `notification` and fires `onClick` /
 * `onMarkRead` from the parent (NotificationBell) so the data layer
 * (RLS-guarded updates + navigation) lives in one place.
 *
 * @param {{
 *   notification: {
 *     id: string,
 *     kind: "repeat_milestone" | "streak_at_risk" | "quiz_followup",
 *     title: string,
 *     body: string,
 *     link: string | null,
 *     metadata: Record<string, unknown>,
 *     read_at: string | null,
 *     created_at: string,
 *   },
 *   onClick?: (notification: object) => void,
 *   onMarkRead?: (id: string) => void,
 * }} props
 */
export function NotificationItem({ notification, onClick, onMarkRead }) {
  const visual = KIND_VISUALS[notification.kind] ?? KIND_VISUALS.repeat_milestone;
  const Icon = visual.icon;
  const unread = !notification.read_at;

  const handleClick = () => {
    if (unread && onMarkRead) onMarkRead(notification.id);
    if (onClick) onClick(notification);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
        unread ? "bg-brand-50/30 dark:bg-brand-500/5" : ""
      }`}
    >
      {/* Unread dot — small, sits to the left of the icon */}
      <div className="pt-1 w-1.5 flex-shrink-0">
        {unread ? (
          <span
            aria-label="Unread"
            className="block w-1.5 h-1.5 rounded-full bg-brand-500"
          />
        ) : null}
      </div>

      <IconBadge tone={visual.tone} size="sm">
        <Icon aria-hidden="true" />
      </IconBadge>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              unread
                ? "font-bold text-slate-900 dark:text-white"
                : "font-semibold text-slate-700 dark:text-slate-300"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 flex-shrink-0">
            {fmtRelative(notification.created_at)}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 break-words">
          {notification.body}
        </p>
      </div>
    </button>
  );
}