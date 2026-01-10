/**
 * AI Service Utility Functions
 *
 * Helper functions for retry logic, timeout handling, and logging
 */

import { RETRY_CONFIG, enableVerboseLogging } from './config';
import {
  AIServiceError,
  RateLimitError,
  TimeoutError,
  isRetryableError,
  getRetryDelay,
} from './errors';
import { AIOperationLog } from './types';

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: 'gemini' | 'openai',
  operation: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(provider, operation, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Execute operation with exponential backoff retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  provider: 'gemini' | 'openai',
  operationName: string
): Promise<T> {
  let lastError: Error;
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0 && enableVerboseLogging) {
        console.log(
          `[AI Retry] Attempt ${attempt}/${RETRY_CONFIG.maxRetries} for ${operationName} on ${provider}`
        );
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt
      if (attempt === RETRY_CONFIG.maxRetries) {
        break;
      }

      // Only retry if error is retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Get delay from rate limit error if available
      const retryDelay = getRetryDelay(lastError);
      const waitTime = retryDelay || delay;

      if (enableVerboseLogging) {
        console.log(
          `[AI Retry] ${operationName} failed on ${provider}: ${lastError.message}. Retrying in ${waitTime}ms...`
        );
      }

      await sleep(waitTime);

      // Exponential backoff for next attempt
      delay = Math.min(
        delay * RETRY_CONFIG.backoffMultiplier,
        RETRY_CONFIG.maxDelayMs
      );
    }
  }

  throw lastError!;
}

/**
 * Log AI operation for monitoring
 */
export function logAIOperation(log: AIOperationLog): void {
  const logEntry = {
    timestamp: log.timestamp.toISOString(),
    service: log.service,
    operation: log.operation,
    duration: `${log.duration}ms`,
    success: log.success,
    ...(log.tokenCount && { tokens: log.tokenCount }),
    ...(log.errorType && { error: log.errorType }),
  };

  if (log.success) {
    if (enableVerboseLogging) {
      console.log('[AI Operation Success]', JSON.stringify(logEntry));
    }
  } else {
    console.error('[AI Operation Failed]', JSON.stringify(logEntry));
  }

  // In production, you would send this to a monitoring service
  // e.g., Sentry, DataDog, CloudWatch, etc.
  // Example: sendToMonitoring(logEntry);
}

/**
 * Sanitize input data before sending to AI
 * Removes potentially sensitive information
 */
export function sanitizeInput(data: any): any {
  if (!data) return data;

  const sensitiveKeys = [
    'password',
    'api_key',
    'apiKey',
    'secret',
    'token',
    'ssn',
    'credit_card',
    'creditCard',
  ];

  const sanitize = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    }

    return obj;
  };

  return sanitize(data);
}

/**
 * Estimate token count (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number
): string {
  const estimatedTokens = estimateTokenCount(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Rough truncation based on character count
  const maxChars = maxTokens * 4;
  const truncated = text.substring(0, maxChars);

  return truncated + '\n\n[Content truncated to fit token limit]';
}

/**
 * Validate JSON structure
 */
export function isValidJSON(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Parse confidence score to ensure it's between 0 and 1
 */
export function normalizeConfidence(value: any): number {
  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num)) {
    return 0.5; // Default medium confidence
  }

  return Math.max(0, Math.min(1, num));
}

/**
 * Validate required fields in AI response
 */
export function validateResponseFields<T extends object>(
  data: any,
  requiredFields: (keyof T)[]
): data is T {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return requiredFields.every((field) => field in data);
}
