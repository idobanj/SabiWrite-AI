// supabase/functions/_shared/ai/config.ts
export interface ProviderConfig {
  geminiApiKey?: string;
  // future providers: groqApiKey?, agentRouterEndpoint?, agentRouterApiKey?, etc.
}

export interface AIConfig {
  providerOrder: string[]; // e.g., ["gemini", "groq", "agent-router"]
  providers: ProviderConfig;
}

/**
 * Loads configuration from environment variables.
 * Throws if required variables for any enabled provider are missing.
 */
export function loadAIConfig(): AIConfig {
  const orderEnv = Deno.env.get("AI_PROVIDER_ORDER");
  const providerOrder = orderEnv
    ? orderEnv.split(",").map((p) => p.trim())
    : ["gemini"]; // default to gemini only

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  const providers: ProviderConfig = {
    geminiApiKey,
  };

  // Validate that at least one provider in the order has its required config.
  // For simplicity, we only validate gemini for now.
  if (providerOrder.includes("gemini") && !geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment.");
  }

  return {
    providerOrder,
    providers,
  };
}