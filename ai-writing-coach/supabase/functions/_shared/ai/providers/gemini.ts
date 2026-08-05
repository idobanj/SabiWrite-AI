// supabase/functions/_shared/ai/providers/gemini.ts
import { loadAIConfig } from "../config.ts";
import { ProviderError } from "../errors.ts";
import { AIProvider } from "../types.ts";

const GEMINI_MODELS = [
  { name: "gemini-2.5-flash-lite", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent" },
  { name: "gemini-2.5-flash", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" },
  { name: "gemini-3.6-flash", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent" },
] as const;

interface GeminiRequest {
  contents: { parts: { text: string }[] }[];
  generationConfig: { temperature: number };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text: string }[] }[] }[];
  error?: { message: string };
}

/**
 * Gemini provider implementation that matches the original callGemini behavior exactly.
 */
export class GeminiProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(request: { prompt: string; temperature?: number }): Promise<string> {
    const geminiReq: GeminiRequest = {
      contents: [{ parts: [{ text: request.prompt }] }],
      generationConfig: { temperature: request.temperature ?? 0 }
    };

    let lastErr: string | null = null;
    for (const model of GEMINI_MODELS) {
      // Two attempts per model: one immediate, one after a 700ms backoff.
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(model.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(geminiReq),
        });

        if (res.ok) {
          const json = (await res.json()) as GeminiResponse;
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (!text) throw new Error("Empty response from Gemini");
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
}