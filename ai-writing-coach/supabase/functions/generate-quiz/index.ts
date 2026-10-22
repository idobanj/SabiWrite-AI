// ============================================================================
// generate-quiz — Phase 5
// ============================================================================
// Updated: Fixed JWT handling and added better error diagnostics
// Generates a short multiple-choice quiz for a given mistake topic, anchored
// in the user's own recurring mistakes so the questions feel personal.
//
// Now uses the provider-agnostic AI Service Layer.
//
// Receives: { topic: MistakeType, count?: number } from the authenticated
//           client. We pull the user's top 5 wrong_text/correct_text pairs
//           for the topic and feed them to Gemini as concrete examples, then
//           ask for `count` (default 5) multiple-choice questions.
//
// Returns:  { topic, questions: QuizQuestion[] }
//
// Auth: pulls the user from the Authorization header via auth/v1/user — we
// never trust a user_id from the body.
// ============================================================================

import { generate } from "../_shared/ai/index.ts";
import { generateVerifiedQuestions, QuizQualityError, type QuizQuestion } from "./quiz-quality.ts";
import { ProviderError } from "../_shared/ai/errors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Topics we know how to teach. Anything else gets a generic lesson.
const TYPE_TO_TOPIC: Record<string, { label: string; guidance: string }> = {
  subject_verb_agreement: {
    label: "Subject-Verb Agreement",
    guidance:
      "Singular subjects take singular verbs ('he does'), plural subjects take plural verbs ('they do'). Use clear singular or plural subjects. Avoid collective nouns such as 'team', 'staff', and 'family', where standard English can permit either agreement depending on meaning or dialect.",
  },
  tense: {
    label: "Tense Consistency",
    guidance:
      "Once you pick a tense, stay in it unless the meaning genuinely shifts. The simple past is the most common slip — switch to 'has tried' or 'is trying' only when the timing requires it.",
  },
  article: {
    label: "Articles (a, an, the)",
    guidance:
      "'a/an' introduces a non-specific noun; 'the' refers to a specific one the reader already knows. No article is used with plural generics or most proper nouns.",
  },
  preposition: {
    label: "Prepositions",
    guidance:
      "Prepositions don't translate cleanly between languages. 'On time' (not 'in time' for punctuality), 'at the meeting' (location), 'interested in' (not 'on' or 'at').",
  },
  word_choice: {
    label: "Word Choice",
    guidance:
      "When two words are close in meaning, the choice changes tone. 'Big' vs 'large', 'said' vs 'replied'. Match the register to the audience.",
  },
  spelling: {
    label: "Spelling",
    guidance:
      "Practise standard spellings such as 'receive', 'separate', and 'definitely'. For homophones such as 'their', 'there', and 'they\'re', the entire sentence must make the intended meaning clear.",
  },
  punctuation: {
    label: "Punctuation",
    guidance:
      "Every independent clause needs terminal punctuation. Commas splice two full sentences; use a period or a semicolon instead. Apostrophes mark possession or contractions — never plurals.",
  },
  sentence_structure: {
    label: "Sentence Structure",
    guidance:
      "One main idea per sentence. If you find 'and... and...' stacking up, split the sentence. Subject-verb-object order is the safest default in English.",
  },
  other: {
    label: "General English Mechanics",
    guidance:
      "Mixed mechanics. Focus on the most common slip the writer makes and reinforce the rule that fixes it.",
  },
};

