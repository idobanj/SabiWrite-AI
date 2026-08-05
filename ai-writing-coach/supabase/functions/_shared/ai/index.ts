// supabase/functions/_shared/ai/index.ts
import { getProvider } from "./provider-registry.ts";

/**
 * Creates an AI service instance with the configured provider.
 * @returns An object with a generate method that takes an AIRequest and returns a Promise<string>
 */
export function createAIService() {
  const provider = getProvider();

  return {
    generate: async (request: { prompt: string; temperature?: number }): Promise<string> => {
      return await provider.generate(request);
    }
  };
}

// Create a default instance for convenience
const aiService = createAIService();
export { aiService };

// Export the generate function bound to the service instance for backward compatibility
export const generate = aiService.generate.bind(aiService);