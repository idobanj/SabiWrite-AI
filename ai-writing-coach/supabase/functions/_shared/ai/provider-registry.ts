// supabase/functions/_shared/ai/provider-registry.ts
import { GeminiProvider } from "./providers/index.ts";
import { loadAIConfig } from "./config.ts";
import { AIProvider } from "./types.ts";

/**
 * Get the AI provider instance based on configuration.
 * Reads the first provider from AI_PROVIDER_ORDER (defaults to gemini).
 * Throws if an unknown provider is configured.
 */
export function getProvider(): AIProvider {
  const { providerOrder, providers } = loadAIConfig();

  // Default to gemini if no provider configured
  const providerName = providerOrder[0] ?? 'gemini';

  // Map of provider names to their classes
  const providerMap: Record<string, new (apiKey: string) => AIProvider> = {
    gemini: GeminiProvider,
  };

  const ProviderClass = providerMap[providerName];
  if (!ProviderClass) {
    throw new Error(`Unknown AI provider: ${providerName}. Configured providers: ${Object.keys(providerMap).join(', ')}`);
  }

  // Get the API key for the provider
  // For now, only gemini is supported. Extend this map as new providers are added.
  const apiKeyMap: Record<string, string | undefined> = {
    gemini: providers.geminiApiKey,
  };

  const apiKey = apiKeyMap[providerName];
  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${providerName}`);
  }

  return new ProviderClass(apiKey);
}