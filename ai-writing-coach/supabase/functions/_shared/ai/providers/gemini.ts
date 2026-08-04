// supabase/functions/_shared/ai/providers/gemini.ts
import { withRetry } from "../retry.ts";
import { loadAIConfig } from "../config.ts";
import { ProviderError } from "../errors.ts";

const GEMINI_MODELS = [
  { name: "gemini-flash-latest", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent" },
  { name: "gemini-2.5-flash", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" },
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
export class GeminiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(request: { prompt: string; temperature?: number }): Promise<string> {
    const geminiReq: GeminiRequest = {
      contents: [{ parts: [{ text: request.prompt }] }],
      generationConfig: { temperature: request.temperature ?? 0 }
    };

    for (const model of GEMINI_MODELS) {
      const attemptFn = async () => {
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
        throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
      };

      try {
        return await withRetry(attemptFn, { maxAttempts: 2, retryDelayMs: 700 });
      } catch (err: any) {
        // If this is the last model in the list, format the error to match the original
        if (model === GEMINI_MODELS[GEMINI_MODELS.length - 1]) {
          const baseMsg = err.message ?? String(err);
          const statusMatch = baseMsg.match(/\((\d+)\)/);
          const status = statusMatch ? statusMatch[1] : "unknown";
          const detail = baseMsg.replace(/^.*\): /, "");
          throw new Error(`Gemini unavailable: ${model.name} (${status}): ${detail}`);
        }
        // Otherwise, continue to the next model
      }
    }

    throw new Error("Gemini unavailable: unknown error");
  }
}