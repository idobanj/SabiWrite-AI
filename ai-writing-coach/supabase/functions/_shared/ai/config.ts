// supabase/functions/_shared/ai/config.ts

export interface AIConfig {
  /**
   * Ordered list of provider names to try.
   * Controlled by the AI_PROVIDER_ORDER environment variable (comma-separated).
   * Defaults to ["gemini"] when the variable is absent.
   */
  providerOrder: string[];

  /**
   * API keys keyed by provider name.
   * Populated automatically using the naming convention:
   *   {PROVIDER_NAME_UPPERCASE}_API_KEY
   * Examples:
   *   "gemini" → GEMINI_API_KEY
   *   "groq"   → GROQ_API_KEY
   *   "openai" → OPENAI_API_KEY
   * No provider names are hardcoded here; the map is built at runtime from
   * whatever names appear in providerOrder.
   */
  apiKeys: Record<string, string | undefined>;
}

/**
 * Loads configuration from environment variables.
 *
 * Provider API keys are resolved by convention — no provider names are
 * hardcoded in this file. Adding a new provider requires no changes here.
 */
export function loadAIConfig(): AIConfig {
  const orderEnv = Deno.env.get("AI_PROVIDER_ORDER");
  const providerOrder = orderEnv
    ? orderEnv.split(",").map((p) => p.trim()).filter(Boolean)
    : ["gemini"]; // default: Gemini only

  // Build the API-key map from the requested providers only.
  // Convention: the env var name is {PROVIDER_NAME_UPPERCASE}_API_KEY.
  const apiKeys: Record<string, string | undefined> = {};
  for (const name of providerOrder) {
    const envVarName = `${name.toUpperCase()}_API_KEY`;
    apiKeys[name] = Deno.env.get(envVarName);
  }

  return { providerOrder, apiKeys };
}