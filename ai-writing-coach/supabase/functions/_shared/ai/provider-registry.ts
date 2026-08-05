// supabase/functions/_shared/ai/provider-registry.ts
import { GeminiProvider } from "./providers/index.ts";
import { GrokProvider } from "./providers/index.ts";
import { GroqProvider } from "./providers/index.ts";
import { loadAIConfig } from "./config.ts";
import { AIProvider, AIRequest, AIResponse } from "./types.ts";
import { ProviderError } from "./errors.ts";

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------
// This is the ONLY place in the codebase that knows about concrete provider
// classes. To add a new provider:
//   1. Create providers/<name>.ts implementing AIProvider.
//   2. Export it from providers/index.ts.
//   3. Add one line here: <name>: <ClassName>.
// No other file needs to change.
// ---------------------------------------------------------------------------
const PROVIDER_REGISTRY: Record<string, new (apiKey: string) => AIProvider> = {
  gemini: GeminiProvider,
  grok: GrokProvider,
  groq: GroqProvider,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns an AIProvider ready to handle generate() calls.
 *
 * - Reads the ordered provider list from AI_PROVIDER_ORDER (defaults to ["gemini"]).
 * - If only one provider is requested, returns it directly (no overhead).
 * - If multiple providers are requested, returns a FallbackProvider that tries
 *   them in order, skipping retryable errors (429, 503) and surfacing the rest.
 */
export function getProvider(): AIProvider {
  const { providerOrder, apiKeys } = loadAIConfig();
  const ordered = providerOrder.length > 0 ? providerOrder : ["gemini"];

  if (ordered.length === 1) {
    // Fast path: single provider — construct and return directly.
    return buildProvider(ordered[0], apiKeys[ordered[0]]);
  }

  // Multi-provider path: wrap in fallback logic.
  return new FallbackProvider(ordered, apiKeys);
}

// ---------------------------------------------------------------------------
// Internal helpers — not exported
// ---------------------------------------------------------------------------

/**
 * Constructs and returns a single provider by name.
 * Throws clear, actionable errors if the name is unknown or the key is missing.
 */
function buildProvider(
  name: string,
  apiKey: string | undefined,
): AIProvider {
  const ProviderClass = PROVIDER_REGISTRY[name];

  if (!ProviderClass) {
    throw new Error(
      `Unknown AI provider: "${name}". ` +
      `Known providers: ${Object.keys(PROVIDER_REGISTRY).join(", ")}.`,
    );
  }

  if (!apiKey) {
    throw new Error(
      `API key not configured for provider: "${name}". ` +
      `Set the ${name.toUpperCase()}_API_KEY environment variable.`,
    );
  }

  return new ProviderClass(apiKey);
}

/**
 * Tries each provider in order, falling back to the next on retryable errors.
 * Non-retryable errors are re-thrown immediately (no silent suppression).
 * If every provider fails, throws a combined diagnostic error.
 */
class FallbackProvider implements AIProvider {
  constructor(
    private readonly ordered: string[],
    private readonly apiKeys: Record<string, string | undefined>,
  ) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    const errors: Array<{ provider: string; message: string; retryable: boolean }> = [];

    for (const name of this.ordered) {
      console.log(`[AI Provider] Attempting provider: ${name}`);

      // --- Construction ---
      let provider: AIProvider;
      try {
        provider = buildProvider(name, this.apiKeys[name]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[AI Provider] ${message}`);
        errors.push({ provider: name, message, retryable: false });
        continue;
      }

      // --- Invocation ---
      try {
        const result = await provider.generate(request);
        console.log(`[AI Provider] Provider "${name}" succeeded`);
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

        console.warn(`[AI Provider] Provider "${name}" failed: ${message}`);
        errors.push({ provider: name, message, retryable });

        if (!retryable) {
          // Hard error — don't try the next provider, surface immediately.
          throw err;
        }
        // Retryable error — move on to the next provider.
      }
    }

    // Every provider was tried and all failed.
    const detail = errors
      .map((e) => `  ${e.provider}: ${e.message}${e.retryable ? " (retryable)" : ""}`)
      .join("\n");
    throw new Error(`All AI providers failed.\n${detail}`);
  }
}