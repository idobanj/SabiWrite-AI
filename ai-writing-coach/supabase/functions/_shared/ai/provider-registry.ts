// supabase/functions/_shared/ai/provider-registry.ts
import { GeminiProvider } from "./providers/index.ts";
import { GrokProvider } from "./providers/index.ts";
import { loadAIConfig } from "./config.ts";
import { AIProvider } from "./types.ts";
import { ProviderError } from "./errors.ts";

/**
 * Get the AI provider instance based on configuration with fallback support.
 * Tries providers in the order given by AI_PROVIDER_ORDER (defaults to ["gemini"]).
 * If a provider fails with a retryable error (429, 503, timeout, network), tries the next.
 * If all providers fail, throws a combined error.
 */
export function getProvider(): AIProvider {
  const { providerOrder, providers } = loadAIConfig();

  // Default to gemini if no provider configured
  const ordered = providerOrder.length > 0 ? providerOrder : ["gemini"];

  // Map provider names to their classes
  const providerMap: Record<string, new (apiKey: string) => AIProvider> = {
    gemini: GeminiProvider,
    grok: GrokProvider,
  };

  // Map provider names to their API key getters
  const apiKeyMap: Record<string, () => string | undefined> = {
    gemini: () => providers.geminiApiKey,
    grok: () => providers.grokApiKey,
  };

  // If only one provider is configured, return it directly to preserve exact behavior.
  if (ordered.length === 1) {
    const providerName = ordered[0];
    const ProviderClass = providerMap[providerName];
    if (!ProviderClass) {
      throw new Error(`Unknown AI provider: ${providerName}. Configured providers: ${Object.keys(providerMap).join(", ")}`);
    }
    const apiKey = apiKeyMap[providerName]();
    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${providerName}`);
    }
    return new ProviderClass(apiKey);
  }

  // Otherwise, return a wrapper that implements fallback logic.
  class FallbackProvider implements AIProvider {
    private readonly ordered: string[];
    private readonly providerMap: Record<string, new (apiKey: string) => AIProvider>;
    private readonly apiKeyMap: Record<string, () => string | undefined>;

    constructor(
      ordered: string[],
      providerMap: Record<string, new (apiKey: string) => AIProvider>,
      apiKeyMap: Record<string, () => string | undefined>
    ) {
      this.ordered = ordered;
      this.providerMap = providerMap;
      this.apiKeyMap = apiKeyMap;
    }

    async generate(request: { prompt: string; temperature?: number }): Promise<string> {
      // Use the order captured at construction time (should match config at that time)
      const ordered = this.ordered;
      const providerMap = this.providerMap;
      const apiKeyMap = this.apiKeyMap;

      const errors: Array<{ provider: string; message: string; retryable: boolean }> = [];

      for (const providerName of ordered) {
        console.log(`[AI Provider] Attempting provider: ${providerName}`);

        const ProviderClass = providerMap[providerName];
        if (!ProviderClass) {
          const msg = `Unknown AI provider: ${providerName}`;
          console.error(`[AI Provider] ${msg}`);
          errors.push({ provider: providerName, message: msg, retryable: false });
          continue;
        }

        const apiKey = apiKeyMap[providerName]();
        if (!apiKey) {
          const msg = `API key not configured for provider: ${providerName}`;
          console.error(`[AI Provider] ${msg}`);
          errors.push({ provider: providerName, message: msg, retryable: false });
          continue;
        }

        let providerInstance: AIProvider;
        try {
          providerInstance = new ProviderClass(apiKey);
        } catch (err) {
          const msg = `Failed to instantiate provider ${providerName}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[AI Provider] ${msg}`);
          errors.push({ provider: providerName, message: msg, retryable: false });
          continue;
        }

        try {
          const result = await providerInstance.generate(request);
          console.log(`[AI Provider] Provider ${providerName} succeeded`);
          return result;
        } catch (err) {
          let retryable = false;
          let message = String(err);
          if (err instanceof ProviderError) {
            retryable = err.isRetryable;
            message = err.message;
          } else if (err instanceof Error) {
            message = err.message;
          }
          console.warn(`[AI Provider] Provider ${providerName} failed: ${message}`);
          errors.push({ provider: providerName, message: message, retryable: retryable });

          if (!retryable) {
            // Non-retryable error: propagate immediately
            throw err;
          }
          // else continue to next provider
        }
      }

      // All attempts failed; construct combined error.
      const lines = errors.map(e => {
        const retryTag = e.retryable ? " (retryable)" : "";
        return `${e.provider}: ${e.message}${retryTag}`;
      });
      const combinedMsg = `All AI providers failed.\n${lines.join("\n")}`;
      throw new Error(combinedMsg);
    }
  }

  return new FallbackProvider(ordered, providerMap, apiKeyMap);
}