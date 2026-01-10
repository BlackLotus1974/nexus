/**
 * AI Service Configuration
 *
 * Centralized configuration for AI service providers (Gemini and OpenAI)
 * Handles environment variable validation and default settings
 */

import { AIServiceConfig, RetryConfig } from './types';

/**
 * Validate required environment variables are present
 * @throws Error if required variables are missing
 */
export function validateEnvironmentVariables(): void {
  const requiredVars = ['GOOGLE_GEMINI_API_KEY', 'OPENAI_API_KEY'];
  const missing = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file against .env.local.example'
    );
  }
}

/**
 * Default AI service configuration
 */
export const DEFAULT_AI_CONFIG: Required<AIServiceConfig> = {
  geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiModel: 'gemini-1.5-pro',
  openaiModel: 'gpt-4-turbo-preview',
  timeout: parseInt(process.env.AI_TIMEOUT_MS || '120000', 10), // 2 minutes
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
  temperature: 0.7, // Balanced creativity/consistency
  maxTokens: 4096,
};

/**
 * Retry configuration with exponential backoff
 */
export const RETRY_CONFIG: RetryConfig = {
  maxRetries: DEFAULT_AI_CONFIG.maxRetries,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds max
  backoffMultiplier: 2, // Double delay each retry
};

/**
 * Model-specific configurations
 */
export const MODEL_CONFIGS = {
  gemini: {
    'gemini-1.5-pro': {
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
    'gemini-1.5-flash': {
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
  },
  openai: {
    'gpt-4-turbo-preview': {
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1.0,
    },
    'gpt-4': {
      maxTokens: 8192,
      temperature: 0.7,
      topP: 1.0,
    },
    'gpt-3.5-turbo': {
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1.0,
    },
  },
} as const;

/**
 * Get configuration for a specific model
 */
export function getModelConfig(
  provider: 'gemini' | 'openai',
  model: string
): any {
  return MODEL_CONFIGS[provider][model as keyof typeof MODEL_CONFIGS[typeof provider]];
}

/**
 * AI operation timeouts (in milliseconds)
 */
export const OPERATION_TIMEOUTS = {
  donorIntelligence: 120000, // 2 minutes
  relationshipAnalysis: 90000, // 1.5 minutes
  engagementStrategy: 60000, // 1 minute
  projectAlignment: 45000, // 45 seconds
} as const;

/**
 * Token limits for different operations
 */
export const TOKEN_LIMITS = {
  donorIntelligence: 4000,
  relationshipAnalysis: 3000,
  engagementStrategy: 2500,
  projectAlignment: 2000,
} as const;

/**
 * Check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if we should enable verbose logging
 */
export const enableVerboseLogging =
  process.env.AI_VERBOSE_LOGGING === 'true' || isDevelopment;
