// supabase/functions/_shared/ai/index.ts
import { loadAIConfig } from "./config";
import { GeminiProvider } from "./providers";

/**
 * Creates an AI service instance with the configured providers.
 * @returns An object with a generate method that takes an AIRequest and returns a Promise<string>
 */
export function createAIService() {
  const { providerOrder, providers } = loadAIConfig();

  // Initialize providers based on configuration
  const providerMap: Record<string, any> = {
    gemini: new GeminiProvider(providers.geminiApiKey!),
  };

  const orderedProviders = providerOrder
    .map(p => providerMap[p])
    .filter(Boolean);

  return {
    generate: async (request: { prompt: string; temperature?: number }): Promise<string> => {
      for (const provider of orderedProviders) {
        try {
          return await provider.generate(request);
        } catch (err) {
          // If this is the last provider, rethrow the error
          if (provider === orderedProviders[orderedProviders.length - 1]) {
            throw err;
          }
          // Otherwise, try the next provider
        }
      }
      throw new Error("All providers failed");
    }
  };
}

// Create a default instance for convenience
const aiService = createAIService();
export { aiService };

// Export the generate function bound to the service instance for backward compatibility
export const generate = aiService.generate.bind(aiService);