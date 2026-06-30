// ============================================================================
// log-mistake — Phase 3
// ============================================================================
// Server-side dedup of mistakes. Receives { original_text?, mistakes: Mistake[] }
// from the authenticated client, upserts each mistake into public.mistakes
// keyed on (user_id, mistake_type, wrong_text), and bumps frequency_count on
// repeats. Returns which mistakes were new vs. repeats and the new counts so
// the client can show "×N · seen before" badges.
//
// Auth: the function pulls the user from the Authorization header using the
// service role key. We never trust a user_id from the body — we always use
// the one Supabase authenticated for us.
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VALID_TYPES = new Set([
  "subject_verb_agreement",
  "tense",
  "article",
  "preposition",
  "word_choice",
  "spelling",
  "punctuation",
  "sentence_structure",
  "other",
]);

interface Mistake {
  type: string;
  wrong_text: string;
  correct_text: string;
  explanation?: string;
  tip?: string;
}

interface RequestBody {
  original_text?: string;
  mistakes: Mistake[];
}

interface UpsertResult {
  mistake_type: string;
  wrong_text: string;
  is_repeat: boolean;
  frequency_count: number;
  id: string;
}

/**
 * Talk to PostgREST as the service role. Returns parsed JSON or throws.
 */
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
  return (await res.json()) as { id: string; email?: string };
}

/**
 * Pull the existing row for (user_id, type, wrong_text), or null.
 * Used to detect "is this a repeat?" before we write.
 */
async function findExisting(
  userId: string,
  type: string,
  wrongText: string
): Promise<{ id: string; frequency_count: number } | null> {
  const rows = await rest<
    { id: string; frequency_count: number }[]
  >(
    `/mistakes?user_id=eq.${userId}&mistake_type=eq.${encodeURIComponent(
      type
    )}&wrong_text=eq.${encodeURIComponent(wrongText)}&select=id,frequency_count&limit=1`
  );
  return rows[0] ?? null;
}

/**
 * Upsert one mistake row. On conflict, bump frequency_count and refresh
 * last_seen_at / explanation / tip (in case the model rephrased them).
 */
async function upsertMistake(
  userId: string,
  m: Mistake
): Promise<UpsertResult> {
  const before = await findExisting(userId, m.type, m.wrong_text);

  const payload = {
    user_id: userId,
    mistake_type: m.type,
    wrong_text: m.wrong_text,
    correct_text: m.correct_text,
    explanation: m.explanation ?? null,
    tip: m.tip ?? null,
    last_seen_at: new Date().toISOString(),
  };

  if (before) {
    // Bump frequency_count atomically. Use an explicit UPDATE rather than
    // an ON CONFLICT upsert so the new frequency_count = old + 1 is unambiguous
    // even under concurrent writes.
    const updated = await rest<
      { id: string; frequency_count: number }[]
    >(
      `/mistakes?id=eq.${before.id}&select=id,frequency_count`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          frequency_count: before.frequency_count + 1,
        }),
      }
    );
    const row = updated[0];
    return {
      mistake_type: m.type,
      wrong_text: m.wrong_text,
      is_repeat: true,
      frequency_count: row?.frequency_count ?? before.frequency_count + 1,
      id: before.id,
    };
  }

  // New row. Use upsert via POST + Prefer: resolution=merge-duplicates so
  // a parallel write from another tab doesn't double-insert.
  const inserted = await rest<
    { id: string; frequency_count: number }[]
  >(
    `/mistakes?on_conflict=mistakes_user_type_wrong_unique&select=id,frequency_count`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ ...payload, frequency_count: 1 }),
    }
  );
  const row = inserted[0];
  return {
    mistake_type: m.type,
    wrong_text: m.wrong_text,
    is_repeat: false,
    frequency_count: row?.frequency_count ?? 1,
    id: row?.id ?? "",
  };
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = Array.isArray(body.mistakes) ? body.mistakes : [];
    if (raw.length === 0) {
      return new Response(
        JSON.stringify({
          new_count: 0,
          repeat_count: 0,
          upserted: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalise + filter out anything that doesn't pass our shape check.
    // Bad rows are dropped silently rather than failing the whole batch —
    // a single weird mistake shouldn't break the writing-desk UX.
    const mistakes: Mistake[] = raw
      .filter(
        (m): m is Mistake =>
          !!m &&
          typeof m === "object" &&
          typeof m.wrong_text === "string" &&
          typeof m.correct_text === "string" &&
          typeof m.type === "string" &&
          VALID_TYPES.has(m.type)
      )
      .map((m) => ({
        type: m.type,
        wrong_text: m.wrong_text.slice(0, 500),
        correct_text: m.correct_text.slice(0, 500),
        explanation: typeof m.explanation === "string" ? m.explanation.slice(0, 600) : undefined,
        tip: typeof m.tip === "string" ? m.tip.slice(0, 300) : undefined,
      }));

    if (mistakes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid mistakes in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: UpsertResult[] = [];
    for (const m of mistakes) {
      try {
        results.push(await upsertMistake(user.id, m));
      } catch (err) {
        // One failed row shouldn't kill the batch. Log and move on.
        // eslint-disable-next-line no-console
        console.error("[log-mistake] upsert failed:", err, m);
      }
    }

    const newCount = results.filter((r) => !r.is_repeat).length;
    const repeatCount = results.filter((r) => r.is_repeat).length;

    return new Response(
      JSON.stringify({
        new_count: newCount,
        repeat_count: repeatCount,
        upserted: results,
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
