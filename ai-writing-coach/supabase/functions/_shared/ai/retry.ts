// supabase/functions/_shared/ai/retry.ts
import { ProviderError } from "./errors.ts";

/**
 * Options for the retry mechanism.
 */
export interface RetryOptions {
  /** Number of attempts (initial attempt + retries). Default: 2 */
  maxAttempts?: number;
  /** Delay in ms between retries. Default: 700 */
  retryDelayMs?: number;
}

/**
 * Executes an async function with retry logic for transient errors.
 * Retries only if the thrown error is a ProviderError with isRetryable === true.
 * Uses fixed delay (no exponential backoff) to match the original implementation.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 2, retryDelayMs = 700 } = options;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ProviderError && err.isRetryable) {
        attempt++;
        if (attempt >= maxAttempts) {
          // No more retries allowed; rethrow the last error.
          throw err;
        }
        // Wait before retrying.
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      // Non-retryable error or not a ProviderError: propagate immediately.
      throw err;
    }
  }
}