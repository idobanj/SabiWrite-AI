/**
 * Phase 5: practice client. Calls the generate-quiz Edge Function for a topic,
 * grades the user's answers, and persists the result to quiz_sessions so the
 * dashboard / practice page can show a "last attempt" score.
 */
import { supabase } from "./supabase";

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
 * @returns {Promise<Quiz>}
 */
export async function generateQuiz(topic, count = 5) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!topic) throw new Error("Topic is required.");

  const { data, error } = await supabase.functions.invoke("generate-quiz", {
    body: { topic, count },
  });
  if (error) throw new Error(error.message ?? "Couldn't generate a quiz.");
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String(data.error));
  }
  return /** @type {Quiz} */ (data);
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

/**
 * Persist a finished quiz attempt to the quiz_sessions table. Failures
 * here are non-fatal — the user already saw their score, so we just log
 * and move on.
 *
 * @param {Quiz} quiz
 * @param {(number | null)[]} answers
 * @param {QuizResult} result
 * @returns {Promise<object | null>}
 */
export async function saveQuizSession(quiz, answers, result) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const row = {
    user_id: user.id,
    topic: quiz.topic,
    topic_label: quiz.topic_label,
    questions: quiz.questions,
    answers,
    score: result.score,
    total: result.total,
  };
  const { data, error } = await supabase
    .from("quiz_sessions")
    .insert(row)
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[practice] saveQuizSession failed:", error);
    return null;
  }
  return data;
}

/**
 * Load the user's most recent quiz session for a topic (if any). Used to
 * show "Last attempt: 4 / 5" on the practice landing card.
 *
 * @param {string} topic
 * @returns {Promise<{ score: number, total: number, created_at: string } | null>}
 */
export async function getLastQuizSession(topic) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("score,total,created_at")
    .eq("user_id", user.id)
    .eq("topic", topic)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[practice] getLastQuizSession failed:", error);
    return null;
  }
  return data ?? null;
}
