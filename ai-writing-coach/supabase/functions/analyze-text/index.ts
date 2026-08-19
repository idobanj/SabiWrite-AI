// ============================================================================
// analyze-text — Phase 2
// ============================================================================
// Server-side wrapper around the Gemini API. Receives { text } from the
// authenticated client, asks Gemini for a structured AnalysisResponse,
// validates it, and returns JSON. The GEMINI_API_KEY never leaves this
// function.
//
// Now uses the provider-agnostic AI Service Layer.
//
// Model: gemini-2.5-flash — fast and cheap, fine for sentence-level analysis.
// ============================================================================

import { generate } from "../_shared/ai/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * The prompt Gemini sees. We force a JSON response that matches our
 * AnalysisResponse shape exactly. Anything off-shape gets rejected so we
 * never show the user a malformed UI state.
 */
function buildPrompt(text: string): string {
  return `You are SabiWrite, an AI English writing coach for non-native speakers (Yoruba, Hausa, Igbo, French L1). Coach on clarity, word choice, and flow—not grammar only.

Return ONLY valid JSON. No markdown fences. No extra text before or after. Follow standard JSON escaping.

{
  "corrected_sentence": "<FULL, COMPLETE corrected version of the ENTIRE user input text from beginning to end>",
  "mistakes": [
    {
      "type": "<subject_verb_agreement|tense|article|preposition|word_choice|spelling|punctuation|sentence_structure|other>",
      "wrong_text": "<smallest exact verbatim word or short phrase from input, preferably 1-4 words>",
      "correct_text": "<replacement word or short phrase as it appears in corrected_sentence>",
      "explanation": "<18 words or fewer, plain English>",
      "tip": "<12 words or fewer; omit key entirely if no tip>"
    }
  ],
  "explanation": "<one-sentence coaching note>"
}

CRITICAL INSTRUCTIONS FOR THOROUGH AND CONSISTENT ANALYSIS:
1. Systematic Audit: Perform a systematic sentence-by-sentence analysis of the ENTIRE input from beginning to end. Evaluate every sentence and every paragraph with equal thoroughness.
2. No Sampling or Summarizing: Do not summarize the mistakes, sample only the most obvious errors, or decrease evaluation depth for later paragraphs or longer submissions. Treat every paragraph as if it were submitted individually.
3. Comprehensive Category Checking: Check every sentence across all relevant categories: subject-verb agreement, tense, article, preposition, word choice, spelling, punctuation, sentence structure, and other.
4. Report All Genuine Errors: Report every genuine error discovered in the text.
5. Accuracy First: Report ONLY genuine errors. Do NOT invent, force, or manufacture mistakes simply to increase the mistake count.
6. Minimum Verbatim Span: "wrong_text" MUST be the smallest useful exact verbatim portion of the user's original text (preferably 1–4 words). Never quote an entire sentence or long clause unless strictly necessary.
7. Exact Type Strings: The "type" field MUST be strictly one of: subject_verb_agreement, tense, article, preposition, word_choice, spelling, punctuation, sentence_structure, other.
8. Complete Sync: Every actual correction made in "corrected_sentence" MUST have a corresponding mistake entry in the "mistakes" array. Do not silently correct text in "corrected_sentence" without logging the mistake.
9. Full Text Preservation: "corrected_sentence" MUST contain the COMPLETE corrected text of the ENTIRE input from start to finish. Preserve all original paragraph breaks and line structure. Do NOT truncate or return only part of the text.
10. Valid JSON Escaping: All string values in the JSON must use standard escaped double-quotes (\\" not \'). Newlines inside JSON string values must be encoded as \\n.

User text to analyse:
"""${text}"""
`;
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

/**
 * Finds wrong_text inside originalText, tolerating smart-quote vs straight-quote
 * differences that LLMs frequently introduce. Returns the exact verbatim
 * substring from originalText so highlights always align, or null if no match.
 */
function matchVerbatimSubstring(
  originalText: string,
  wrongText: string,
): string | null {
  if (!wrongText) return null;
  // 1. Exact match
  if (originalText.includes(wrongText)) return wrongText;

  // 2. Quote-normalised match
  const norm = (s: string) => s.replace(/['']/g, "'").replace(/[""]/g, '"');
  const normOriginal = norm(originalText);
  const normWrong = norm(wrongText);
  const idx = normOriginal.indexOf(normWrong);
  if (idx !== -1) return originalText.slice(idx, idx + wrongText.length);

  // 3. Case-insensitive quote-normalised fallback
  const lowerIdx = normOriginal.toLowerCase().indexOf(normWrong.toLowerCase());
  if (lowerIdx !== -1) return originalText.slice(lowerIdx, lowerIdx + wrongText.length);

  return null;
}

function normaliseResponse(raw: any, originalText: string): AnalysisResponse | null {
  if (!raw || typeof raw !== "object") return null;

  const mistakes: Mistake[] = [];
  const rawMistakes = Array.isArray(raw.mistakes) ? raw.mistakes : [];
  for (const rawM of rawMistakes) {
    const norm = normaliseMistake(rawM);
    if (!norm) continue;
    const exact = matchVerbatimSubstring(originalText, norm.wrong_text);
    if (!exact) continue; // wrong_text genuinely not in original — discard
    norm.wrong_text = exact; // pin to exact original characters (fixes quote drift)
    mistakes.push(norm);
  }

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

/**
 * Scans the input character by character, correctly tracking whether we are
 * inside a JSON string value. Any literal control character (newline, tab,
 * carriage return, etc.) found inside a string is replaced with its proper
 * JSON escape sequence. This is the only 100% reliable approach because:
 *   - `[^"\\]` in a regex CAN match literal \n, but `.` in `\\.` does NOT,
 *     so the earlier regex-based sanitizer could fail on \\<newline> sequences.
 *   - A brute-force strip approach removes \n globally, breaking inter-token
 *     whitespace in the JSON structure itself.
 */
function sanitizeJsonControlChars(input: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
    } else if (ch === "\\") {
      // Escaped character — copy the backslash and the next char verbatim
      result += ch;
      i++;
      if (i < input.length) result += input[i];
    } else if (ch === '"') {
      result += ch;
      inString = false;
    } else {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        // Literal control character inside a string — must be escaped for JSON
        if (code === 0x0a) result += "\\n";       // newline
        else if (code === 0x0d) result += "\\r";  // carriage return
        else if (code === 0x09) result += "\\t";  // tab
        else result += "\\u" + code.toString(16).padStart(4, "0");
      } else {
        result += ch;
      }
    }
    i++;
  }
  return result;
}

