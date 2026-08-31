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
 * Stream text to the analyze-text Edge Function and receive real-time progress events.
 * Returns the final AnalysisResponse. Automatically falls back to standard analyzeText
 * if the stream is interrupted or fails.
 *
 * @param {string} text
 * @param {(progress: { stage: string, message: string }) => void} [onProgress]
 * @returns {Promise<AnalysisResponse>}
 */
export async function analyzeTextStream(text, onProgress) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    throw new Error("Type or paste something before analyzing.");
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: trimmed, stream: true }),
    });

    if (!response.ok || !response.body) {
      console.warn("[analyzeTextStream] Non-OK stream response, falling back to standard analyzeText");
      return await analyzeText(text);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? ""; // keep incomplete tail

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith("data:")) continue;
        const jsonStr = trimmedLine.replace(/^data:\s*/, "");
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === "progress" && onProgress) {
            onProgress({ stage: event.stage, message: event.message });
          } else if (event.type === "complete" && event.result) {
            finalResult = event.result;
          } else if (event.type === "error") {
            throw new Error(event.error || "Analysis stream encountered an error.");
          }
        } catch (e) {
          if (e.message && e.message.includes("Analysis stream encountered")) throw e;
        }
      }
    }

    if (finalResult) {
      return /** @type {AnalysisResponse} */ (finalResult);
    }

    // If stream ended without complete payload, fall back to standard call
    console.warn("[analyzeTextStream] Stream ended without complete payload, falling back to standard analyzeText");
    return await analyzeText(text);
  } catch (err) {
    console.warn("[analyzeTextStream] Stream error, falling back to standard analyzeText:", err);
    return await analyzeText(text);
  }
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
