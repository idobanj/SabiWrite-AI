/**
 * JSDoc typedefs for the AI engine contract.
 *
 * @typedef {"subject_verb_agreement"|"tense"|"article"|"preposition"|"word_choice"|"spelling"|"punctuation"|"sentence_structure"|"other"} MistakeType
 *
 * @typedef {Object} Mistake
 * @property {string} [id]
 * @property {MistakeType} type
 * @property {string} wrong_text
 * @property {string} correct_text
 * @property {string} explanation
 * @property {string} [tip]
 *
 * @typedef {Object} AnalysisResponse
 * @property {string} corrected_sentence
 * @property {Mistake[]} mistakes
 * @property {string} explanation
 * @property {number} accuracyScore
 * @property {string} focusArea
 *
 * @typedef {Object} UserStats
 * @property {number} total_submissions
 * @property {number} total_mistakes
 * @property {{type: MistakeType, count: number}[]} top_mistake_types
 * @property {number} improvement_trend
 * @property {number} accuracy
 * @property {number} lessons_completed
 *
 * @typedef {Object} HistoryLog
 * @property {string} id
 * @property {string} user_id
 * @property {string} original_text
 * @property {string} corrected_text
 * @property {number} mistake_count
 * @property {number} accuracy_score
 * @property {string|null} focus_area
 * @property {string} created_at
 */

import { supabase } from "./supabase";

/**
 * Send text to the analyze-text Edge Function and return a typed
 * AnalysisResponse. Throws if the request fails or the function returns
 * an error payload — callers should catch and surface a toast.
 *
 * @param {string} text
 * @returns {Promise<AnalysisResponse>}
 */
export async function analyzeText(text) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    throw new Error("Type or paste something before analyzing.");
  }

  const { data, error } = await supabase.functions.invoke("analyze-text", {
    body: { text: trimmed },
  });

  if (error) {
    throw new Error(error.message ?? "Couldn't reach the analysis service.");
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String(data.error));
  }
  return /** @type {AnalysisResponse} */ (data);
}

/**
 * Persist one analysis to the analysis_logs table. Phase 2 only writes
 * here; Phase 3 will fold in mistake deduplication.
 *
 * Tries the full row first (with `mistakes` jsonb so Review Session can
 * re-render the past analysis without re-calling Gemini). If the column
 * isn't in the live schema yet (migration 0005 not applied), falls back
 * to a legacy insert that omits it. Logs a warning when the fallback
 * fires so the user knows the migration still needs to be applied.
 *
 * @param {string} userId
 * @param {string} originalText
 * @param {AnalysisResponse} analysis
 * @returns {Promise<HistoryLog>}
 */
export async function logAnalysis(userId, originalText, analysis) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const baseRow = {
    user_id: userId,
    original_text: originalText,
    corrected_text: analysis.corrected_sentence ?? "",
    mistake_count: analysis.mistakes?.length ?? 0,
    accuracy_score: analysis.accuracyScore ?? 0,
    focus_area: analysis.focusArea ?? null,
  };

  // Try the full insert first — we want the mistakes jsonb so Review
  // Session can re-render the past analysis.
  const fullRow = { ...baseRow, mistakes: analysis.mistakes ?? [] };
  const first = await supabase
    .from("analysis_logs")
    .insert(fullRow)
    .select()
    .single();

  // Fall back to the legacy shape if the mistakes column doesn't exist
  // in the live schema yet (migration 0005 not applied).
  if (
    first.error &&
    (first.error.code === "PGRST204" ||
      /column .*mistakes.* of .*analysis_logs/i.test(first.error.message ?? ""))
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "[analysis] analysis_logs.mistakes column missing — saving without per-mistake data. Apply migration 0005_analysis_logs_mistakes.sql in Supabase SQL Editor."
    );
    const second = await supabase
      .from("analysis_logs")
      .insert(baseRow)
      .select()
      .single();
    if (second.error) throw second.error;
    return /** @type {HistoryLog} */ (second.data);
  }

  if (first.error) throw first.error;
  return /** @type {HistoryLog} */ (first.data);
}

export {};
