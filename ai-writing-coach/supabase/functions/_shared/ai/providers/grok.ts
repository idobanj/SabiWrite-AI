// supabase/functions/_shared/ai/providers/grok.ts
import { ProviderError } from "../errors.ts";

const GROK_MODELS = [
  { name: "grok-1", url: "https://api.grok.com/v1/chat/completions" },
] as const;

interface GrokRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  // We'll keep it simple; other params can be added if needed.
}

interface GrokResponse {
  choices?: { message: { content: string } }[];
  error?: { message: string };
}

/**
 * Grok provider implementation.
 */
export class GrokProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(request: { prompt: string; temperature?: number }): Promise<string> {
    const grokReq: GrokRequest = {
      model: "grok-1",
      messages: [{ role: "user", content: request.prompt }],
      temperature: request.temperature ?? 0,
    };

    let lastErr: string | null = null;
    for (const model of GROK_MODELS) {
      // Two attempts per model: one immediate, one after a 700ms backoff.
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

        // 503 = overloaded. Retry the same model once, then move on.
        // 429 = rate-limited. Same treatment.
        if (res.status === 503 || res.status === 429) {
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 700));
            continue;
          }
          // exhausted this model, try the next one
          break;
        }

        // 404 = model not available to this account (common on the free
        // tier when the provider retires a model). Skip immediately to the next.
        if (res.status === 404) {
          // Model is not available to this account. Don't retry it — move on.
          break;
        }

        // Anything else (400, 401, 403, 500…) is a hard failure — don't retry,
        // don't fall back, surface immediately.
        throw new ProviderError(`Grok API error (${res.status}): ${errText.slice(0, 300)}`, res.status);
      }
    }
    throw new ProviderError(`Grok unavailable: ${lastErr}`, null);
  }
}