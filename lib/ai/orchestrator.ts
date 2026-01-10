/**
 * AI Service Orchestrator
 *
 * Central coordinator for AI operations with automatic fallback
 * between Gemini (primary) and OpenAI (fallback) providers
 */

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
} from './types';
import { GeminiService, getGeminiService } from './gemini';
import { OpenAIService, getOpenAIService } from './openai';
import { shouldFallbackToAlternateProvider, formatErrorMessage } from './errors';
import { enableVerboseLogging } from './config';

/**
 * AI Orchestrator Class
 *
 * Manages AI operations with automatic fallback logic
 */
export class AIOrchestrator {
  private gemini: GeminiService;
  private openai: OpenAIService;

  constructor(gemini?: GeminiService, openai?: OpenAIService) {
    this.gemini = gemini || getGeminiService();
    this.openai = openai || getOpenAIService();
  }

  /**
   * Generate donor intelligence with fallback
   */
  async generateDonorIntelligence(
    request: DonorIntelligenceRequest
  ): Promise<AIResponse<DonorIntelligence>> {
    return this.executeWithFallback(
      'generateDonorIntelligence',
      () => this.gemini.generateDonorIntelligence(request),
      () => this.openai.generateDonorIntelligence(request)
    );
  }

  /**
   * Analyze relationships with fallback
   */
  async analyzeRelationships(
    request: RelationshipAnalysisRequest
  ): Promise<AIResponse<RelationshipAnalysis>> {
    return this.executeWithFallback(
      'analyzeRelationships',
      () => this.gemini.analyzeRelationships(request),
      () => this.openai.analyzeRelationships(request)
    );
  }

  /**
   * Generate engagement strategy with fallback
   */
  async generateEngagementStrategy(
    request: EngagementStrategyRequest
  ): Promise<AIResponse<EngagementStrategy>> {
    return this.executeWithFallback(
      'generateEngagementStrategy',
      () => this.gemini.generateEngagementStrategy(request),
      () => this.openai.generateEngagementStrategy(request)
    );
  }

  /**
   * Analyze project alignment with fallback
   */
  async analyzeProjectAlignment(
    request: ProjectAlignmentRequest
  ): Promise<AIResponse<ProjectAlignment>> {
    return this.executeWithFallback(
      'analyzeProjectAlignment',
      () => this.gemini.analyzeProjectAlignment(request),
      () => this.openai.analyzeProjectAlignment(request)
    );
  }

  /**
   * Execute operation with automatic fallback to secondary provider
   */
  private async executeWithFallback<T>(
    operationName: string,
    primaryOperation: () => Promise<AIResponse<T>>,
    fallbackOperation: () => Promise<AIResponse<T>>
  ): Promise<AIResponse<T>> {
    try {
      // Try primary provider (Gemini)
      if (enableVerboseLogging) {
        console.log(`[AI Orchestrator] Executing ${operationName} with Gemini (primary)`);
      }

      const result = await primaryOperation();

      if (enableVerboseLogging) {
        console.log(
          `[AI Orchestrator] ${operationName} succeeded with Gemini ` +
          `(${result.latencyMs}ms, ${result.tokensUsed || 'unknown'} tokens)`
        );
      }

      return result;
    } catch (primaryError) {
      const error = primaryError as Error;

      // Log primary provider failure
      console.warn(
        `[AI Orchestrator] ${operationName} failed on Gemini: ${formatErrorMessage(error)}`
      );

      // Check if we should fallback to secondary provider
      if (!shouldFallbackToAlternateProvider(error)) {
        console.error(
          `[AI Orchestrator] Error is not retryable, not attempting fallback`
        );
        throw error;
      }

      try {
        // Fallback to secondary provider (OpenAI)
        console.log(
          `[AI Orchestrator] Falling back to OpenAI for ${operationName}`
        );

        const fallbackResult = await fallbackOperation();

        console.log(
          `[AI Orchestrator] ${operationName} succeeded with OpenAI fallback ` +
          `(${fallbackResult.latencyMs}ms, ${fallbackResult.tokensUsed || 'unknown'} tokens)`
        );

        return fallbackResult;
      } catch (fallbackError) {
        // Both providers failed
        console.error(
          `[AI Orchestrator] ${operationName} failed on both providers. ` +
          `Gemini: ${formatErrorMessage(error)}, ` +
          `OpenAI: ${formatErrorMessage(fallbackError as Error)}`
        );

        // Throw the original error from primary provider
        throw error;
      }
    }
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{
    gemini: { available: boolean; error?: string };
    openai: { available: boolean; error?: string };
  }> {
    const testRequest: DonorIntelligenceRequest = {
      name: 'Test User',
      location: 'Test Location',
    };

    const results = {
      gemini: { available: false, error: undefined as string | undefined },
      openai: { available: false, error: undefined as string | undefined },
    };

    // Test Gemini
    try {
      await this.gemini.generateDonorIntelligence(testRequest);
      results.gemini.available = true;
    } catch (error) {
      results.gemini.error = (error as Error).message;
    }

    // Test OpenAI
    try {
      await this.openai.generateDonorIntelligence(testRequest);
      results.openai.available = true;
    } catch (error) {
      results.openai.error = (error as Error).message;
    }

    return results;
  }
}

/**
 * Create singleton orchestrator instance
 */
let orchestratorInstance: AIOrchestrator | null = null;

export function getAIOrchestrator(): AIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AIOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Convenience functions for direct use
 */
export const aiService = {
  /**
   * Generate comprehensive donor intelligence
   */
  generateDonorIntelligence: (request: DonorIntelligenceRequest) =>
    getAIOrchestrator().generateDonorIntelligence(request),

  /**
   * Analyze relationship strength and warm paths
   */
  analyzeRelationships: (request: RelationshipAnalysisRequest) =>
    getAIOrchestrator().analyzeRelationships(request),

  /**
   * Generate personalized engagement strategy
   */
  generateEngagementStrategy: (request: EngagementStrategyRequest) =>
    getAIOrchestrator().generateEngagementStrategy(request),

  /**
   * Analyze project-donor alignment
   */
  analyzeProjectAlignment: (request: ProjectAlignmentRequest) =>
    getAIOrchestrator().analyzeProjectAlignment(request),

  /**
   * Check health of AI services
   */
  healthCheck: () => getAIOrchestrator().healthCheck(),
};
