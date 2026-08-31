// ============================================================================
// skill-mastery — Phase X (adaptive skill progress)
// ============================================================================
// Returns the adaptive mastery state for a given topic:
//   status: "active" | "improving" | "proficient" | "reinforcement"
//   consecutive_passes: number (how many recent passes >=80%)
//   required_passes: number (default 5)
//   last_score: number | null
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Simple wrapper for PostgREST calls */
async function rest<T>(path: string, init: RequestInit, prefer?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (prefer) headers["Prefer"] = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PostgREST ${res.status} on ${path}: ${txt.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/** Resolve authenticated user from Authorization header */
async function getAuthedUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) throw new Error("Missing Authorization header");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SERVICE_ROLE_KEY },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Auth lookup failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as { id: string };
}

interface RequestBody {
  topic: string;
}

interface QuizSession {
  id: string;
  score: number;
  total: number;
  created_at: string;
}

function computeConsecutivePasses(sessions: QuizSession[], passingScore = 80): number {
  let count = 0;
  for (const s of sessions) {
    if (s.score >= passingScore) count++;
    else break;
  }
  return count;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const user = await getAuthedUser(req);
    let body: RequestBody = { topic: "" };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.topic || typeof body.topic !== "string") {
      return new Response(JSON.stringify({ error: "topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Fetch recent quiz sessions for this user/topic, newest first.
    const sessions = await rest<QuizSession[]>(
      `/quiz_sessions?user_id=eq.${user.id}&topic=eq.${encodeURIComponent(body.topic)}` +
        `&order=created_at.desc&limit=20`,
      { method: "GET" },
    );

    const lastScore = sessions.length ? sessions[0].score : null;
    const consecutive = computeConsecutivePasses(sessions);
    const required = 5;

    let status: string;
    if (consecutive >= required) {
      status = "proficient";
    } else if (consecutive > 0) {
      status = "improving";
    } else if (lastScore !== null && lastScore < 80) {
      // User has attempted but not passed recently – suggest reinforcement.
      status = "reinforcement";
    } else {
      status = "active";
    }

    const payload = {
      status,
      consecutive_passes: consecutive,
      required_passes: required,
      last_score: lastScore,
    };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