/**
 * Attempt to close any unclosed JSON structures caused by a truncated response.
 * This tracks brace/bracket depth and appends the necessary closers.
 */
function repairTruncatedJson(input: string): string {
  let truncated = input;
  const stack: string[] = [];
  let inStr = false;
  for (let i = 0; i < truncated.length; i++) {
    const ch = truncated[i];
    if (inStr) {
      if (ch === "\\") i++;           // skip escaped char
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") {
        if (stack.length > 0) stack.pop();
      }
    }
  }
  if (inStr) truncated += '"';        // close an open string
  truncated += stack.reverse().join(""); // close open arrays / objects
  return truncated;
}

/**
 * Robust JSON parser for AI outputs.
 * Handles markdown fences, triple quotes, conversational wrappers,
 * literal control characters inside strings, and truncated JSON.
 */
function parseAIJsonResponse(rawText: string): any {
  if (!rawText?.trim()) throw new Error("Empty response from AI service");

  let cleaned = rawText
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Extract the JSON object payload even if wrapped in extra prose
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // Pre-process non-standard triple-quoted strings → proper JSON strings
  cleaned = cleaned.replace(/:\s*"""([\s\S]*?)"""/g, (_match, p1) => {
    return ": " + JSON.stringify(p1);
  });

  // Attempt 1: Standard JSON parse (fast path — works when model is well-behaved)
  try { return JSON.parse(cleaned); } catch (_e1) { /* fall through */ }

  // Attempt 2: Character-by-character sanitizer — escapes literal \n/\r/\t
  // inside string values. This is the definitive fix for Groq returning
  // raw newlines between paragraphs of corrected_sentence.
  try { return JSON.parse(sanitizeJsonControlChars(cleaned)); } catch (_e2) { /* fall through */ }

  // Attempt 3: Sanitize AND repair truncated JSON (response cut off by token limit)
  try {
    const sanitized = sanitizeJsonControlChars(cleaned);
    const repaired = repairTruncatedJson(sanitized);
    return JSON.parse(repaired);
  } catch (_e3) {
    console.error("[analyze-text] All JSON parse attempts failed. Raw output snippet:", rawText.slice(0, 800));
    throw new Error(`Invalid JSON output from AI model`);
  }
}


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const rawText = await generate({
      prompt: buildPrompt(text),
      temperature: 0,
    });

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI service" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let parsed: unknown;
    try {
      parsed = parseAIJsonResponse(rawText);
    } catch (parseErr) {
      console.error("[analyze-text] JSON parsing failed:", parseErr, "Raw output:", rawText);
      return new Response(
        JSON.stringify({
          error: "AI service returned malformed JSON",
          raw: rawText.slice(0, 500),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const analysis = normaliseResponse(parsed, text);
    if (!analysis) {
      return new Response(
        JSON.stringify({ error: "AI service response did not match expected shape" }),
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