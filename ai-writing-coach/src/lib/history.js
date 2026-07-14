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
 * @property {Array<{type: string, wrong_text: string, correct_text: string, explanation?: string, tip?: string}>|null} mistakes
 */

const PAGE_SIZE = 25;

const COLUMNS_FULL =
  "id,user_id,original_text,corrected_text,mistake_count,accuracy_score,focus_area,created_at,mistakes";
const COLUMNS_LEGACY =
  "id,user_id,original_text,corrected_text,mistake_count,accuracy_score,focus_area,created_at";

/**
 * Fetch one page of history for the current user, newest first. `cursor` is
 * the created_at of the last row on the previous page; we return rows whose
 * created_at is strictly older than it.
 *
 * Tries to select the `mistakes` jsonb column; on a 400 (column not in
 * schema — happens if migration 0005 hasn't been applied yet), falls back
 * to the legacy column set so the page still renders.
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

  const run = async (columns) => {
    let query = supabase
      .from("analysis_logs")
      .select(columns)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(pageSize + 1);
    if (cursor) query = query.lt("created_at", cursor);
    return await query;
  };

  let { data, error } = await run(COLUMNS_FULL);
  if (error && /column .*mistakes/i.test(error.message ?? "")) {
    // Schema not yet migrated — fall back to the legacy select.
    // eslint-disable-next-line no-console
    console.warn(
      "[history] analysis_logs.mistakes column missing; falling back."
    );
    ({ data, error } = await run(COLUMNS_LEGACY));
  }
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const entries = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? entries[entries.length - 1].created_at : null;

  return { entries, nextCursor };
}

/**
 * Fetch a single history entry by id. Used by WritingDesk when the user
 * clicks "Review Session" — it pre-loads the saved analysis without
 * re-calling Gemini.
 *
 * Falls back to the legacy column set on a 400.
 *
 * @param {string} id
 * @returns {Promise<HistoryEntry | null>}
 */
export async function getHistoryEntry(id) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!id) return null;

  let { data, error } = await supabase
    .from("analysis_logs")
    .select(COLUMNS_FULL)
    .eq("id", id)
    .maybeSingle();
  if (error && /column .*mistakes/i.test(error.message ?? "")) {
    ({ data, error } = await supabase
      .from("analysis_logs")
      .select(COLUMNS_LEGACY)
      .eq("id", id)
      .maybeSingle());
  }
  if (error) throw error;
  // Older rows won't have mistakes — default to null so callers can decide.
  return data ?? null;
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
