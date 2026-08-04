// supabase/functions/_shared/ai/errors.ts
export class ProviderError extends Error {
  public readonly statusCode: number | null;
  public readonly isRetryable: boolean;

  constructor(message: string, statusCode: number | null = null) {
    super(message);
    this.statusCode = statusCode;
    // Define retryable statuses: 503 (overloaded) and 429 (rate-limited)
    this.isRetryable = statusCode === 503 || statusCode === 429;
    // Maintains proper prototype chain for instanceof checks (important in transpiled environments)
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}