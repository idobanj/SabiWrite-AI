// supabase/functions/_shared/ai/index.ts
import { getProvider } from "./provider-registry.ts";
import type { AIRequest, AIResponse } from "./types.ts";

/**
 * Creates a provider-agnostic AI service.
 *
 * This function does not know — and must never know — which AI provider is
 * in use. It delegates every call to the AIProvider returned by the registry.
 */
export function createAIService() {
  const provider = getProvider();

  return {
    generate: (request: AIRequest): Promise<AIResponse> => {
      return provider.generate(request);
    },
  };
}

// Default singleton instance (created once per Edge Function cold-start).
const aiService = createAIService();
export { aiService };

// Named export kept for full backward compatibility with every Edge Function:
//   import { generate } from "../_shared/ai/index.ts";
export const generate = aiService.generate.bind(aiService);