// ============================================================================
// analyze-text — Phase 2 stub
// ============================================================================
// Accepts: { text: string }
// Returns: AnalysisResponse (mock data)
//
// In Phase 2 this will:
//   1. Verify the user is authenticated (via Authorization header)
//   2. Call Gemini with the structured prompt
//   3. Validate the response against AnalysisResponse
//   4. Return JSON to the client
//
// The Gemini API key lives in the function's env vars — never in the client.
// ============================================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
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
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'text' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Phase 2: replace this stub with a real Gemini API call.
    // The response shape MUST match AnalysisResponse in client/src/types/analysis.ts
    const mockResponse = {
      corrected_sentence: text,
      mistakes: [],
      explanation: "Phase 0 stub: real Gemini integration arrives in Phase 2.",
      accuracyScore: 100,
      focusArea: "Grammar Mechanics",
    };

    return new Response(JSON.stringify(mockResponse), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
