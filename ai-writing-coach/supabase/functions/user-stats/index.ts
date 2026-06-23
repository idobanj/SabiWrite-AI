// ============================================================================
// user-stats — Phase 4 stub
// ============================================================================
// Accepts: { timeframe: 'today' | 'week' | 'month' | 'all' }
// Returns: UserStats
//
// In Phase 4 this will:
//   1. Verify the user is authenticated
//   2. Query analysis_logs and mistakes for the user
//   3. Aggregate totals, mistake-type distribution, accuracy trend
//   4. Return UserStats matching client/src/types/analysis.ts
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
    const { timeframe } = await req.json();

    return new Response(
      JSON.stringify({
        total_submissions: 0,
        total_mistakes: 0,
        top_mistake_types: [],
        improvement_trend: 0,
        accuracy: 0,
        lessons_completed: 0,
        timeframe: timeframe ?? "all",
        message: "Phase 0 stub: real stats arrive in Phase 4.",
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
