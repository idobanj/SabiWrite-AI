// ============================================================================
// generate-quiz — Phase 5
// ============================================================================
// Generates a short multiple-choice quiz for a given mistake topic, anchored
// in the user's own recurring mistakes so the questions feel personal.
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODELS = [
  { name: "gemini-2.5-flash-lite", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent" },
  { name: "gemini-2.0-flash", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" },
];

// Topics we know how to teach. Anything else gets a generic lesson.
const TYPE_TO_TOPIC: Record<string, { label: string; guidance: string }> = {
  subject_verb_agreement: {
    label: "Subject-Verb Agreement",
    guidance:
      "Singular subjects take singular verbs ('he does'), plural subjects take plural verbs ('they do'). Watch out for phrases like 'the team of developers' — 'team' is the head noun and is singular, so the verb is singular too.",
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
      "Common misspellings for non-native English writers: 'recieve' (i before e), 'seperate' (separate), 'definately' (definitely). When in doubt, slow down and sound it out.",
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

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rest<T>(path: string, init: RequestInit): Promise<T> {
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

async function getAuthedUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) throw new Error("Missing Authorization header");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SERVICE_ROLE_KEY },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Auth lookup failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return (await res.json()) as { id: string; email?: string };
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastErr: string | null = null;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(model.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
          },
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Gemini returned an empty response");
        return text;
      }
      const errText = await res.text();
      lastErr = `${model.name} (${res.status}): ${errText.slice(0, 200)}`;
      if ((res.status === 503 || res.status === 429) && attempt === 0) {
        await sleep(700);
        continue;
      }
      // Hard error (400, 401, 404…) — skip to next model
      break;
    }
  }
  throw new Error(`Gemini unavailable: ${lastErr}`);
}

function buildPrompt(
  topic: string,
  guidance: string,
  examples: MistakeRow[],
  count: number
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

  return `You are an English writing coach. Generate exactly ${count} multiple-choice quiz questions on the topic: **${topic}**.

Topic guidance for the writer:
${guidance}

The writer's actual recurring mistakes on this topic (use these to make the questions feel personal and concrete):
${exampleBlock}

Return ONLY a JSON object with this exact shape — no markdown, no commentary:

{
  "questions": [
    {
      "id": "q1",
      "prompt": "<a single short sentence with a blank or a clearly-underlined phrase the writer must fix. Use ___ for the blank.>",
      "options": ["<choice A>", "<choice B>", "<choice C>", "<choice D>"],
      "answer_index": <0..3, the index of the correct option>,
      "explanation": "<one short sentence explaining the rule, in plain English, ≤ 18 words>"
    }
  ]
}

Rules:
- Exactly ${count} questions.
- Exactly 4 options each, no more, no fewer. Exactly one is correct.
- The correct option must be unambiguous. Avoid "all of the above" or "none of the above".
- Vary the prompt style: at least one fill-in-the-blank, at least one "choose the correct sentence".
- Keep options short (≤ 8 words each) and parallel in grammar.
- Explanations are ≤ 18 words, concrete, and reference the rule.
- Prioritise question patterns that mirror the writer's own wrong→correct examples when possible.`;
}

function normaliseQuestion(raw: any, idx: number): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.prompt !== "string" || !raw.prompt.trim()) return null;
  if (
    !Array.isArray(raw.options) ||
    raw.options.length !== 4 ||
    !raw.options.every((o: unknown) => typeof o === "string" && o.trim())
  ) {
    return null;
  }
  const ai = Number(raw.answer_index);
  if (!Number.isInteger(ai) || ai < 0 || ai > 3) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `q${idx + 1}`,
    prompt: raw.prompt.trim(),
    options: raw.options.map((o: string) => o.trim()),
    answer_index: ai,
    explanation:
      typeof raw.explanation === "string" ? raw.explanation.slice(0, 300) : "",
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

    const user = await getAuthedUser(req);

    let body: { topic?: string; count?: number };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topic = typeof body.topic === "string" ? body.topic : "";
    if (!topic || !TYPE_TO_TOPIC[topic]) {
      return new Response(
        JSON.stringify({
          error: `Unknown topic. Expected one of: ${Object.keys(TYPE_TO_TOPIC).join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const count = Math.max(3, Math.min(10, Number(body.count) || 5));
    const { label, guidance } = TYPE_TO_TOPIC[topic];

    // Pull the writer's top recurring mistakes on this topic. We cap at 5 so
    // the prompt stays bounded; the most frequent rows give Gemini the
    // strongest signal about the writer's actual patterns.
    const examples = await rest<MistakeRow[]>(
      `/mistakes?user_id=eq.${user.id}&mistake_type=eq.${topic}` +
        `&select=wrong_text,correct_text,frequency_count,explanation` +
        `&order=frequency_count.desc&limit=5`
    );

    const prompt = buildPrompt(label, guidance, examples ?? [], count);
    const rawText = await callGemini(apiKey, prompt);

    let parsed: any;
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

    const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const questions = rawQuestions
      .map((q: any, i: number) => normaliseQuestion(q, i))
      .filter((q: QuizQuestion | null): q is QuizQuestion => q !== null)
      .slice(0, count);

    if (questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Gemini response had no valid questions" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ topic, topic_label: label, questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
