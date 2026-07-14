/**
 * Phase 4: history client. Reads from the analysis_logs table directly
 * (no Edge Function needed — the table is small and per-user, and
 * PostgREST handles RLS).
 */
import { supabase } from "./supabase";

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} user_id
 * @property {string} original_text
 * @property {string} corrected_text
 * @property {number} mistake_count
 * @property {number} accuracy_score
 * @property {string|null} focus_area
 * @property {string} created_at
 */

const PAGE_SIZE = 25;

/**
 * Fetch one page of history for the current user, newest first. `cursor` is
 * the created_at of the last row on the previous page; we return rows whose
 * created_at is strictly older than it.
 *
 * @param {{ cursor?: string, pageSize?: number }} [opts]
 * @returns {Promise<{ entries: HistoryEntry[], nextCursor: string | null }>}
 */
export async function getHistoryPage({ cursor, pageSize = PAGE_SIZE } = {}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Sign in again to load your history.");

  let query = supabase
    .from("analysis_logs")
    .select(
      "id,user_id,original_text,corrected_text,mistake_count,accuracy_score,focus_area,created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(pageSize + 1); // +1 to know if there's another page

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const entries = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? entries[entries.length - 1].created_at : null;

  return { entries, nextCursor };
}

/**
 * Fetch all distinct focus_area values used in this user's history, so we
 * can populate the topic filter dropdown.
 *
 * @returns {Promise<string[]>}
 */
export async function getHistoryTopics() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("analysis_logs")
    .select("focus_area")
    .not("focus_area", "is", null);
  if (error) return [];
  const set = new Set();
  for (const row of data ?? []) {
    if (row.focus_area) set.add(row.focus_area);
  }
  return [...set].sort();
}
