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
  return `You are SabiWrite, an AI English writing coach for non-native speakers. Coach on clarity, grammar, and natural flow.

Return ONLY valid JSON. No markdown fences. No extra text before or after. Follow standard JSON escaping.

{
  "mistakes": [
    {
      "type": "<subject_verb_agreement|tense|article|preposition|word_choice|spelling|punctuation|sentence_structure|other>",
      "wrong_text": "<smallest exact verbatim word or short phrase from input, preferably 1-4 words>",
      "correct_text": "<replacement word or short phrase>",
      "start": <number>,
      "end": <number>,
      "explanation": "<18 words or fewer, plain English>",
      "tip": "<12 words or fewer; omit key entirely if no tip>"
    }
  ],
  "explanation": "<one-sentence coaching note>"
}

CRITICAL RULES FOR ACCURATE COACHING:
1. ZERO HALLUCINATED MISTAKES (NO SYNONYM SWAPPING):
   - If a sentence is already grammatically correct, natural, and clear, DO NOT change it.
   - NEVER swap a correct word for an arbitrary synonym (e.g. do NOT change "mixed" to "divergent", "organised" to "convened", "conniving" to "colluding", "dismissed" to "rejected", "favoured" to "preferred").
   - If the user's text has NO genuine errors, return an EMPTY mistakes array: "mistakes": [].

2. REPORT ONLY GENUINE ERRORS:
   - Subject-verb agreement (e.g. "he go" -> "he goes")
   - Tense errors (e.g. "yesterday he go" -> "yesterday he went")
   - Wrong or missing prepositions (e.g. "discuss about" -> "discuss")
   - Wrong or missing articles (e.g. "an university" -> "a university")
   - Spelling mistakes (e.g. "definately" -> "definitely")
   - Punctuation & sentence fragments / run-ons
   - Truly awkward or ungrammatical phrasing (L1 transfer errors from Yoruba/Hausa/Igbo/French).

3. Minimum Verbatim Span: "wrong_text" MUST be the smallest useful exact verbatim portion of the user's original text (preferably 1–4 words). Never quote an entire sentence or long clause unless strictly necessary.
4. Precise Offsets: Provide 0-based character indices for "start" (inclusive) and "end" (exclusive) where "wrong_text" appears in the original text.
5. Exact Type Strings: The "type" field MUST be strictly one of: subject_verb_agreement, tense, article, preposition, word_choice, spelling, punctuation, sentence_structure, other.

User text to analyse:
"""${text}"""
`;
}


interface Mistake {
  type: string;
  wrong_text: string;
  correct_text: string;
  start?: number;
  end?: number;
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
  const { type, wrong_text, correct_text, start, end, explanation, tip } = raw;
  if (typeof wrong_text !== "string" || typeof correct_text !== "string") {
    return null;
  }
  if (typeof explanation !== "string") return null;
  if (!VALID_TYPES.has(type)) return null;
  
  const out: Mistake = {
    type,
    wrong_text,
    correct_text,
    start: typeof start === "number" ? start : undefined,
    end: typeof end === "number" ? end : undefined,
    explanation: explanation.slice(0, 300),
  };
  if (typeof tip === "string" && tip.trim()) {
    out.tip = tip.slice(0, 200);
  }
  return out;
}

/**
 * Computes a realistic, length-aware, and severity-weighted accuracy score (0-100).
 * - Zero mistakes is always a clean 100.
 * - Hard grammar errors (subject_verb_agreement, tense, sentence_structure) carry full weight.
 * - Minor/soft suggestions (word_choice, punctuation, other) carry lighter weight.
 * - Word count is factored in so a 500-word essay with 2 suggestions is not crushed to 0 or 70.
 */
