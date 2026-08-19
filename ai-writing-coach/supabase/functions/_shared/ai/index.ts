/** @format */

import {GeminiProvider} from './providers/gemini.ts';
import {GroqProvider} from './providers/groq.ts';
import {loadAIConfig} from './config.ts';
import {AIProvider} from './types.ts';

/**
 * Creates a provider-agnostic AI service with provider-level fallback.
 */
export function createAIService() {
    return {
        generate: async (request: AIRequest): Promise<string> => {
            const {providerOrder, apiKeys} = loadAIConfig();

            // Map provider names to their classes
            const providerMap: Record<
                string,
                new (apiKey: string) => AIProvider
            > = {
                gemini: GeminiProvider,
                groq: GroqProvider,
            };

            const errors: Array<{provider: string; message: string}> = [];

            for (const providerName of providerOrder) {
                console.log(`[AI] Trying provider: ${providerName}`);

                const ProviderClass = providerMap[providerName];
                if (!ProviderClass) {
                    console.warn(`[AI] Unknown provider: ${providerName}`);
                    continue;
                }

                const apiKey = apiKeys[providerName];
                if (!apiKey) {
                    console.warn(
                        `[API key not configured for provider: ${providerName}]`,
                    );
                    continue;
                }

                let providerInstance: AIProvider;
                try {
                    providerInstance = new ProviderClass(apiKey);
                } catch (err) {
                    const msg = `Failed to instantiate provider ${providerName}: ${err instanceof Error ? err.message : String(err)}`;
                    console.error(`[AI] ${msg}`);
                    errors.push({provider: providerName, message: msg});
                    continue;
                }

                try {
                    const result = await providerInstance.generate(request);
                    console.log(`[AI] Provider succeeded: ${providerName}`);
                    return result;
                } catch (err) {
                    let message = String(err);
                    if (err instanceof Error) {
                        message = err.message;
                    }
                    console.warn(`[AI] Provider failed: ${providerName}: ${message}`);
                    errors.push({provider: providerName, message});
                    // We don't break here; we try the next provider
                }
            }

            // If we get here, all providers failed
            const errorMessages = errors.map(
                ({provider, message}) => `- ${provider} → ${message}`,
            );
            const combinedMessage = `All AI providers failed.\n${errorMessages.join('\n')}`;
            const error = new Error(combinedMessage);
            console.error(`[AI] ${combinedMessage}`);
            throw error;
        },
    };
}

// Default singleton instance (created once per Edge Function cold-start).
const aiService = createAIService();
export {aiService};

// Named export kept for full backward compatibility with every Edge Function:
//   import { generate } from "../_shared/ai/index.ts";
export const generate = aiService.generate.bind(aiService);
