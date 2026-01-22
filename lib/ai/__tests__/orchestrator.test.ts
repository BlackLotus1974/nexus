/**
 * Tests for AI Orchestrator
 */

import { AIOrchestrator } from '../orchestrator';
import type { AIResponse, DonorIntelligence, DonorIntelligenceRequest } from '../types';
import { RateLimitError, ServiceDownError, TimeoutError, AuthenticationError } from '../errors';

// Mock the Gemini and OpenAI services
const createMockGeminiService = () => ({
  generateDonorIntelligence: jest.fn(),
  analyzeRelationships: jest.fn(),
  generateEngagementStrategy: jest.fn(),
  analyzeProjectAlignment: jest.fn(),
});

const createMockOpenAIService = () => ({
  generateDonorIntelligence: jest.fn(),
  analyzeRelationships: jest.fn(),
  generateEngagementStrategy: jest.fn(),
  analyzeProjectAlignment: jest.fn(),
});

// Mock successful AI response
const createMockAIResponse = <T>(data: T): AIResponse<T> => ({
  success: true,
  data,
  provider: 'gemini',
  latencyMs: 500,
  tokensUsed: 100,
});

// Mock donor intelligence response
const mockDonorIntelligence: DonorIntelligence = {
  summary: 'John Doe is a tech entrepreneur with a strong philanthropic history.',
  background: {
    professional: 'CEO of TechCorp, 20 years in technology sector',
    education: 'MBA from Stanford, BS in Computer Science from MIT',
    philanthropy: 'Board member at several nonprofits',
  },
  interests: ['technology', 'education', 'healthcare'],
  givingCapacity: {
    estimated: 'high',
    confidence: 0.8,
    factors: ['Successful exit', 'Multiple board positions'],
  },
  connections: [
    {
      name: 'Jane Smith',
      relationship: 'Business Partner',
      strength: 0.8,
    },
  ],
  engagementSuggestions: [
    'Invite to technology education event',
    'Connect with board members in healthcare',
  ],
  riskFactors: ['May prefer to give anonymously'],
  confidence: 0.85,
};

