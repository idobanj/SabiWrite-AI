/**
 * Phase 3: mistake memory client. Wraps the log-mistake Edge Function and
 * tags each returned mistake with its frequency_count / is_repeat so the
 * Writing Desk can render "×N · seen before" badges.
 */
import { supabase } from "./supabase";

/**
 * @typedef {Object} RawMistake
 * @property {string} type
 * @property {string} wrong_text
 * @property {string} correct_text
 * @property {string} [explanation]
 * @property {string} [tip]
 */

/**
 * @typedef {RawMistake & { is_repeat: boolean, frequency_count: number }} TaggedMistake
 */

/**
 * @typedef {Object} UpsertedRow
 * @property {string} mistake_type
 * @property {string} wrong_text
 * @property {boolean} is_repeat
 * @property {number} frequency_count
 * @property {string} id
 */

/**
 * @typedef {Object} LogResult
 * @property {number} new_count
 * @property {number} repeat_count
 * @property {UpsertedRow[]} upserted
 */

/**
 * Send the mistakes from a fresh analysis to the log-mistake Edge Function.
 * The function dedups by (user_id, mistake_type, wrong_text), bumps
 * frequency_count on repeats, and returns the new count + is_repeat flag
 * for each row.
 *
 * Returns the same mistakes with {is_repeat, frequency_count} attached,
 * in the order Gemini emitted them. Items Gemini flagged but the function
 * rejected (validation failure) come back as-is with is_repeat=false,
 * frequency_count=1 — the UI still shows them, just without a recurrence
 * pill.
 *
 * @param {RawMistake[]} mistakes
 * @returns {Promise<{ tagged: TaggedMistake[], summary: LogResult }>}
 */
export async function logMistakes(mistakes) {
  // Build a quick lookup from the function's response so we can attach
  // counts to the matching mistake in the original list. We match on
  // (type, wrong_text) — that pair is unique within a single response.
  /** @type {TaggedMistake[]} */
  const tagged = mistakes.map((m) => ({
    ...m,
    is_repeat: false,
    frequency_count: 1,
  }));

  if (mistakes.length === 0) {
    return {
      tagged,
      summary: { new_count: 0, repeat_count: 0, upserted: [] },
    };
  }

  const { data, error } = await supabase.functions.invoke("log-mistake", {
    body: { mistakes },
  });

  if (error) {
    // Non-fatal: the writing desk still has its analysis on screen. We
    // throw so the caller can decide whether to toast a warning; the
    // caller already has the original `mistakes` to fall back on.
    throw new Error(error.message ?? "log-mistake failed");
  }

  /** @type {LogResult} */
  const summary = data ?? { new_count: 0, repeat_count: 0, upserted: [] };

  /** @type {Map<string, { is_repeat: boolean, frequency_count: number }>} */
  const lookup = new Map();
  for (const u of summary.upserted ?? []) {
    lookup.set(`${u.mistake_type}::${u.wrong_text}`, {
      is_repeat: u.is_repeat,
      frequency_count: u.frequency_count,
    });
  }

  for (const m of tagged) {
    const hit = lookup.get(`${m.type}::${m.wrong_text}`);
    if (hit) {
      m.is_repeat = hit.is_repeat;
      m.frequency_count = hit.frequency_count;
      // Attach the mistake row's UUID so Phase 8's "Mark as mastered"
      // button can target it without a separate fetch.
      if (hit.id) m.id = hit.id;
    }
  }

  return { tagged, summary };
}
