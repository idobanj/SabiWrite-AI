/**
 * Phase 8: mastery client. Calls the bump-mastery Edge Function to
 * promote a single mistake row's mastery_level by +1. Used by:
 *   - WritingDesk "Mark as mastered" button (source: 'manual')
 *   - Practice module after a successful quiz (source: 'quiz')
 *
 * Drought promotions happen server-side inside get-notifications
 * (source: 'drought') and don't need a client wrapper.
 */
import { supabase } from "./supabase";

/**
 * @typedef {"quiz" | "drought" | "manual"} MasterySource
 *
 * @typedef {Object} BumpResponse
 * @property {number} previous_level
 * @property {number} new_level
 * @property {boolean} resolved
 * @property {MasterySource} source
 * @property {object | null} mistake
 * @property {string | null} notification_id
 */

/**
 * Bump a mistake's mastery_level by +1. The Edge Function clamps to
 * [0, 5] and flips `resolved` to true when the row reaches 5. When
 * crossing 5, a `mastery_milestone` notification is also written.
 *
 * @param {string} mistakeId  UUID of the mistakes row to promote
 * @param {MasterySource} source  why we're bumping — recorded in metadata
 * @returns {Promise<BumpResponse>}
 */
export async function bumpMastery(mistakeId, source = "manual") {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!mistakeId) throw new Error("mistakeId is required.");

  const { data, error } = await supabase.functions.invoke("bump-mastery", {
    body: { mistake_id: mistakeId, source },
  });
  if (error) {
    throw new Error(error.message ?? "bump-mastery failed");
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String(data.error));
  }
  return /** @type {BumpResponse} */ (data);
}

export {};