function computeAccuracyScore(mistakes: Mistake[], text: string): number {
  if (!mistakes || mistakes.length === 0) return 100;

  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;

  // Severity weights
  const weights: Record<string, number> = {
    subject_verb_agreement: 1.0,
    tense: 1.0,
    sentence_structure: 1.0,
    preposition: 0.8,
    article: 0.7,
    spelling: 0.7,
    word_choice: 0.35,
    punctuation: 0.25,
    other: 0.35,
  };

  let totalWeight = 0;
  for (const m of mistakes) {
    totalWeight += weights[m.type] ?? 0.5;
  }

  // Calculate error density per 100 words with a baseline denominator of 30 words
  const effectiveWords = Math.max(30, words);
  const errorDensity = (totalWeight / effectiveWords) * 100;

  // Moderate penalty curve: scaled smoothly so 1-2 small tips in 500 words is ~95-98 score
  const penalty = Math.min(100, Math.round(errorDensity * 6 + totalWeight * 2));
  return Math.max(0, 100 - penalty);
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
 * Validates the start/end bounds against the original text.
 * Tolerates smart-quote vs straight-quote differences that LLMs introduce.
 * Returns true if valid, false otherwise.
 */
function isValidPositionalMatch(
  originalText: string,
  wrongText: string,
  start: number,
  end: number
): boolean {
  if (start < 0 || end > originalText.length || start >= end) return false;
  
  const slice = originalText.slice(start, end);
  if (slice === wrongText) return true;
  
  // Quote-normalised match fallback
  const norm = (s: string) => s.replace(/['']/g, "'").replace(/[""]/g, '"');
  if (norm(slice) === norm(wrongText)) return true;
  
  // Case-insensitive quote-normalised fallback
  if (norm(slice).toLowerCase() === norm(wrongText).toLowerCase()) return true;
  
  return false;
}

/**
 * Finds the exact start/end indices of wrong_text inside originalText.
 * If the model provided a start hint, it picks the match closest to that hint.
 * Tracks usedRanges to prevent overlapping or duplicate replacements.
 */
function findBestPositionMatch(
  originalText: string,
  wrongText: string,
  startHint?: number,
  usedRanges: { start: number; end: number }[] = []
): { start: number; end: number; exactText: string } | null {
  if (!wrongText) return null;

  // 1. Direct slice check if hint was provided
  if (typeof startHint === "number") {
    const endHint = startHint + wrongText.length;
    if (isValidPositionalMatch(originalText, wrongText, startHint, endHint)) {
      const isOverlapping = usedRanges.some(
        (r) => Math.max(r.start, startHint) < Math.min(r.end, endHint)
      );
      if (!isOverlapping) {
        return {
          start: startHint,
          end: endHint,
          exactText: originalText.slice(startHint, endHint),
        };
      }
    }
  }

  // 2. Search for all occurrences of wrongText (quote-normalised)
  const norm = (s: string) => s.replace(/['']/g, "'").replace(/[""]/g, '"');
  const normOriginal = norm(originalText);
  const normWrong = norm(wrongText);
  
  const occurrences: number[] = [];
  let pos = 0;
  while ((pos = normOriginal.indexOf(normWrong, pos)) !== -1) {
    occurrences.push(pos);
    pos += normWrong.length || 1;
  }

  // If no match found, try case-insensitive
  if (occurrences.length === 0) {
    const lowerOriginal = normOriginal.toLowerCase();
    const lowerWrong = normWrong.toLowerCase();
    pos = 0;
    while ((pos = lowerOriginal.indexOf(lowerWrong, pos)) !== -1) {
      occurrences.push(pos);
      pos += lowerWrong.length || 1;
    }
  }

  if (occurrences.length === 0) return null;

  // Filter out overlapping occurrences
  const availableOccurrences = occurrences.filter((occ) => {
    const occEnd = occ + wrongText.length;
    return !usedRanges.some(
      (r) => Math.max(r.start, occ) < Math.min(r.end, occEnd)
    );
  });

  if (availableOccurrences.length === 0) return null;

  // Pick the occurrence closest to startHint (or the first available if no hint)
  let bestOcc = availableOccurrences[0];
  if (typeof startHint === "number") {
    let minDistance = Math.abs(bestOcc - startHint);
    for (const occ of availableOccurrences) {
      const dist = Math.abs(occ - startHint);
      if (dist < minDistance) {
        minDistance = dist;
        bestOcc = occ;
      }
    }
  }

  return {
    start: bestOcc,
    end: bestOcc + wrongText.length,
    exactText: originalText.slice(bestOcc, bestOcc + wrongText.length),
  };
}

function normaliseResponse(raw: any, originalText: string): AnalysisResponse | null {
  if (!raw || typeof raw !== "object") return null;

  const mistakes: Mistake[] = [];
  const rawMistakes = Array.isArray(raw.mistakes) ? raw.mistakes : [];
  
  const usedRanges: { start: number; end: number }[] = [];
  const validEdits: { start: number; end: number; wrong_text: string; correct_text: string; mistake: Mistake }[] = [];
  
  for (const rawM of rawMistakes) {
    const norm = normaliseMistake(rawM);
    if (!norm) continue;
    
    // Find best position match using start hint if available
    const match = findBestPositionMatch(originalText, norm.wrong_text, norm.start, usedRanges);
    
    if (match) {
      norm.start = match.start;
      norm.end = match.end;
      norm.wrong_text = match.exactText; // pin to verbatim slice from input
      
      usedRanges.push({ start: match.start, end: match.end });
      validEdits.push({
        start: match.start,
        end: match.end,
        wrong_text: norm.wrong_text,
        correct_text: norm.correct_text,
        mistake: norm,
      });
    } else {
      console.warn(`[AnalyzeText] Could not locate verbatim substring in text for: "${norm.wrong_text}"`);
    }
    
    mistakes.push(norm);
  }

  // Sort valid edits from back to front to apply safely without shifting indices
  validEdits.sort((a, b) => b.start - a.start);
  
  // Reconstruct corrected_sentence
  let reconstructedText = originalText;
  for (const edit of validEdits) {
    reconstructedText = 
      reconstructedText.slice(0, edit.start) + 
      edit.correct_text + 
      reconstructedText.slice(edit.end);
  }

  const accuracyScore = computeAccuracyScore(mistakes, originalText);

  return {
    corrected_sentence: reconstructedText,
    mistakes,
    explanation: typeof raw.explanation === "string" ? raw.explanation : "",
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
    let body: { text?: unknown; stream?: unknown };
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
    const isStream = body.stream === true;

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

    // --- Streaming Mode (SSE) ---
    if (isStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: Record<string, any>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          };

          try {
            sendEvent({
              type: "progress",
              stage: "reading",
              message: "Reading your writing...",
            });

            sendEvent({
              type: "progress",
              stage: "analyzing",
              message: "Auditing grammar & sentence structure...",
            });

            const rawText = await generate({
              prompt: buildPrompt(text),
              temperature: 0,
            });

            if (!rawText) {
              sendEvent({ type: "error", error: "Empty response from AI service" });
              controller.close();
              return;
            }

            sendEvent({
              type: "progress",
              stage: "extracting",
              message: "Extracting coaching tips & focus area...",
            });

            let parsed: unknown;
            try {
              parsed = parseAIJsonResponse(rawText);
            } catch (parseErr) {
              console.error("[analyze-text-stream] JSON parsing failed:", parseErr);
              sendEvent({ type: "error", error: "AI service returned malformed JSON" });
              controller.close();
              return;
            }

            const analysis = normaliseResponse(parsed, text);
            if (!analysis) {
              sendEvent({ type: "error", error: "AI service response did not match expected shape" });
              controller.close();
              return;
            }

            sendEvent({
              type: "progress",
              stage: "finalizing",
              message: "Finalizing your feedback...",
            });

            sendEvent({
              type: "complete",
              result: analysis,
            });

            controller.close();
          } catch (err: any) {
            console.error("[analyze-text-stream] Stream processing error:", err);
            sendEvent({
              type: "error",
              error: err instanceof Error ? err.message : String(err),
            });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    // --- Standard Non-Streaming Mode ---
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