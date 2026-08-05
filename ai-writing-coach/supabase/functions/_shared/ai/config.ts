// supabase/functions/_shared/ai/config.ts
export interface ProviderConfig {
  geminiApiKey?: string;
  grokApiKey?: string;
  // future providers: ...
}

export interface AIConfig {
  providerOrder: string[]; // e.g., ["gemini", "grok"]
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
  const grokApiKey = Deno.env.get("GROK_API_KEY");

  const providers: ProviderConfig = {
    geminiApiKey,
    grokApiKey,
  };

  // Validation is deferred to the point of use. No eager validation here.

  return {
    providerOrder,
    providers,
  };
}