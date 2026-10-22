/**
 * Phase 5: practice client. Calls the generate-quiz Edge Function for a topic,
 * and grades the current answers in memory.
 */
import { supabase, invokeFunction } from "./supabase";

/**
 * @typedef {Object} QuizQuestion
 * @property {string} id
 * @property {string} prompt
 * @property {string[]} options
 * @property {number} answer_index
 * @property {string} explanation
 */

/**
 * @typedef {Object} Quiz
 * @property {string} topic
 * @property {string} topic_label
 * @property {QuizQuestion[]} questions
 */

/**
 * @typedef {Object} QuizResult
 * @property {number} score
 * @property {number} total
 * @property {boolean[]} correct_per_question
 */

/**
 * Ask Gemini to generate a short multiple-choice quiz on the given topic.
 * The Edge Function anchors the questions in the user's own recurring
 * mistakes for that topic.
 *
 * @param {string} topic
 * @param {number} [count=5]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Quiz>}
 */
export async function generateQuiz(topic, count = 5, { signal } = {}) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!topic) throw new Error("Topic is required.");

  const result = await invokeFunction("generate-quiz", { topic, count }, { signal });

  if (result && typeof result === "object" && "error" in result) {
    throw new Error(String(result.error));
  }
  return /** @type {Quiz} */ (result);
}

/**
 * Pure grader: returns per-question correctness given a quiz and the user's
 * answers (option indices, or null for skipped).
 *
 * @param {QuizQuestion[]} questions
 * @param {(number | null)[]} answers
 * @returns {QuizResult}
 */
export function gradeQuiz(questions, answers) {
  const correct = questions.map((q, i) => answers[i] === q.answer_index);
  return {
    score: correct.filter(Boolean).length,
    total: questions.length,
    correct_per_question: correct,
  };
}
