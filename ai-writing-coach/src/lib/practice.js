/**
 * Phase 5: practice client. Calls the generate-quiz Edge Function for a topic,
 * grades the user's answers, and persists the result to quiz_sessions so the
 * dashboard / practice page can show a "last attempt" score.
 */
import { supabase } from "./supabase";
import { bumpMastery } from "./mastery";

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

  // Phase 7: write a quiz_followup notification when the user beats
  // (or matches) their previous attempt. We only fire on improvement OR
  // a perfect score after a non-perfect attempt — silent on regressions
  // to keep the bell signal-to-noise high. Best-effort: a failed insert
  // is logged and swallowed; the quiz result itself is already saved.
  if (data?.created_at) {
    try {
      const previous = await getQuizSessionBefore(quiz.topic, data.created_at);
      if (previous && result.score > previous.score) {
        await insertQuizFollowup({
          topic: quiz.topic,
          topic_label: quiz.topic_label,
          score: result.score,
          total: result.total,
          previous_score: previous.score,
        });
      }
    } catch (notifErr) {
      // eslint-disable-next-line no-console
      console.warn("[practice] quiz_followup failed:", notifErr);
    }
  }

  // Phase 8: mastery promotion. Bump mastery_level by +1 on every
  // active mistake the user has in this topic's mistake_type. The SQL
  // function caps at 5 and flips resolved at the boundary, so retry
  // spam can't farm levels.
  //
  // Gate on a passing attempt (>= 4/5) so a poor score doesn't promote.
  // We bump for every active mistake in the topic — even ones the user
  // didn't see on this quiz — because the quiz is general practice on
  // the whole topic, not a per-question lesson.
  if (result.total > 0 && result.score / result.total >= 0.8) {
    try {
      const mistakes = await fetchActiveMistakesForTopic(quiz.topic);
      for (const m of mistakes) {
        try {
          await bumpMastery(m.id, "quiz");
        } catch (bumpErr) {
          // eslint-disable-next-line no-console
          console.warn("[practice] bump-mastery failed:", bumpErr);
        }
      }
    } catch (fetchErr) {
      // eslint-disable-next-line no-console
      console.warn("[practice] fetchActiveMistakesForTopic failed:", fetchErr);
    }
  }

  return data;
}

/**
 * Fetch the user's active (not-yet-resolved) mistakes for a topic.
 * Used by saveQuizSession to know which rows to promote after a
 * passing attempt. Returns an empty array if none.
 *
 * @param {string} topic
 * @returns {Promise<{ id: string }[]>}
 */
async function fetchActiveMistakesForTopic(topic) {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from("mistakes")
    .select("id")
    .eq("user_id", user.id)
    .eq("mistake_type", topic)
    .eq("resolved", false);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[practice] fetchActiveMistakesForTopic error:", error);
    return [];
  }
  return data ?? [];
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

/**
 * Load the user's *previous* attempt for a topic, given the timestamp of
 * the attempt that came after it. Used by saveQuizSession to decide
 * whether to write a quiz_followup notification ("you beat your last
 * attempt"). Returns null if there's no prior attempt.
 *
 * @param {string} topic
 * @param {string} beforeCreatedAt  ISO timestamp; we want the most recent row strictly older than this
 * @returns {Promise<{ score: number, total: number, created_at: string } | null>}
 */
export async function getQuizSessionBefore(topic, beforeCreatedAt) {
  if (!supabase || !beforeCreatedAt) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("score,total,created_at")
    .eq("user_id", user.id)
    .eq("topic", topic)
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[practice] getQuizSessionBefore failed:", error);
    return null;
  }
  return data ?? null;
}

/**
 * Insert a quiz_followup notification for the current user. Called by
 * saveQuizSession after a successful insert when the user improved on
 * their previous attempt. RLS gates the insert to the signed-in user.
 *
 * Best-effort: failures here are non-fatal (logged and swallowed).
 *
 * @param {object} args
 * @param {string} args.topic
 * @param {string} args.topic_label
 * @param {number} args.score
 * @param {number} args.total
 * @param {number} args.previous_score
 * @returns {Promise<void>}
 */
async function insertQuizFollowup({
  topic,
  topic_label,
  score,
  total,
  previous_score,
}) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  const delta = score - previous_score;
  const verb = score === total ? "nailed" : "improved on";
  const body =
    delta > 0
      ? `You ${verb} the ${topic_label} quiz (${score}/${total}) — ${delta} ${delta === 1 ? "answer" : "answers"} better than last time.`
      : `You matched your previous ${topic_label} attempt (${score}/${total}). One more run to beat it.`;

  const { error } = await supabase.from("notifications").insert({
    user_id: user.id,
    kind: "quiz_followup",
    title:
      score === total
        ? `Perfect ${topic_label} quiz: ${score}/${total}`
        : `Up by ${delta} on ${topic_label}`,
    body,
    link: "/app/focus",
    metadata: {
      topic,
      topic_label,
      score,
      total,
      previous_score,
    },
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[practice] insertQuizFollowup failed:", error);
  }
}
