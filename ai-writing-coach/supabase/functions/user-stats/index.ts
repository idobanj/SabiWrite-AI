// ============================================================================
// user-stats — Phase 4
// ============================================================================
// Aggregates analysis_logs + mistakes for the authenticated user and returns
// the four dashboard datasets in a single round-trip:
//   1. Top-line numbers (submissions, mistakes, accuracy, streak)
//   2. Top recurring mistake types (top 5 by frequency_count)
//   3. Daily accuracy trend over the timeframe (day-bucketed, zero-filled)
//   4. Recent activity (last 5 analysis_logs)
//
// Auth: pulls the user from the Authorization header via auth/v1/user —
// we never trust a user_id from the body.
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIMEFRAME_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "all": 0,
};

interface AnalysisLogRow {
  id: string;
  original_text: string;
  corrected_text: string;
  mistake_count: number;
  accuracy_score: number;
  focus_area: string | null;
  created_at: string;
}

interface MistakeRow {
  mistake_type: string;
  frequency_count: number;
  last_seen_at: string;
}

async function rest<T>(
  path: string,
  init: RequestInit,
  prefer?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (prefer) headers["Prefer"] = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostgREST ${res.status} on ${path}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

async function getAuthedUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) throw new Error("Missing Authorization header");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SERVICE_ROLE_KEY },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Auth lookup failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return (await res.json()) as { id: string; email?: string };
}

/** YYYY-MM-DD in UTC. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Inclusive list of the last `n` day keys, oldest first, in UTC. */
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** ISO timestamp for `daysAgo` at midnight UTC, used as a since-filter. */
function sinceIso(daysAgo: number): string {
  if (daysAgo <= 0) return "1970-01-01T00:00:00Z";
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (daysAgo - 1));
  return d.toISOString();
}

/** Count consecutive days with at least one submission, back from today. */
function computeStreak(dayKeys: Set<string>): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (dayKeys.has(k)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getAuthedUser(req);

    let body: { timeframe?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine — defaults apply
    }
    const tf = body.timeframe && TIMEFRAME_DAYS[body.timeframe] !== undefined
      ? body.timeframe
      : "30d";
    const days = TIMEFRAME_DAYS[tf];
    const since = sinceIso(days);

    // Fetch all the rows we need in parallel. We bound the trend query by
    // timeframe but pull all-time mistakes so top-types reflects lifetime
    // patterns, not just the recent window.
    const [logs, mistakes, allLogsForStreak] = await Promise.all([
      rest<AnalysisLogRow[]>(
        `/analysis_logs?user_id=eq.${user.id}&created_at=gte.${since}` +
          `&select=id,original_text,corrected_text,mistake_count,accuracy_score,focus_area,created_at` +
          `&order=created_at.desc&limit=1000`
      ),
      rest<MistakeRow[]>(
        `/mistakes?user_id=eq.${user.id}` +
          `&select=mistake_type,frequency_count,last_seen_at` +
          `&order=frequency_count.desc&limit=500`
      ),
      // Separate fetch for the streak — we need to look at all-time logs so
      // a user with 60 days of history gets a 60-day streak, not just 30.
      rest<{ created_at: string }[]>(
        `/analysis_logs?user_id=eq.${user.id}` +
          `&select=created_at&order=created_at.desc&limit=2000`
      ),
    ]);

    // ---- 1. Top-line numbers ----
    const totalSubmissions = logs.length;
    const totalMistakes = logs.reduce((s, l) => s + (l.mistake_count ?? 0), 0);
    const accuracy = totalSubmissions === 0
      ? 0
      : Math.round(
          logs.reduce((s, l) => s + (l.accuracy_score ?? 0), 0) / totalSubmissions
        );

    // ---- 2. Top mistake types ----
    const typeTotals = new Map<string, { count: number; last_seen_at: string }>();
    for (const m of mistakes) {
      const prev = typeTotals.get(m.mistake_type);
      const seen = m.last_seen_at;
      if (!prev || seen > prev.last_seen_at) {
        typeTotals.set(m.mistake_type, {
          count: (prev?.count ?? 0) + (m.frequency_count ?? 0),
          last_seen_at: seen,
        });
      } else {
        typeTotals.set(m.mistake_type, {
          count: prev.count + (m.frequency_count ?? 0),
          last_seen_at: prev.last_seen_at,
        });
      }
    }
    const topMistakeTypes = [...typeTotals.entries()]
      .map(([type, v]) => ({
        type,
        count: v.count,
        last_seen_at: v.last_seen_at,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ---- 3. Daily accuracy trend (day-bucketed, zero-filled) ----
    const dayBuckets = new Map<string, { sum: number; n: number; subs: number }>();
    for (const l of logs) {
      const k = dayKey(l.created_at);
      const cur = dayBuckets.get(k) ?? { sum: 0, n: 0, subs: 0 };
      cur.sum += l.accuracy_score ?? 0;
      cur.n += 1;
      cur.subs += 1;
      dayBuckets.set(k, cur);
    }
    const trendDays = days > 0 ? lastNDays(days) : (() => {
      // All-time: build the list from the oldest log we have, not from 1970.
      if (logs.length === 0) return [];
      const sortedKeys = [...dayBuckets.keys()].sort();
      return sortedKeys;
    })();
    const accuracyTrend = trendDays.map((k) => {
      const b = dayBuckets.get(k);
      return {
        date: k,
        avg: b && b.n > 0 ? Math.round(b.sum / b.n) : 0,
        submissions: b?.subs ?? 0,
      };
    });

    // ---- 4. Recent activity (last 5) ----
    const recentActivity = logs.slice(0, 5).map((l) => ({
      id: l.id,
      snippet: l.original_text.length > 80
        ? l.original_text.slice(0, 80) + "…"
        : l.original_text,
      accuracy_score: l.accuracy_score,
      mistake_count: l.mistake_count,
      focus_area: l.focus_area,
      created_at: l.created_at,
    }));

    // ---- 5. Streak (all-time) ----
    const streakDayKeys = new Set(allLogsForStreak.map((l) => dayKey(l.created_at)));
    const streak_days = computeStreak(streakDayKeys);

    return new Response(
      JSON.stringify({
        timeframe: tf,
        total_submissions: totalSubmissions,
        total_mistakes: totalMistakes,
        accuracy,
        streak_days,
        top_mistake_types: topMistakeTypes,
        accuracy_trend: accuracyTrend,
        recent_activity: recentActivity,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
