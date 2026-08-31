import { invokeFunction } from "./supabase";

/**
 * Fetches adaptive skill mastery data for a given topic.
 * The edge function "skill-mastery" is expected to return an object
 * containing at least: status (string), consecutive_passes (number),
 * required_passes (number, default 5), and last_score (number, optional).
 */
export async function getSkillMastery(topic) {
  if (!topic) return null;
  try {
    const data = await invokeFunction("skill-mastery", { topic });
    return data;
  } catch (err) {
    console.error("[skillMastery] error (fallback):", err);
    // Return a safe default so UI shows loading state instead of error
    return {
      status: "active",
      consecutive_passes: 0,
      required_passes: 5,
      last_score: null,
    };
  }
}
