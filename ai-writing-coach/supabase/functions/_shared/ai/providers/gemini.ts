// supabase/functions/_shared/ai/providers/gemini.ts
import { ProviderError } from "../errors.ts";
import { AIProvider, AIRequest, AIResponse } from "../types.ts";

const GEMINI_MODELS = [
  { name: "gemini-2.0-flash",      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" },
  { name: "gemini-2.0-flash-lite", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent" },
  { name: "gemini-1.5-flash",      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent" },
  { name: "gemini-1.5-flash-8b",   url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent" },
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
 * Gemini provider implementation.
 * The API key is injected via the constructor; this class never reads
 * environment variables directly — that is the registry's responsibility.
 */
export class GeminiProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    const geminiReq: GeminiRequest = {
      contents: [{ parts: [{ text: request.prompt }] }],
      generationConfig: { temperature: request.temperature ?? 0 },
    };

    let lastErr: string | null = null;

    for (const model of GEMINI_MODELS) {
      // Two attempts per model: one immediate, one after a 300 ms backoff.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(model.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": this.apiKey,
            },
            body: JSON.stringify(geminiReq),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const json = (await res.json()) as GeminiResponse;
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (!text) throw new ProviderError("Empty response from Gemini", null);
            return text;
          }

          const errText = await res.text();
          lastErr = `${model.name} (${res.status}): ${errText.slice(0, 200)}`;

          // 503 = overloaded, 429 = rate-limited → retry this model once, then move on.
          if (res.status === 503 || res.status === 429) {
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 300));
              continue;
            }
            break; // exhausted retries for this model — try the next
          }

          // 404 = model not available on this account (free-tier retirement) → skip.
          if (res.status === 404) break;

          // Any other status (400, 401, 403, 500…) is a hard failure — surface immediately.
          throw new ProviderError(
            `Gemini API error (${res.status}): ${errText.slice(0, 300)}`,
            res.status,
          );
        } catch (err: any) {
          if (err instanceof ProviderError) throw err;
          if (err.name === "AbortError" || err.message?.includes("aborted")) {
            lastErr = `${model.name}: request timed out after 12s`;
            console.warn(`[GeminiProvider] ${model.name} timed out after 12s, trying next model`);
            break;
          }
          lastErr = `${model.name}: ${err.message || String(err)}`;
        }
      }
    }

    throw new ProviderError(`Gemini unavailable: ${lastErr}`, null);
  }
}