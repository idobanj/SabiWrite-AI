// ============================================================================
// analyze-text — Phase 2 stub
// ============================================================================
// Phase 2 will verify the user is authenticated, call Gemini with the
// structured prompt, validate the response, and return AnalysisResponse.
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
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'text' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
