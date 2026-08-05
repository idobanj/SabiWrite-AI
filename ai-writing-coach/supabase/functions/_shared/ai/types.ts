// supabase/functions/_shared/ai/types.ts
export interface AIRequest {
  prompt: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

// The AI service returns the raw text response from the provider.
export type AIResponse = string;

// Provider interface for AI services
export interface AIProvider {
  generate(request: { prompt: string; temperature?: number }): Promise<string>;
}