interface MistakeRow {
  wrong_text: string;
  correct_text: string;
  frequency_count: number;
  explanation: string | null;
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const initHeaders = (init?.headers as Record<string, string> | undefined) ?? {};
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...initHeaders,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostgREST ${res.status} on ${path}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

function getAuthedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) throw new Error("Missing Authorization header");

  // The Supabase gateway already validates the JWT before the Edge Function
  // runs, so we can safely decode the payload without a network round-trip.
  // Format: "Bearer <header>.<payload>.<signature>"
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed authorization token");

  try {
    // Base64url → base64 → JSON
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as { sub?: string };

    if (!payload.sub) throw new Error("Token missing user ID (sub claim)");
    return { id: payload.sub };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

function buildPrompt(
  topic: string,
  guidance: string,
  examples: MistakeRow[],
  count: number,
  previousQuestions: QuizQuestion[] = [],
): string {
  const exampleBlock = examples.length
    ? examples
        .map(
          (e, i) =>
            `${i + 1}. Wrong: "${e.wrong_text}" → Correct: "${e.correct_text}"` +
            (e.explanation ? `  (Why: ${e.explanation})` : "")
        )
        .join("\n")
    : "No prior mistakes logged for this topic — generate general questions.";

  // Random 6-digit seed so the AI treats every call as unique and doesn't
  // reproduce a cached response when the prompt text happens to be the same.
  const seed = Math.floor(Math.random() * 900000) + 100000;
  const previousBlock = previousQuestions.length
    ? `\nQuestions already considered in this request (some failed review):\n${JSON.stringify(previousQuestions.map(({prompt, options}) => ({prompt, options})))}\nUse DIFFERENT sentences, subjects, and contexts. Do not repeat these questions, including rejected ones.\n`
    : "";

  return `You are an expert English writing coach, grammarian, and quiz author. Generate exactly ${count} high-quality, grammatically rigorous multiple-choice quiz questions on the topic: **${topic}**.
[seed:${seed}]

Topic guidance for the writer:
${guidance}

The writer's past mistake log (use strictly for thematic context on concepts the writer struggles with):
${exampleBlock}

CRITICAL RULES FOR GRAMMAR, SYNTAX, AND QUESTION VALIDITY:
1. Standard English Grammar is Absolute: The correct answer MUST adhere to standard, uncontroversial English grammar. If any example from the writer's past log is ungrammatical, inverted, or malformed, DO NOT replicate that error—always default to standard English.
2. Full Sentence Coherence: When the correct option (at "answer_index") replaces "___" in the prompt, the resulting sentence MUST be 100% complete, natural, and grammatically flawless.
   - For fill-in-the-blank questions, use exactly ONE blank (___). First write a correct full sentence, then remove only the target word or phrase.
   - For full-sentence choices, use an instruction such as "Choose the grammatically correct sentence." WITHOUT a blank; every option must be a complete sentence.
   - Substitute EVERY option back into the sentence. There must be exactly one valid answer; reject the question if none or several fit.
   - Never write "Can you pass me the ___?" with "their", "there", or "they're" as the answer. A spelling fact does not make an option fit a broken sentence.
   - NEVER create broken prompts where substituting the answer leaves residual bad grammar (e.g. NEVER write prompt "She ___ good of an example." with answer "is good").
   - Correct prompt format: "She is ___ example for the team." with options ["a good", "good a", "an good", "good an"] and correct answer "a good".
3. Strict Article, Determiner & Word Order Rules:
   - Adjective + Noun order with articles MUST follow "a/an/the + [adjective] + [noun]" (e.g., "a good applicant", "an important decision").
   - NEVER suggest inverted order like "good an applicant" or "good of an example" unless standard degree modifiers (as/so/too/how) are explicitly present in the prompt.
   - Singular indefinite articles (a/an) must NEVER modify plural nouns (e.g., "made a contributions" is strictly invalid; it must be "made a contribution").
4. Grounded, Accurate Explanations:
   - Explanations must be ≤ 20 words and state the real grammatical reason directly applicable to the sentence.
   - Do NOT hallucinate external context (e.g., do NOT mention "teachers" or other entities unless they are explicitly in the sentence).
5. Exact Answer Index & Parallel Options:
   - Exactly ${count} questions.
   - Exactly 4 options per question.
   - Exactly one unambiguously correct option.
   - "answer_index" (0, 1, 2, or 3) MUST match the index of the grammatically correct option.
   - The 3 distractor options must be plausible common errors but clearly grammatically incorrect.

IMPORTANT: Vary sentence subjects, contexts, and phrasing. Every question must test the requested topic with exactly one answer accepted in standard English.
${previousBlock}

Return ONLY a JSON object with this exact shape — no markdown, no commentary:

{
  "questions": [
    {
      "id": "q1",
      "prompt": "<a short sentence with exactly one blank (___), or a full-sentence-choice instruction with no blank>",
      "options": ["<choice A>", "<choice B>", "<choice C>", "<choice D>"],
      "answer_index": <0..3, the index of the correct option>,
      "explanation": "<one short sentence explaining the rule in plain English, ≤ 20 words>"
    }
  ]
}
`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check required environment variables
    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({
          error:
            "SUPABASE_URL is not configured on the server. Set it in your Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Set it in your Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const user = await getAuthedUser(req);

    let body: { topic?: string; count?: number };
    try {
      body = await req.json();
      // Unwrap body if it comes wrapped in a { body: ... } structure
      if (body && typeof body === "object" && "body" in body && body && typeof body.body === "object") {
        body = body.body;
      }
      // eslint-disable-next-line no-console
      console.log("[generate-quiz] parsed body:", JSON.stringify(body), "keys:", Object.keys(body ?? {}));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawTopic = typeof body.topic === "string" ? body.topic : "";
    // eslint-disable-next-line no-console
    console.log("[generate-quiz] topic check:", { rawTopic, bodyType: typeof body.topic, bodyKeys: body ? Object.keys(body) : null });
    // Normalise: trim, lowercase, collapse whitespace → underscores. Old
    // mistakes rows occasionally hold values like "Verb Tense" or "verb
    // tense" that don't match the canonical snake_case keys; this catches
    // the obvious drift before we reject the request.
    const topic = rawTopic.trim().toLowerCase().replace(/\s+/g, "_");
    if (!topic || !TYPE_TO_TOPIC[topic]) {
      // Log the actual incoming value so the Supabase function logs tell
      // us exactly what the client sent, even when the response is just a
      // terse 400 to the user.
      // eslint-disable-next-line no-console
      console.error("[generate-quiz] unknown topic:", {
        raw: rawTopic,
        normalised: topic,
        type: typeof body.topic,
        keys: Object.keys(TYPE_TO_TOPIC),
      });
      return new Response(
        JSON.stringify({
          error: `Unknown topic. Expected one of: ${Object.keys(TYPE_TO_TOPIC).join(", ")}`,
          received: rawTopic,
          normalised: topic,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const count = Math.max(3, Math.min(10, Math.floor(Number(body.count) || 5)));
    const { label, guidance } = TYPE_TO_TOPIC[topic];

    // Pull up to 15 of the writer's mistakes for this topic, then randomly
    // sample 5 so the AI sees a different mix each time instead of always
    // anchoring on the same top rows. We still order by frequency first so
    // the pool is biased toward the writer's actual patterns.
    const allExamples = await rest<MistakeRow[]>(
      `/mistakes?user_id=eq.${user.id}&mistake_type=eq.${topic}` +
        `&select=wrong_text,correct_text,frequency_count,explanation` +
        `&order=frequency_count.desc&limit=15`
    );
    const pool = allExamples ?? [];
    if (pool.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No saved mistakes remain for this topic. Analyse a new draft before starting a personalised quiz.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    // Fisher-Yates shuffle of a copy, then take the first 5.
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const examples = shuffled.slice(0, 5);

    const questions = await generateVerifiedQuestions({
      count,
      topic: label,
      generateCandidates: (requested, attempt, previousQuestions) => generate({
        prompt: buildPrompt(label, guidance, examples, requested, previousQuestions),
        temperature: attempt === 0 ? 0.35 : 0,
      }),
      reviewCandidates: (prompt) => generate({prompt, temperature: 0}),
      onAttempt: (stats) => console.info("[generate-quiz] quality review:", stats),
    });

    return new Response(
      JSON.stringify({ topic, topic_label: label, questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof ProviderError) {
      const rateLimited = err.statusCode === 429;
      const retryAfter = Math.max(1, err.retryAfterSeconds ?? 30);
      console.warn("[generate-quiz] provider unavailable:", {status: err.statusCode, retryAfterSeconds: err.retryAfterSeconds});
      return new Response(JSON.stringify({
        error: rateLimited
          ? `Practice is temporarily busy. Please wait ${retryAfter} seconds before trying again.`
          : "Practice is temporarily unavailable. Please try again in a moment.",
        code: rateLimited ? "AI_RATE_LIMITED" : "AI_UNAVAILABLE",
        retryable: true,
        ...(rateLimited ? {retry_after_seconds: retryAfter} : {}),
      }), {
        status: rateLimited ? 429 : 503,
        headers: {...corsHeaders, "Content-Type": "application/json",
          ...(rateLimited ? {"Retry-After": String(retryAfter), "Access-Control-Expose-Headers": "Retry-After"} : {}),
        },
      });
    }
    if (err instanceof QuizQualityError) {
      return new Response(JSON.stringify({error: err.message, code: "QUIZ_QUALITY_CHECK_FAILED"}), {
        status: 503,
        headers: {...corsHeaders, "Content-Type": "application/json"},
      });
    }

    // Log the error for debugging
    console.error("Error in generate-quiz function:", err);

    // Return more detailed error information for debugging
    // In production, you might want to hide specific details
    return new Response(JSON.stringify({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : String(err),
      // Uncomment the next line for more detailed debugging (remove in production)
      // type: err.constructor.name
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
