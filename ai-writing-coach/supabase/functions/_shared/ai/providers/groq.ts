// supabase/functions/_shared/ai/providers/groq.ts
import { ProviderError } from "../errors.ts";
import { AIProvider, AIRequest, AIResponse } from "../types.ts";

// ---------------------------------------------------------------------------
// Model list — ordered by preference (fastest / most capable first).
// GroqProvider tries each model in turn; if one is unavailable or rate-limited
// it moves on to the next automatically.
// ---------------------------------------------------------------------------
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "qwen/qwen3.8-27b",
  "groq/compound",
  "groq/compound-mini",
] as const;

// The single endpoint that handles all Groq chat-completion requests.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ---------------------------------------------------------------------------
// Request / response shapes for the Groq OpenAI-compatible endpoint.
// ---------------------------------------------------------------------------
interface GroqRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: string };
}

interface GroqResponse {
  choices?: { message: { content: string } }[];
  error?: { message: string };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Groq provider implementation.
 *
 * Design philosophy (mirrors GeminiProvider exactly):
 *  - API key is injected via the constructor — this class never reads env vars.
 *  - Model fallback is managed internally: try model 1, on retryable failure
 *    move to model 2, and so on. The registry and service layer are unaware
 *    of which model was ultimately used.
 *  - Exposes the same generate(AIRequest): Promise<AIResponse> interface.
 *
 * Retryable conditions (move to next model):
 *  - 429  Rate-limited on this model.
 *  - 500  Internal server error (model may be temporarily unavailable).
 *  - 503  Service overloaded.
 *  - 404  Model not found / no longer available on this account.
 *
 * Hard-failure conditions (throw immediately, do not try next model):
 *  - 401  Invalid API key.
 *  - 400  Malformed request — retrying will not help.
 *  - Any other unexpected status.
 */
export class GroqProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    let lastErr: string | null = null;

    for (const model of GROQ_MODELS) {
      const groqReq: GroqRequest = {
        model,
        messages: [{ role: "user", content: request.prompt }],
        temperature: request.temperature ?? 0,
        max_tokens: Math.min(request.maxTokens ?? 4096, 8192),
        response_format: { type: "json_object" },
      };

      // Two attempts per model: one immediate, one after a 300 ms backoff.
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(groqReq),
        });

        if (res.ok) {
          const json = (await res.json()) as GroqResponse;
          const text = json.choices?.[0]?.message?.content ?? "";
          if (!text) throw new ProviderError("Empty response from Groq", null);
          return text;
        }

        const errText = await res.text();
        lastErr = `${model} (${res.status}): ${errText.slice(0, 200)}`;

        // 429 = rate-limited, 500 = internal error, 503 = overloaded.
        // Retry once with backoff, then move on to the next model.
        if (res.status === 429 || res.status === 500 || res.status === 503) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }
          break; // exhausted retries for this model — try the next
        }

        // 404 or 400 (model not found / decommissioned) → skip to next model immediately.
        if (
          res.status === 404 ||
          (res.status === 400 &&
            (errText.includes("model_not_found") ||
              errText.includes("model_decommissioned") ||
              errText.includes("decommissioned") ||
              errText.includes("does not exist")))
        ) {
          break;
        }

        // Any other status (401, 403…) is a hard failure — surface immediately.
        throw new ProviderError(
          `Groq API error (${res.status}): ${errText.slice(0, 300)}`,
          res.status,
        );
      }
    }

    throw new ProviderError(`Groq unavailable after all models: ${lastErr}`, null);
  }
}
