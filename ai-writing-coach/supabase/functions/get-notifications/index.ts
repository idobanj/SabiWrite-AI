// ============================================================================
// get-notifications — Phase 7
// ============================================================================
// Reads the authenticated user's recent notifications + unread count, and
// generates a `streak_at_risk` notification if appropriate. Called every
// time the bell opens — generation is idempotent within a calendar day so
// the user never sees a duplicate "streak at risk" toast on each refresh.
//
// Auth: pulls the user from the Authorization header via auth/v1/user.
// Never trust a user_id from the body.
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Notification {
  id: string;
  user_id: string;
  kind: "repeat_milestone" | "streak_at_risk" | "quiz_followup";
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/**
 * Talk to PostgREST as the service role. Returns parsed JSON or throws.
 */
async function rest<T>(
  path: string,
  init: RequestInit,
  prefer?: string
): Promise<T> {
  const initHeaders = (init?.headers as Record<string, string> | undefined) ?? {};
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...initHeaders,
  };
  if (prefer) headers["Prefer"] = prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostgREST ${res.status} on ${path}: ${text.slice(0, 300)}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/**
 * Resolve the authenticated user from the request's Authorization header.
 * Supabase verifies the JWT and returns the user object.
 */
async function getAuthedUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) throw new Error("Missing Authorization header");

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: auth,
      apikey: SERVICE_ROLE_KEY,
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Auth lookup failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return (await res.json() as { id: string; email?: string });
}

/**
 * Compute the user's current consecutive-day streak from their analysis_logs.
 * Walks back from today (UTC), one day at a time, stops at the first miss.
 * Mirrors src/lib/stats.js:215-228 — a 12-line port is cheaper than a
 * shared module across Deno ↔ browser.
 */
async function computeStreakDays(userId: string): Promise<number> {
  const rows = await rest<{ created_at: string }[]>(
    `/analysis_logs?user_id=eq.${userId}&select=created_at&order=created_at.desc&limit=2000`
  );
  const dayKeys = new Set((rows ?? []).map((r) => r.created_at.slice(0, 10)));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    if (!dayKeys.has(key)) break;
    streak++;
  }
  return streak;
}

/**
 * Did the user write anything today (UTC)? Used to decide whether the
 * streak is at risk.
 */
async function hasDraftToday(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const iso = todayStart.toISOString();
  const rows = await rest<{ id: string }[]>(
    `/analysis_logs?user_id=eq.${userId}&created_at=gte.${iso}&select=id&limit=1`
  );
  return (rows ?? []).length > 0;
}

/**
 * Already have a streak_at_risk row for today? Used to keep the bell
 * idempotent within a calendar day.
 */
async function hasStreakRiskToday(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const iso = todayStart.toISOString();
  const rows = await rest<{ id: string }[]>(
    `/notifications?user_id=eq.${userId}&kind=eq.streak_at_risk&created_at=gte.${iso}&select=id&limit=1`
  );
  return (rows ?? []).length > 0;
}

/**
 * Insert a streak_at_risk row. Failures here are logged but don't break
 * the read path — the user still gets their notifications.
 */
async function insertStreakAtRisk(userId: string, streakDays: number): Promise<void> {
  const body = {
    user_id: userId,
    kind: "streak_at_risk",
    title: `Streak at risk: ${streakDays} day${streakDays === 1 ? "" : "s"}`,
    body:
      `Your ${streakDays}-day writing streak is at risk. Submit a draft today to keep it going.`,
    link: "/app/workspace",
    metadata: { streak_days: streakDays },
  };
  try {
    await rest<unknown>("/notifications", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[get-notifications] streak_at_risk insert failed:", err);
  }
}

interface DroughtRow {
  mistake_id: string;
  mistake_type: string;
  wrong_text: string;
  correct_text: string;
  new_level: number;
}

/**
 * Phase 8: bump a row that just got promoted via the drought check.
 * Wraps bump-mastery in try/catch so one failed promotion doesn't kill
 * the whole drought scan.
 */
async function maybeNotifyMastery(
  userId: string,
  row: DroughtRow
): Promise<void> {
  try {
    // Re-use the same path the manual + quiz paths take. We deliberately
    // do NOT call bump-mastery again — check_drought already incremented
    // mastery_level server-side. We only need the notification payload.
    if (row.new_level >= 5) {
      const body = {
        user_id: userId,
        kind: "mastery_milestone",
        title: `You mastered "${truncate(row.wrong_text, 30)}"`,
        body: `Five levels cleared. "${truncate(row.wrong_text, 60)}" is no longer in your active mistake feed.`,
        link: "/app/analytics",
        metadata: {
          wrong_text: row.wrong_text,
          correct_text: row.correct_text,
          mistake_type: row.mistake_type,
          source: "drought",
        },
      };
      await rest<unknown>("/notifications", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[get-notifications] mastery notification failed:", err);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getAuthedUser(req);
    const userId = user.id;

    // Fetch the 20 most recent notifications + the unread count in parallel.
    // The streak check needs a follow-up write but doesn't block the read.
    const [notifications, unreadRows] = await Promise.all([
      rest<Notification[]>(
        `/notifications?user_id=eq.${userId}&order=created_at.desc&limit=20&select=*`
      ),
      rest<{ id: string }[]>(
        `/notifications?user_id=eq.${userId}&read_at=is.null&select=id`
      ),
    ]);

    const unreadCount = (unreadRows ?? []).length;

    // Streak-at-risk check. Skip if the user has a draft today, the streak
    // is < 2, or we've already nudged them today.
    // Failure here is non-fatal — we still return the notifications list.
    try {
      const [streakDays, draftedToday, alreadyNudged] = await Promise.all([
        computeStreakDays(userId),
        hasDraftToday(userId),
        hasStreakRiskToday(userId),
      ]);
      if (streakDays >= 2 && !draftedToday && !alreadyNudged) {
        await insertStreakAtRisk(userId, streakDays);
      }
    } catch (streakErr) {
      // eslint-disable-next-line no-console
      console.warn("[get-notifications] streak check failed:", streakErr);
    }

    // Phase 8: drought scan. Run as a best-effort follow-up — any
    // promoted rows get a notification (resolved ones) and the metric
    // card on the dashboard reflects the bumped mastery_level.
    try {
      const promoted = await rest<DroughtRow[]>(
        `/rpc/check_drought`,
        {
          method: "POST",
          body: JSON.stringify({ p_user_id: userId }),
        }
      );
      for (const row of promoted ?? []) {
        await maybeNotifyMastery(userId, row);
      }
    } catch (droughtErr) {
      // eslint-disable-next-line no-console
      console.warn("[get-notifications] drought check failed:", droughtErr);
    }

    return new Response(
      JSON.stringify({
        notifications: notifications ?? [],
        unread_count: unreadCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});