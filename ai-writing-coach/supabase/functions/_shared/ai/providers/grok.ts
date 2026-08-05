// supabase/functions/_shared/ai/providers/grok.ts
import { ProviderError } from "../errors.ts";
import { AIProvider, AIRequest, AIResponse } from "../types.ts";

const GROK_MODELS = [
  { name: "grok-1", url: "https://api.grok.com/v1/chat/completions" },
] as const;

interface GrokRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
}

interface GrokResponse {
  choices?: { message: { content: string } }[];
  error?: { message: string };
}

/**
 * Grok provider implementation.
 * The API key is injected via the constructor; this class never reads
 * environment variables directly — that is the registry's responsibility.
 */
export class GrokProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    const grokReq: GrokRequest = {
      model: "grok-1",
      messages: [{ role: "user", content: request.prompt }],
      temperature: request.temperature ?? 0,
    };

    let lastErr: string | null = null;

    for (const model of GROK_MODELS) {
      // Two attempts per model: one immediate, one after a 700 ms backoff.
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(model.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(grokReq),
        });

        if (res.ok) {
          const json = (await res.json()) as GrokResponse;
          const text = json.choices?.[0]?.message?.content ?? "";
          if (!text) throw new ProviderError("Empty response from Grok", null);
          return text;
        }

        const errText = await res.text();
        lastErr = `${model.name} (${res.status}): ${errText.slice(0, 200)}`;

        // 503 = overloaded, 429 = rate-limited → retry this model once, then move on.
        if (res.status === 503 || res.status === 429) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }
          break;
        }

        // 404 = model not available → skip.
        if (res.status === 404) break;

        // Any other status is a hard failure — surface immediately.
        throw new ProviderError(
          `Grok API error (${res.status}): ${errText.slice(0, 300)}`,
          res.status,
        );
      }
    }

    throw new ProviderError(`Grok unavailable: ${lastErr}`, null);
  }
}