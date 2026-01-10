/**
 * AI Service Error Classes
 *
 * Custom error types for AI service operations
 * Enables specific error handling and recovery strategies
 */

/**
 * Base error class for all AI service errors
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider?: 'gemini' | 'openai',
    public readonly operation?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIServiceError);
    }
  }
}

/**
 * Rate limit exceeded error
 * Indicates the API has throttled requests
 */
export class RateLimitError extends AIServiceError {
  constructor(
    provider: 'gemini' | 'openai',
    public readonly retryAfterMs?: number,
    originalError?: Error
  ) {
    super(
      `Rate limit exceeded for ${provider}. ${
        retryAfterMs ? `Retry after ${retryAfterMs}ms` : 'Please try again later'
      }`,
      provider,
      undefined,
      originalError
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Service unavailable/down error
 * Indicates the AI service is temporarily unavailable
 */
export class ServiceDownError extends AIServiceError {
  constructor(
    provider: 'gemini' | 'openai',
    public readonly statusCode?: number,
    originalError?: Error
  ) {
    super(
      `AI service ${provider} is currently unavailable${
        statusCode ? ` (HTTP ${statusCode})` : ''
      }`,
      provider,
      undefined,
      originalError
    );
    this.name = 'ServiceDownError';
  }
}

/**
 * Invalid or unparseable response error
 * Indicates the AI returned data that doesn't match expected format
 */
export class InvalidResponseError extends AIServiceError {
  constructor(
    provider: 'gemini' | 'openai',
    public readonly rawResponse?: string,
    originalError?: Error
  ) {
    super(
      `Invalid response format from ${provider}. Expected valid JSON.`,
      provider,
      undefined,
      originalError
    );
    this.name = 'InvalidResponseError';
  }
}

/**
 * Authentication error
 * Indicates invalid or missing API credentials
 */
export class AuthenticationError extends AIServiceError {
  constructor(
    provider: 'gemini' | 'openai',
    originalError?: Error
  ) {
    super(
      `Authentication failed for ${provider}. Please check API key configuration.`,
      provider,
      undefined,
      originalError
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Timeout error
 * Indicates the operation exceeded maximum allowed time
 */
export class TimeoutError extends AIServiceError {
  constructor(
    provider: 'gemini' | 'openai',
    operation: string,
    timeoutMs: number
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms on ${provider}`,
      provider,
      operation
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Token limit exceeded error
 * Indicates the request or response exceeded token limits
 */
export class TokenLimitError extends AIServiceError {
  constructor(
    provider: 'gemini' | 'openai',
    public readonly tokenCount: number,
    public readonly maxTokens: number
  ) {
    super(
      `Token limit exceeded for ${provider}: ${tokenCount} > ${maxTokens}`,
      provider
    );
    this.name = 'TokenLimitError';
  }
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof ServiceDownError ||
    error instanceof TimeoutError ||
    (error instanceof AIServiceError &&
     Boolean(error.originalError?.message?.includes('ECONNRESET')))
  );
}

/**
 * Type guard to check if error should trigger fallback to alternate provider
 */
export function shouldFallbackToAlternateProvider(error: Error): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof ServiceDownError ||
    error instanceof TimeoutError ||
    error instanceof AuthenticationError
  );
}

/**
 * Extract retry delay from rate limit error
 */
export function getRetryDelay(error: Error): number | undefined {
  if (error instanceof RateLimitError) {
    return error.retryAfterMs;
  }
  return undefined;
}

/**
 * Format error for logging/display
 */
export function formatErrorMessage(error: Error): string {
  if (error instanceof AIServiceError) {
    const parts = [
      `[${error.name}]`,
      error.provider && `Provider: ${error.provider}`,
      error.operation && `Operation: ${error.operation}`,
      error.message,
    ].filter(Boolean);

    return parts.join(' | ');
  }

  return error.message;
}
