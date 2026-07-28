// ============================================================================
// bump-mastery — Phase 8
// ============================================================================
// Promotes a single mistake row's mastery_level by +1 (capped at 5).
// Three call sites reach here:
//   1. practice.js after a successful quiz attempt
//   2. WritingDesk when the user clicks "Mark as mastered"
//   3. get-notifications when a drought scan finds candidates
//
// Receives: { mistake_id, source: 'quiz'|'drought'|'manual' }
//
// Auth: pulls the user from the Authorization header via auth/v1/user.
// We never trust a user_id from the body — the SQL function gets the
// authenticated user_id from the Authorization header, and the function
// itself verifies the row belongs to that user (see 0008_mastery_engine).
//
// Returns: { previous_level, new_level, resolved, mistake: {id, wrong_text, ...} }
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_SOURCES = new Set(["quiz", "drought", "manual"]);

interface RequestBody {
  mistake_id: string;
  source: "quiz" | "drought" | "manual";
}

interface BumpResult {
  previous_level: number;
  new_level: number;
  resolved: boolean;
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
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/**
 * Resolve the authenticated user from the request's Authorization header.
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
 * Call the PL/pgSQL bump_mastery function. PostgREST exposes scalar
 * functions as POST /rpc/<fn_name>. The function returns a SETOF rows,
 * so we read the first row.
 */
async function callBumpMastery(
  userId: string,
  mistakeId: string
): Promise<BumpResult> {
  const rows = await rest<BumpResult[]>(
    `/rpc/bump_mastery`,
    {
      method: "POST",
      body: JSON.stringify({
        p_user_id: userId,
        p_mistake_id: mistakeId,
        p_delta: 1,
      }),
    }
  );
  const row = (rows ?? [])[0];
  if (!row) throw new Error("bump_mastery returned no row");
  return row;
}

/**
 * Fetch the mistake row so we can include identifying fields in the
 * notification the caller is about to write (wrong_text, type, etc.).
 */
async function fetchMistake(userId: string, mistakeId: string) {
  const rows = await rest<
    {
      id: string;
      mistake_type: string;
      wrong_text: string;
      correct_text: string;
      mastery_level: number;
      resolved: boolean;
    }[]
  >(
    `/mistakes?user_id=eq.${userId}&id=eq.${mistakeId}&select=id,mistake_type,wrong_text,correct_text,mastery_level,resolved&limit=1`
  );
  return (rows ?? [])[0] ?? null;
}

/**
 * Insert a mastery_milestone notification. Only fires when the bump
 * crossed the resolve boundary (new_level === 5). Returns the inserted
 * row's id (or null if no notification was written).
 */
async function insertMasteryNotification(
  userId: string,
  mistake: { wrong_text: string; correct_text: string; mistake_type: string }
): Promise<string | null> {
  const body = {
    user_id: userId,
    kind: "mastery_milestone",
    title: `You mastered "${truncate(mistake.wrong_text, 30)}"`,
    body: `Five levels cleared. "${truncate(mistake.wrong_text, 60)}" is no longer in your active mistake feed.`,
    link: "/app/analytics",
    metadata: {
      wrong_text: mistake.wrong_text,
      correct_text: mistake.correct_text,
      mistake_type: mistake.mistake_type,
    },
  };
  try {
    const rows = await rest<{ id: string }[]>(
      `/notifications`,
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      }
    );
    return rows?.[0]?.id ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[bump-mastery] mastery_milestone insert failed:", err);
    return null;
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

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!body?.mistake_id || typeof body.mistake_id !== "string") {
      return new Response(
        JSON.stringify({ error: "mistake_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (!VALID_SOURCES.has(body.source)) {
      return new Response(
        JSON.stringify({
          error: `source must be one of: ${[...VALID_SOURCES].join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // UUID shape check — the SQL function does its own validation but
    // a malformed UUID here means a 500 from PostgREST, which is worse
    // UX than a clean 400.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.mistake_id
      )
    ) {
      return new Response(
        JSON.stringify({ error: "mistake_id must be a UUID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const bump = await callBumpMastery(user.id, body.mistake_id);
    const mistake = await fetchMistake(user.id, body.mistake_id);

    let notificationId: string | null = null;
    // Only fire the celebration notification if this bump is what
    // crossed the user into "mastered". A bump from 4 → 5 fires; a
    // bump from 1 → 2 stays quiet (handled by the dashboard's
    // mastery_score metric instead).
    if (bump.resolved && bump.previous_level < 5 && mistake) {
      notificationId = await insertMasteryNotification(user.id, mistake);
    }

    return new Response(
      JSON.stringify({
        previous_level: bump.previous_level,
        new_level: bump.new_level,
        resolved: bump.resolved,
        source: body.source,
        mistake,
        notification_id: notificationId,
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