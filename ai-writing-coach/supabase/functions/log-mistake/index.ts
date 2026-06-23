// ============================================================================
// log-mistake — Phase 3 stub
// ============================================================================
// Phase 3 will check for existing similar mistakes and increment frequency
// or insert new rows, all scoped to the authenticated user.
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
