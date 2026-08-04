// ============================================================================
// analyze-text — Phase 2
// ============================================================================
// Server-side wrapper around the Gemini API. Receives { text } from the
// authenticated client, asks Gemini for a structured AnalysisResponse,
// validates it, and returns JSON. The GEMINI_API_KEY never leaves this
// function.
//
// Model: gemini-2.5-flash — fast and cheap, fine for sentence-level analysis.
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Two models in priority order. If the primary is overloaded (503/429) or
// unavailable (404), callGemini skips it and tries the next one.
//
// Primary: `gemini-flash-latest` — an alias that always resolves to the
// current stable Gemini Flash model. Auto-tracks Google's releases so the
// next time they retire a versioned model name we won't break.
//
// Fallback: `gemini-2.0-flash` — stable Flash model still available on the
// free tier. `gemini-2.5-flash` returns 404 for new users as of 2026.
const GEMINI_MODELS = [
  { name: "gemini-flash-latest", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent" },
  { name: "gemini-2.0-flash", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(apiKey: string, body: GeminiRequest) {
  let lastErr: string | null = null;
  for (const model of GEMINI_MODELS) {
    // Two attempts per model: one immediate, one after a 700ms backoff.
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(model.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        return await res.json() as GeminiResponse;
      }

      const errText = await res.text();
      lastErr = `${model.name} (${res.status}): ${errText.slice(0, 200)}`;

      // 503 = overloaded. Retry the same model once, then move on.
      // 429 = rate-limited. Same treatment.
      if (res.status === 503 || res.status === 429) {
        if (attempt === 0) {
          await sleep(700);
          continue;
        }
        // exhausted this model, try the next one
        break;
      }

      // 404 = model not available to this account (common on the free
      // tier when Google retires a model). Skip immediately to the next.
      if (res.status === 404) {
        // Model is not available to this account. Don't retry it — move on.
        break;
      }

      // Anything else (400, 401, 403, 500…) is a hard failure — don't retry,
      // don't fall back, surface immediately.
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
    }
  }
  throw new Error(`Gemini unavailable: ${lastErr}`);
}

/**
 * The prompt Gemini sees. We force a JSON response that matches our
 * AnalysisResponse shape exactly. Anything off-shape gets rejected so we
 * never show the user a malformed UI state.
 */
function buildPrompt(text: string): string {
  return `You are SabiWrite, an AI English writing coach for non-native speakers (Yoruba, Hausa, Igbo, French L1). Coach on clarity, word choice, and flow—not grammar only.

Return ONLY valid JSON (no fences, no extra text):

{
  "corrected_sentence": "<corrected; preserve meaning and tone>",
  "mistakes": [{
    "type": "<subject_verb_agreement|tense|article|preposition|word_choice|spelling|punctuation|sentence_structure|other>",
    "wrong_text": "<verbatim from input>",
    "correct_text": "<replacement>",
    "explanation": "<≤18 words, plain English>",
    "tip": "<≤12 words; omit if none>"
  }],
  "explanation": "<one-sentence coaching note>"
}

Rules: empty mistakes[] if correct (positive note). wrong_text must appear verbatim in input.

Text:
"""
${text}
"""`;
}

interface GeminiRequest {
  contents: { parts: { text: string }[] }[];
  generationConfig: { temperature: number };
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text: string }[] };
  }[];
  error?: { message: string };
}

interface Mistake {
  type: string;
  wrong_text: string;
  correct_text: string;
  explanation?: string;
  tip?: string;
}

interface AnalysisResponse {
  corrected_sentence: string;
  mistakes: Mistake[];
  explanation: string;
  accuracyScore: number;
  focusArea: string;
}

const MISTAKE_TYPE_LABELS: Record<string, string> = {
  subject_verb_agreement: "Subject-Verb Agreement",
  tense: "Tense",
  article: "Article",
  preposition: "Preposition",
  word_choice: "Word Choice",
  spelling: "Spelling",
  punctuation: "Punctuation",
  sentence_structure: "Sentence Structure",
  other: "Other",
};

const TYPE_PRIORITY = Object.keys(MISTAKE_TYPE_LABELS);
const VALID_TYPES = new Set(TYPE_PRIORITY);

function normaliseMistake(raw: any): Mistake | null {
  if (!raw || typeof raw !== "object") return null;
  const { type, wrong_text, correct_text, explanation, tip } = raw;
  if (typeof wrong_text !== "string" || typeof correct_text !== "string") {
    return null;
  }
  if (typeof explanation !== "string") return null;
  if (!VALID_TYPES.has(type)) return null;
  const out: Mistake = {
    type,
    wrong_text,
    correct_text,
    explanation: explanation.slice(0, 300),
  };
  if (typeof tip === "string" && tip.trim()) {
    out.tip = tip.slice(0, 200);
  }
  return out;
}

/** Deterministic score derived from validated mistake count — never from the model. */
function computeAccuracyScore(mistakeCount: number): number {
  return Math.max(0, 100 - mistakeCount * 10);
}

/** Dominant mistake theme by type frequency — never from the model. */
function computeFocusArea(mistakes: Mistake[]): string {
  if (mistakes.length === 0) return "General";

  const counts = new Map<string, number>();
  for (const m of mistakes) {
    counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
  }

  let dominant: string | null = null;
  let maxCount = 0;
  for (const type of TYPE_PRIORITY) {
    const count = counts.get(type) ?? 0;
    if (count > maxCount) {
      maxCount = count;
      dominant = type;
    }
  }

  return dominant ? (MISTAKE_TYPE_LABELS[dominant] ?? "General") : "General";
}

function normaliseResponse(raw: any): AnalysisResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const mistakes = Array.isArray(raw.mistakes)
    ? raw.mistakes.map(normaliseMistake).filter((m): m is Mistake => m !== null)
    : [];

  const accuracyScore = computeAccuracyScore(mistakes.length);

  return {
    corrected_sentence:
      typeof raw.corrected_sentence === "string"
        ? raw.corrected_sentence
        : "",
    mistakes,
    explanation:
      typeof raw.explanation === "string" ? raw.explanation : "",
    accuracyScore,
    focusArea: computeFocusArea(mistakes),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GEMINI_API_KEY is not configured on the server. Set it in your Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let body: { text?: unknown };
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

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing or empty 'text' field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (text.length > 4000) {
      return new Response(
        JSON.stringify({
          error: "Text is too long. Keep submissions under 4000 characters.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiReq: GeminiRequest = {
      contents: [{ parts: [{ text: buildPrompt(text) }] }],
      generationConfig: {
        temperature: 0,
      },
    };

    const geminiBody = await callGemini(apiKey, geminiReq);

    if (geminiBody.error) {
      return new Response(
        JSON.stringify({ error: geminiBody.error.message }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Empty response from Gemini" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let parsed: unknown;
    try {
      // Strip markdown fences in case the model wraps output in ```json ... ```
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({
          error: "Gemini returned malformed JSON",
          raw: rawText.slice(0, 500),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const analysis = normaliseResponse(parsed);
    if (!analysis) {
      return new Response(
        JSON.stringify({ error: "Gemini response did not match expected shape" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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