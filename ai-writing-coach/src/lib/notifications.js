/**
 * Phase 7: notifications client. Calls the get-notifications Edge Function
 * to fetch the user's recent notifications + unread count, and writes
 * read_at flips via direct Supabase queries (RLS gates writes to the
 * signed-in user's own rows).
 */
import { supabase } from "./supabase";

/**
 * @typedef {"repeat_milestone" | "streak_at_risk" | "quiz_followup"} NotificationKind
 *
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} user_id
 * @property {NotificationKind} kind
 * @property {string} title
 * @property {string} body
 * @property {string | null} link
 * @property {Record<string, unknown>} metadata
 * @property {string | null} read_at
 * @property {string} created_at
 */

/**
 * Fetch the signed-in user's 20 most recent notifications plus the unread
 * count. The Edge Function also generates a streak_at_risk row if
 * appropriate, so callers can fire-and-forget on every bell-open.
 *
 * @returns {Promise<{ notifications: Notification[], unread_count: number }>}
 */
export async function getNotifications() {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.functions.invoke("get-notifications", {
    body: {},
  });
  if (error) throw new Error(error.message ?? "Couldn't load notifications.");
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String(data.error));
  }
  return /** @type {{ notifications: Notification[], unread_count: number }} */ (
    data ?? { notifications: [], unread_count: 0 }
  );
}

/**
 * Mark a single notification as read. RLS scopes the update to the
 * signed-in user's own rows.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function markNotificationRead(id) {
  if (!supabase) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[notifications] markNotificationRead failed:", error);
  }
}

/**
 * Mark every unread notification as read in one update. RLS still gates
 * which rows are touched.
 *
 * @returns {Promise<void>}
 */
export async function markAllNotificationsRead() {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[notifications] markAllNotificationsRead failed:", error);
  }
}

export {};