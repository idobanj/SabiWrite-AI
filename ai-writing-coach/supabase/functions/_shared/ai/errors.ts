// supabase/functions/_shared/ai/errors.ts
export class ProviderError extends Error {
  public readonly statusCode: number | null;
  public readonly isRetryable: boolean;
  public readonly retryAfterSeconds: number | null;

  constructor(message: string, statusCode: number | null = null, retryAfterSeconds: number | null = null) {
    super(message);
    this.statusCode = statusCode;
    this.isRetryable = [429, 500, 502, 503, 504].includes(statusCode ?? 0);
    this.retryAfterSeconds = retryAfterSeconds;
    // Maintains proper prototype chain for instanceof checks (important in transpiled environments)
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

export function retryAfterSeconds(response: Response): number | null {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - Date.now()) / 1000)) : null;
}
