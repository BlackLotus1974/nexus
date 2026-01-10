/**
 * AI Service Integration Layer
 *
 * Central export point for all AI services
 *
 * @example
 * ```typescript
 * import { aiService } from '@/lib/ai';
 *
 * // Generate donor intelligence
 * const result = await aiService.generateDonorIntelligence({
 *   name: 'John Doe',
 *   location: 'San Francisco, CA',
 * });
 * ```
 */

// Main orchestrator and convenience API
export { AIOrchestrator, getAIOrchestrator, aiService } from './orchestrator';

// Individual service classes
export { GeminiService, getGeminiService } from './gemini';
export { OpenAIService, getOpenAIService } from './openai';

// TypeScript types and interfaces
export type {
  DonorIntelligence,
  RelationshipAnalysis,
  EngagementStrategy,
  ProjectAlignment,
  ConnectionPoint,
  WarmPathRecommendation,
  IntroductionStrategy,
  CommunicationPattern,
  TimingRecommendation,
  FollowUpCadence,
  EmailTemplate,
  AIServiceConfig,
  RetryConfig,
  AIResponse,
  DonorIntelligenceRequest,
  RelationshipAnalysisRequest,
  EngagementStrategyRequest,
  ProjectAlignmentRequest,
  AIOperationLog,
  GeminiResponse,
  OpenAIResponse,
} from './types';

// Error classes
export {
  AIServiceError,
  RateLimitError,
  ServiceDownError,
  InvalidResponseError,
  AuthenticationError,
  TimeoutError,
  TokenLimitError,
  isRetryableError,
  shouldFallbackToAlternateProvider,
  getRetryDelay,
  formatErrorMessage,
} from './errors';

// Configuration
export {
  validateEnvironmentVariables,
  DEFAULT_AI_CONFIG,
  RETRY_CONFIG,
  MODEL_CONFIGS,
  OPERATION_TIMEOUTS,
  TOKEN_LIMITS,
  getModelConfig,
  isDevelopment,
  enableVerboseLogging,
} from './config';

// Utility functions
export {
  sleep,
  withTimeout,
  withRetry,
  logAIOperation,
  sanitizeInput,
  estimateTokenCount,
  truncateToTokenLimit,
  isValidJSON,
  generateRequestId,
  formatDuration,
  normalizeConfidence,
  validateResponseFields,
} from './utils';

// Prompt templates
export {
  SYSTEM_PROMPT,
  buildDonorIntelligencePrompt,
  buildRelationshipAnalysisPrompt,
  buildEngagementStrategyPrompt,
  buildProjectAlignmentPrompt,
  extractJSON,
} from './prompts';

// Response parsers
export {
  parseDonorIntelligence,
  parseRelationshipAnalysis,
  parseEngagementStrategy,
  parseProjectAlignment,
} from './parser';

// Test helpers (for development and testing)
export {
  mockDonorIntelligence,
  mockRelationshipAnalysis,
  mockEngagementStrategy,
  mockProjectAlignment,
  createMockAIResponse,
  sampleDonorData,
  sampleProjectData,
  delay,
  MockAIService,
} from './test-helpers';