describe('AIOrchestrator', () => {
  let mockGemini: ReturnType<typeof createMockGeminiService>;
  let mockOpenAI: ReturnType<typeof createMockOpenAIService>;
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGemini = createMockGeminiService();
    mockOpenAI = createMockOpenAIService();
    orchestrator = new AIOrchestrator(mockGemini as any, mockOpenAI as any);
  });

  describe('generateDonorIntelligence', () => {
    const request: DonorIntelligenceRequest = {
      name: 'John Doe',
      location: 'New York, NY',
      additionalContext: 'Tech entrepreneur',
    };

    it('should use Gemini as primary provider', async () => {
      const expectedResponse = createMockAIResponse(mockDonorIntelligence);
      mockGemini.generateDonorIntelligence.mockResolvedValue(expectedResponse);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(mockGemini.generateDonorIntelligence).toHaveBeenCalledWith(request);
      expect(mockOpenAI.generateDonorIntelligence).not.toHaveBeenCalled();
      expect(result).toBe(expectedResponse);
    });

    it('should fallback to OpenAI when Gemini fails with retryable error', async () => {
      const retryableError = new RateLimitError('gemini', 5000);
      mockGemini.generateDonorIntelligence.mockRejectedValue(retryableError);

      const fallbackResponse = createMockAIResponse(mockDonorIntelligence);
      fallbackResponse.provider = 'openai';
      mockOpenAI.generateDonorIntelligence.mockResolvedValue(fallbackResponse);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(mockGemini.generateDonorIntelligence).toHaveBeenCalled();
      expect(mockOpenAI.generateDonorIntelligence).toHaveBeenCalled();
      expect(result.provider).toBe('openai');
    });

    it('should not fallback when Gemini fails with non-retryable error', async () => {
      const nonRetryableError = new Error('Invalid API key');
      (nonRetryableError as any).code = 'INVALID_API_KEY';
      mockGemini.generateDonorIntelligence.mockRejectedValue(nonRetryableError);

      await expect(orchestrator.generateDonorIntelligence(request)).rejects.toThrow(
        'Invalid API key'
      );

      expect(mockGemini.generateDonorIntelligence).toHaveBeenCalled();
      // OpenAI should not be called for non-retryable errors
    });

    it('should throw original error when both providers fail', async () => {
      // Use a retryable error for Gemini so fallback is attempted
      const geminiError = new ServiceDownError('gemini', 503);
      mockGemini.generateDonorIntelligence.mockRejectedValue(geminiError);

      const openaiError = new Error('OpenAI unavailable');
      mockOpenAI.generateDonorIntelligence.mockRejectedValue(openaiError);

      await expect(orchestrator.generateDonorIntelligence(request)).rejects.toThrow(
        'AI service gemini is currently unavailable'
      );

      expect(mockGemini.generateDonorIntelligence).toHaveBeenCalled();
      expect(mockOpenAI.generateDonorIntelligence).toHaveBeenCalled();
    });
  });

  describe('analyzeRelationships', () => {
    const request = {
      donorId: 'donor-123',
      relationships: [
        { name: 'Jane Smith', type: 'professional', source: 'linkedin' },
      ],
    };

    it('should call Gemini for relationship analysis', async () => {
      const mockResponse = createMockAIResponse({
        relationships: [],
        warmPaths: [],
        recommendations: [],
      });
      mockGemini.analyzeRelationships.mockResolvedValue(mockResponse);

      await orchestrator.analyzeRelationships(request as any);

      expect(mockGemini.analyzeRelationships).toHaveBeenCalledWith(request);
    });
  });

  describe('generateEngagementStrategy', () => {
    const request = {
      donorId: 'donor-123',
      projectId: 'project-456',
      context: 'Initial outreach',
    };

    it('should call Gemini for engagement strategy', async () => {
      const mockResponse = createMockAIResponse({
        approach: 'personalized',
        timing: 'next week',
        channels: ['email', 'phone'],
        talkingPoints: [],
        risks: [],
      });
      mockGemini.generateEngagementStrategy.mockResolvedValue(mockResponse);

      await orchestrator.generateEngagementStrategy(request as any);

      expect(mockGemini.generateEngagementStrategy).toHaveBeenCalledWith(request);
    });
  });

  describe('analyzeProjectAlignment', () => {
    const request = {
      donorId: 'donor-123',
      projectId: 'project-456',
    };

    it('should call Gemini for project alignment analysis', async () => {
      const mockResponse = createMockAIResponse({
        alignmentScore: 0.85,
        matchingInterests: ['education', 'technology'],
        potentialConcerns: [],
        recommendations: [],
      });
      mockGemini.analyzeProjectAlignment.mockResolvedValue(mockResponse);

      await orchestrator.analyzeProjectAlignment(request as any);

      expect(mockGemini.analyzeProjectAlignment).toHaveBeenCalledWith(request);
    });
  });

  describe('healthCheck', () => {
    it('should return status of both providers', async () => {
      mockGemini.generateDonorIntelligence.mockResolvedValue(
        createMockAIResponse(mockDonorIntelligence)
      );
      mockOpenAI.generateDonorIntelligence.mockResolvedValue(
        createMockAIResponse(mockDonorIntelligence)
      );

      const result = await orchestrator.healthCheck();

      expect(result.gemini.available).toBe(true);
      expect(result.gemini.error).toBeUndefined();
      expect(result.openai.available).toBe(true);
      expect(result.openai.error).toBeUndefined();
    });

    it('should report errors for unavailable providers', async () => {
      mockGemini.generateDonorIntelligence.mockRejectedValue(
        new Error('Gemini API key invalid')
      );
      mockOpenAI.generateDonorIntelligence.mockRejectedValue(
        new Error('OpenAI API key invalid')
      );

      const result = await orchestrator.healthCheck();

      expect(result.gemini.available).toBe(false);
      expect(result.gemini.error).toBe('Gemini API key invalid');
      expect(result.openai.available).toBe(false);
      expect(result.openai.error).toBe('OpenAI API key invalid');
    });

    it('should handle mixed availability', async () => {
      mockGemini.generateDonorIntelligence.mockResolvedValue(
        createMockAIResponse(mockDonorIntelligence)
      );
      mockOpenAI.generateDonorIntelligence.mockRejectedValue(
        new Error('OpenAI unavailable')
      );

      const result = await orchestrator.healthCheck();

      expect(result.gemini.available).toBe(true);
      expect(result.openai.available).toBe(false);
      expect(result.openai.error).toBe('OpenAI unavailable');
    });
  });
});

