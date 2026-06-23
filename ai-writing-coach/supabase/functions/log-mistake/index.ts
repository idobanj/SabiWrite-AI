// ============================================================================
// log-mistake — Phase 3 stub
// ============================================================================
// Accepts: { analysis_log_id: string, mistakes: Mistake[] }
// Returns: { logged: number }
//
// In Phase 3 this will:
//   1. Verify the user is authenticated
//   2. For each mistake, check if a similar mistake already exists for this user
//   3. If yes: increment frequency_count, update last_seen_at
//   4. If no: insert a new row
//   5. Return the count of mistakes logged
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();

    return new Response(
      JSON.stringify({
        logged: 0,
        message: "Phase 0 stub: real mistake logging arrives in Phase 3.",
        received_mistake_count: body?.mistakes?.length ?? 0,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
