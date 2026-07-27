import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";
import { NotificationItem } from "./NotificationItem";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications";

/**
 * Bell button + dropdown for the signed-in user's notifications.
 *
 * Mounted in <TopHeader />. On click, fetches the latest notifications
 * from the get-notifications Edge Function (which also generates a
 * streak_at_risk row if appropriate — idempotent within a day).
 *
 * Closing behaviour:
 *   - Click outside the popover (mousedown on document)
 *   - Press Escape
 *   - Click the bell again (toggle)
 *   - Click any notification row (navigate + close)
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Open + fetch. We only fetch on open (not on every render) so we
  // don't hammer the Edge Function every time the user navigates.
  const handleOpen = useCallback(async () => {
    const willOpen = !open;
    setOpen(willOpen);
    setErrorMsg("");
    if (!willOpen) return;

    setLoading(true);
    try {
      const { notifications: list, unread_count } = await getNotifications();
      setNotifications(list ?? []);
      setUnreadCount(unread_count ?? 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[bell] getNotifications failed:", err);
      setErrorMsg(err?.message ?? "Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, [open]);

  // Click outside the popover closes it.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Escape closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Mark a single row read + navigate to its link. Optimistic update so
  // the badge number drops immediately even if the PATCH is slow.
  const handleRowClick = useCallback(
    (notification) => {
      if (!notification.read_at) {
        setUnreadCount((c) => Math.max(0, c - 1));
        markNotificationRead(notification.id);
      }
      setOpen(false);
      if (notification.link) navigate(notification.link);
    },
    [navigate]
  );

  const handleMarkAll = useCallback(async () => {
    // Optimistic.
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) =>
        n.read_at ? n : { ...n, read_at: new Date().toISOString() }
      )
    );
    await markAllNotificationsRead();
  }, []);

  const badge =
    unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : null;

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleOpen}
        className="relative px-2"
      >
        <Bell className="w-4 h-4" />
        {badge ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
          >
            {badge}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-30"
        >
          <Card padded={false} className="overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </p>
              {unreadCount > 0 && !loading ? (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              ) : null}
            </div>

            {/* Body */}
            <div className="max-h-[28rem] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton w="w-9" h="h-9" className="rounded-2xl flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton w="w-3/4" h="h-3" />
                        <Skeleton w="w-full" h="h-3" />
                        <Skeleton w="w-1/2" h="h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errorMsg}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpen}
                    className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                    <BellOff className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    You're all caught up.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    We'll let you know when something's worth your attention.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={handleRowClick}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}