describe('AIOrchestrator Fallback Logic', () => {
  let mockGemini: ReturnType<typeof createMockGeminiService>;
  let mockOpenAI: ReturnType<typeof createMockOpenAIService>;
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGemini = createMockGeminiService();
    mockOpenAI = createMockOpenAIService();
    orchestrator = new AIOrchestrator(mockGemini as any, mockOpenAI as any);
  });

  const request: DonorIntelligenceRequest = {
    name: 'Test User',
    location: 'Test Location',
  };

  describe('retryable errors', () => {
    it('should fallback for RateLimitError', async () => {
      const error = new RateLimitError('gemini', 5000);
      mockGemini.generateDonorIntelligence.mockRejectedValue(error);

      const fallbackResponse = createMockAIResponse(mockDonorIntelligence);
      mockOpenAI.generateDonorIntelligence.mockResolvedValue(fallbackResponse);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(mockOpenAI.generateDonorIntelligence).toHaveBeenCalled();
      expect(result).toBe(fallbackResponse);
    });

    it('should fallback for ServiceDownError', async () => {
      const error = new ServiceDownError('gemini', 503);
      mockGemini.generateDonorIntelligence.mockRejectedValue(error);

      const fallbackResponse = createMockAIResponse(mockDonorIntelligence);
      mockOpenAI.generateDonorIntelligence.mockResolvedValue(fallbackResponse);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(mockOpenAI.generateDonorIntelligence).toHaveBeenCalled();
      expect(result).toBe(fallbackResponse);
    });

    it('should fallback for TimeoutError', async () => {
      const error = new TimeoutError('gemini', 'generateDonorIntelligence', 30000);
      mockGemini.generateDonorIntelligence.mockRejectedValue(error);

      const fallbackResponse = createMockAIResponse(mockDonorIntelligence);
      mockOpenAI.generateDonorIntelligence.mockResolvedValue(fallbackResponse);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(mockOpenAI.generateDonorIntelligence).toHaveBeenCalled();
      expect(result).toBe(fallbackResponse);
    });

    it('should fallback for AuthenticationError', async () => {
      const error = new AuthenticationError('gemini');
      mockGemini.generateDonorIntelligence.mockRejectedValue(error);

      const fallbackResponse = createMockAIResponse(mockDonorIntelligence);
      mockOpenAI.generateDonorIntelligence.mockResolvedValue(fallbackResponse);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(mockOpenAI.generateDonorIntelligence).toHaveBeenCalled();
      expect(result).toBe(fallbackResponse);
    });
  });

  describe('response timing', () => {
    it('should include latency in response', async () => {
      const response = createMockAIResponse(mockDonorIntelligence);
      response.latencyMs = 750;
      mockGemini.generateDonorIntelligence.mockResolvedValue(response);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(result.latencyMs).toBe(750);
    });

    it('should include token usage in response', async () => {
      const response = createMockAIResponse(mockDonorIntelligence);
      response.tokensUsed = 1500;
      mockGemini.generateDonorIntelligence.mockResolvedValue(response);

      const result = await orchestrator.generateDonorIntelligence(request);

      expect(result.tokensUsed).toBe(1500);
    });
  });
});
