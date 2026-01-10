/**
 * OpenAI Service
 *
 * Fallback AI provider for donor intelligence and relationship analysis
 * Compatible interface with Gemini service for seamless fallback
 */

import OpenAI from 'openai';
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
  OpenAIResponse,
} from './types';
import {
  SYSTEM_PROMPT,
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
 * OpenAI Service Class
 */
export class OpenAIService {
  private client: OpenAI;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || DEFAULT_AI_CONFIG.openaiApiKey;

    if (!key) {
      throw new AuthenticationError('openai');
    }

    this.client = new OpenAI({ apiKey: key });
    this.modelName = modelName || DEFAULT_AI_CONFIG.openaiModel;
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
            this.generateCompletion(prompt),
            OPERATION_TIMEOUTS.donorIntelligence,
            'openai',
            operation
          ),
        'openai',
        operation
      );

      const parsedData = parseDonorIntelligence(response.text, 'openai');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'openai',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
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
            this.generateCompletion(prompt),
            OPERATION_TIMEOUTS.relationshipAnalysis,
            'openai',
            operation
          ),
        'openai',
        operation
      );

      const parsedData = parseRelationshipAnalysis(response.text, 'openai');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'openai',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
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
            this.generateCompletion(prompt),
            OPERATION_TIMEOUTS.engagementStrategy,
            'openai',
            operation
          ),
        'openai',
        operation
      );

      const parsedData = parseEngagementStrategy(response.text, 'openai');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'openai',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
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
            this.generateCompletion(prompt),
            OPERATION_TIMEOUTS.projectAlignment,
            'openai',
            operation
          ),
        'openai',
        operation
      );

      const parsedData = parseProjectAlignment(response.text, 'openai');
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
        operation,
        duration: latencyMs,
        success: true,
        tokenCount: response.tokensUsed,
        timestamp: new Date(),
      });

      return {
        data: parsedData,
        provider: 'openai',
        tokensUsed: response.tokensUsed,
        requestId,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logAIOperation({
        service: 'openai',
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
   * Low-level completion generation
   */
  private async generateCompletion(userPrompt: string): Promise<OpenAIResponse> {
    try {
      const modelConfig = getModelConfig('openai', this.modelName);

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: modelConfig?.temperature || DEFAULT_AI_CONFIG.temperature,
        max_tokens: modelConfig?.maxTokens || DEFAULT_AI_CONFIG.maxTokens,
        top_p: modelConfig?.topP,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens;

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
    // OpenAI SDK throws specific error types
    const errorMessage = error.message.toLowerCase();
    const anyError = error as any;

    // Authentication errors
    if (
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      anyError.status === 401
    ) {
      return new AuthenticationError('openai', error);
    }

    // Rate limit errors
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      anyError.status === 429
    ) {
      // Extract retry-after header if present
      const retryAfter = anyError.headers?.['retry-after'];
      const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
      return new RateLimitError('openai', retryAfterMs, error);
    }

    // Service unavailable errors
    if (
      errorMessage.includes('503') ||
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('temporarily unavailable') ||
      anyError.status === 503 ||
      anyError.status === 500
    ) {
      return new ServiceDownError('openai', anyError.status, error);
    }

    // If it's already our custom error, return it
    if (error instanceof AIServiceError) {
      return error;
    }

    // Generic AI service error
    return new AIServiceError(
      `OpenAI API error: ${error.message}`,
      'openai',
      undefined,
      error
    );
  }
}

/**
 * Create singleton instance with default configuration
 */
let openaiInstance: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
  if (!openaiInstance) {
    openaiInstance = new OpenAIService();
  }
  return openaiInstance;
}
