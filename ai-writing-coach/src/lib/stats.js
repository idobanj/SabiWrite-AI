/**
 * Phase 4 client. Fetches dashboard data for the signed-in user and aggregates
 * it into the shape the Progress page needs. This intentionally uses normal
 * Supabase table reads instead of the user-stats Edge Function so the dashboard
 * still works even when that function is not deployed/configured on hosting.
 */
import { supabase } from "./supabase";

/**
 * @typedef {"7d"|"30d"|"90d"|"all"} Timeframe
 *
 * @typedef {Object} TopMistakeType
 * @property {string} type
 * @property {number} count
 * @property {string} last_seen_at
 *
 * @typedef {Object} AccuracyPoint
 * @property {string} date
 * @property {number} avg
 * @property {number} submissions
 *
 * @typedef {Object} RecentActivity
 * @property {string} id
 * @property {string} snippet
 * @property {number} accuracy_score
 * @property {number} mistake_count
 * @property {string | null} focus_area
 * @property {string} created_at
 *
 * @typedef {Object} UserStats
 * @property {Timeframe} timeframe
 * @property {number} total_submissions
 * @property {number} total_mistakes
 * @property {number} accuracy
 * @property {number} streak_days
 * @property {TopMistakeType[]} top_mistake_types
 * @property {AccuracyPoint[]} accuracy_trend
 * @property {RecentActivity[]} recent_activity
 */

/**
 * @param {Timeframe} [timeframe="30d"] - one of "7d" | "30d" | "90d" | "all".
 * @returns {Promise<UserStats>}
 */
export async function getUserStats(timeframe = "30d") {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user?.id) {
    throw new Error("Sign in again to load your progress.");
  }

  const days = timeframeToDays(timeframe);
  const since = sinceIso(days);

  const logsQuery = supabase
    .from("analysis_logs")
    .select(
      "id,original_text,corrected_text,mistake_count,accuracy_score,focus_area,created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (days > 0) {
    logsQuery.gte("created_at", since);
  }

  const [logsResult, mistakesResult, streakResult] = await Promise.all([
    logsQuery,
    supabase
      .from("mistakes")
      .select("mistake_type,frequency_count,last_seen_at")
      .eq("user_id", user.id)
      .order("frequency_count", { ascending: false })
      .limit(500),
    supabase
      .from("analysis_logs")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  if (logsResult.error) throw logsResult.error;
  if (mistakesResult.error) throw mistakesResult.error;
  if (streakResult.error) throw streakResult.error;

  const logs = logsResult.data ?? [];
  const mistakes = mistakesResult.data ?? [];
  const allLogsForStreak = streakResult.data ?? [];

  const totalSubmissions = logs.length;
  const totalMistakes = logs.reduce(
    (sum, row) => sum + (row.mistake_count ?? 0),
    0
  );
  const accuracy =
    totalSubmissions === 0
      ? 0
      : Math.round(
          logs.reduce((sum, row) => sum + (row.accuracy_score ?? 0), 0) /
            totalSubmissions
        );

  const typeTotals = new Map();
  for (const mistake of mistakes) {
    const current = typeTotals.get(mistake.mistake_type) ?? {
      count: 0,
      last_seen_at: mistake.last_seen_at,
    };
    current.count += mistake.frequency_count ?? 0;
    if (mistake.last_seen_at > current.last_seen_at) {
      current.last_seen_at = mistake.last_seen_at;
    }
    typeTotals.set(mistake.mistake_type, current);
  }

  const topMistakeTypes = [...typeTotals.entries()]
    .map(([type, value]) => ({
      type,
      count: value.count,
      last_seen_at: value.last_seen_at,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const accuracyTrend = buildAccuracyTrend(logs, days);
  const recentActivity = logs.slice(0, 5).map((row) => ({
    id: row.id,
    snippet:
      row.original_text.length > 80
        ? `${row.original_text.slice(0, 80)}...`
        : row.original_text,
    accuracy_score: row.accuracy_score,
    mistake_count: row.mistake_count,
    focus_area: row.focus_area,
    created_at: row.created_at,
  }));

  return {
    timeframe,
    total_submissions: totalSubmissions,
    total_mistakes: totalMistakes,
    accuracy,
    streak_days: computeStreak(
      new Set(allLogsForStreak.map((row) => dayKey(row.created_at)))
    ),
    top_mistake_types: topMistakeTypes,
    accuracy_trend: accuracyTrend,
    recent_activity: recentActivity,
  };
}

function timeframeToDays(timeframe) {
  return { "7d": 7, "30d": 30, "90d": 90, all: 0 }[timeframe] ?? 30;
}

function dayKey(iso) {
  return iso.slice(0, 10);
}

function sinceIso(daysAgo) {
  if (daysAgo <= 0) return "1970-01-01T00:00:00Z";
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (daysAgo - 1));
  return date.toISOString();
}

function lastNDays(n) {
  const out = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

function buildAccuracyTrend(logs, days) {
  const buckets = new Map();
  for (const row of logs) {
    const key = dayKey(row.created_at);
    const current = buckets.get(key) ?? { sum: 0, count: 0 };
    current.sum += row.accuracy_score ?? 0;
    current.count += 1;
    buckets.set(key, current);
  }

  const keys =
    days > 0
      ? lastNDays(days)
      : [...buckets.keys()].sort();

  return keys.map((key) => {
    const bucket = buckets.get(key);
    return {
      date: key,
      avg: bucket ? Math.round(bucket.sum / bucket.count) : 0,
      submissions: bucket?.count ?? 0,
    };
  });
}

function computeStreak(dayKeys) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    if (!dayKeys.has(date.toISOString().slice(0, 10))) break;
    streak++;
  }

  return streak;
}
