/**
 * Google Gemini AI Service
 *
 * Primary AI provider for donor intelligence and relationship analysis
 * Implements retry logic, rate limiting, and structured response parsing
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  DonorIntelligence,
  RelationshipAnalysis,
  EngagementStrategy,
  ProjectAlignment,
  DonorIntelligenceRequest,
  RelationshipAnalysisRequest,
  EngagementStrategyRequest,
  ProjectAlignmentRequest,
  AIResponse,
  GeminiResponse,
} from './types';
import {
  buildDonorIntelligencePrompt,
  buildRelationshipAnalysisPrompt,
  buildEngagementStrategyPrompt,
  buildProjectAlignmentPrompt,
} from './prompts';
import {
  parseDonorIntelligence,
  parseRelationshipAnalysis,
  parseEngagementStrategy,
  parseProjectAlignment,
} from './parser';
import {
  RateLimitError,
  ServiceDownError,
  AuthenticationError,
  AIServiceError,
} from './errors';
import {
  withTimeout,
  withRetry,
  logAIOperation,
  generateRequestId,
  sanitizeInput,
} from './utils';
import { DEFAULT_AI_CONFIG, OPERATION_TIMEOUTS, getModelConfig } from './config';

/**
 * Gemini Service Class
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || DEFAULT_AI_CONFIG.geminiApiKey;

    if (!key) {
      throw new AuthenticationError('gemini');
    }

    this.genAI = new GoogleGenerativeAI(key);
    this.modelName = modelName || DEFAULT_AI_CONFIG.geminiModel;
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Generate comprehensive donor intelligence
   */
  async generateDonorIntelligence(
    request: DonorIntelligenceRequest
  ): Promise<AIResponse<DonorIntelligence>> {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const operation = 'generateDonorIntelligence';

    try {
      const sanitizedRequest = sanitizeInput(request);
      const prompt = buildDonorIntelligencePrompt(sanitizedRequest);

      const response = await withRetry(
        () =>
          withTimeout(
            this.generateContent(prompt),
            OPERATION_TIMEOUTS.donorIntelligence,
            'gemini',
            operation
          ),
        'gemini',
        operation
      );

      const parsedData = parseDonorIntelligence(response.text, 'gemini');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'gemini',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: false,
        errorType: (error as Error).name,
        timestamp: new Date(),
      });

      throw this.handleError(error as Error);
    }
  }

  /**
   * Analyze relationship strength and warm paths
   */
  async analyzeRelationships(
    request: RelationshipAnalysisRequest
  ): Promise<AIResponse<RelationshipAnalysis>> {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const operation = 'analyzeRelationships';

    try {
      const sanitizedRequest = sanitizeInput(request);
      const prompt = buildRelationshipAnalysisPrompt(sanitizedRequest);

      const response = await withRetry(
        () =>
          withTimeout(
            this.generateContent(prompt),
            OPERATION_TIMEOUTS.relationshipAnalysis,
            'gemini',
            operation
          ),
        'gemini',
        operation
      );

      const parsedData = parseRelationshipAnalysis(response.text, 'gemini');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'gemini',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: false,
        errorType: (error as Error).name,
        timestamp: new Date(),
      });

      throw this.handleError(error as Error);
    }
  }

  /**
   * Generate personalized engagement strategy
   */
  async generateEngagementStrategy(
    request: EngagementStrategyRequest
  ): Promise<AIResponse<EngagementStrategy>> {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const operation = 'generateEngagementStrategy';

    try {
      const sanitizedRequest = sanitizeInput(request);
      const prompt = buildEngagementStrategyPrompt(sanitizedRequest);

      const response = await withRetry(
        () =>
          withTimeout(
            this.generateContent(prompt),
            OPERATION_TIMEOUTS.engagementStrategy,
            'gemini',
            operation
          ),
        'gemini',
        operation
      );

      const parsedData = parseEngagementStrategy(response.text, 'gemini');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'gemini',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: false,
        errorType: (error as Error).name,
        timestamp: new Date(),
      });

      throw this.handleError(error as Error);
    }
  }

  /**
   * Analyze project-donor alignment
   */
  async analyzeProjectAlignment(
    request: ProjectAlignmentRequest
  ): Promise<AIResponse<ProjectAlignment>> {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const operation = 'analyzeProjectAlignment';

    try {
      const sanitizedRequest = sanitizeInput(request);
      const prompt = buildProjectAlignmentPrompt(sanitizedRequest);

      const response = await withRetry(
        () =>
          withTimeout(
            this.generateContent(prompt),
            OPERATION_TIMEOUTS.projectAlignment,
            'gemini',
            operation
          ),
        'gemini',
        operation
      );

      const parsedData = parseProjectAlignment(response.text, 'gemini');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'gemini',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'gemini',
        operation,
        duration: latencyMs,
        success: false,
        errorType: (error as Error).name,
        timestamp: new Date(),
      });

      throw this.handleError(error as Error);
    }
  }

  /**
   * Low-level content generation
   */
  private async generateContent(prompt: string): Promise<GeminiResponse> {
    try {
      const modelConfig = getModelConfig('gemini', this.modelName);

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: modelConfig?.temperature || DEFAULT_AI_CONFIG.temperature,
          maxOutputTokens: modelConfig?.maxTokens || DEFAULT_AI_CONFIG.maxTokens,
          topP: modelConfig?.topP,
          topK: modelConfig?.topK,
        },
      });

      const response = result.response;
      const text = response.text();

      // Extract token usage if available
      const tokensUsed = response.usageMetadata
        ? response.usageMetadata.totalTokenCount
        : undefined;

      return {
        text,
        tokensUsed,
      };
    } catch (error) {
      throw this.handleError(error as Error);
    }
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: Error): Error {
    const errorMessage = error.message.toLowerCase();

    // Authentication errors
    if (
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication')
    ) {
      return new AuthenticationError('gemini', error);
    }

    // Rate limit errors
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('429')
    ) {
      // Try to extract retry-after time if present
      const retryMatch = errorMessage.match(/retry after (\d+)/i);
      const retryAfterMs = retryMatch ? parseInt(retryMatch[1]) * 1000 : undefined;
      return new RateLimitError('gemini', retryAfterMs, error);
    }

    // Service unavailable errors
    if (
      errorMessage.includes('503') ||
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('temporarily unavailable')
    ) {
      return new ServiceDownError('gemini', 503, error);
    }

    // If it's already our custom error, return it
    if (error instanceof AIServiceError) {
      return error;
    }

    // Generic AI service error
    return new AIServiceError(
      `Gemini API error: ${error.message}`,
      'gemini',
      undefined,
      error
    );
  }
}

/**
 * Create singleton instance with default configuration
 */
let geminiInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiInstance) {
    geminiInstance = new GeminiService();
  }
  return geminiInstance;
}
