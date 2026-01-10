/**
 * AI Service for Deno Edge Functions
 *
 * This module wraps the AI orchestrator for use in Supabase Edge Functions
 * running on Deno runtime. It handles environment variable access and
 * provides a simplified interface for AI operations.
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import OpenAI from "npm:openai@4.67.3";

// ============================================================================
// Types (Duplicated from lib/ai/types.ts for Deno environment)
// ============================================================================

export interface DonorIntelligence {
  summary: string;
  keyInsights: string[];
  givingCapacity: 'high' | 'medium' | 'low' | 'unknown';
  preferredCauses: string[];
  connectionPoints: ConnectionPoint[];
  recommendedApproach: string;
  confidence: number;
  dataSources: string[];
  geographicConnections?: string[];
  israeliConnections?: string[];
  estimatedCapacity?: string;
  philanthropicHistory?: string[];
}

export interface ConnectionPoint {
  type: 'shared_interest' | 'location' | 'network' | 'cause' | 'organization' | 'other';
  description: string;
  strength: number;
}

export interface DonorIntelligenceRequest {
  name: string;
  location?: string;
  context?: string;
  organizationContext?: string;
}

export interface AIResponse<T> {
  data: T;
  provider: 'gemini' | 'openai';
  tokensUsed?: number;
  requestId?: string;
  latencyMs: number;
  timestamp: Date;
}

// ============================================================================
// Prompts
// ============================================================================

function buildDonorIntelligencePrompt(request: DonorIntelligenceRequest): string {
  return `You are an AI research assistant for a nonprofit fundraising platform. Generate comprehensive donor intelligence for the following individual.

**Donor Information:**
- Name: ${request.name}
${request.location ? `- Location: ${request.location}` : ''}
${request.context ? `- Additional Context: ${request.context}` : ''}
${request.organizationContext ? `- Organization Context: ${request.organizationContext}` : ''}

**Instructions:**
1. Provide a comprehensive intelligence brief based on publicly available information
2. Focus on philanthropic interests, giving capacity, and connection points
3. Give special attention to Israeli and Jewish causes if relevant
4. Include geographic connections to Israel if applicable
5. Estimate giving capacity based on available data
6. Suggest personalized engagement approaches

**Required Output Format (JSON):**
{
  "summary": "Brief 2-3 sentence overview",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "givingCapacity": "high|medium|low|unknown",
  "estimatedCapacity": "Specific amount range or description",
  "preferredCauses": ["cause 1", "cause 2"],
  "connectionPoints": [
    {
      "type": "location|network|cause|organization|shared_interest|other",
      "description": "Description of connection",
      "strength": 8
    }
  ],
  "geographicConnections": ["Israel", "Other locations"],
  "israeliConnections": ["Specific Israeli organizations or causes"],
  "philanthropicHistory": ["Past donation 1", "Past donation 2"],
  "recommendedApproach": "Detailed engagement strategy",
  "confidence": 0.85,
  "dataSources": ["source 1", "source 2"]
}

Please respond ONLY with valid JSON. No markdown, no explanations, just the JSON object.`;
}

// ============================================================================
// AI Service Implementation
// ============================================================================

export class AIService {
  private geminiApiKey: string;
  private openaiApiKey: string;
  private geminiClient: GoogleGenerativeAI | null = null;
  private openaiClient: OpenAI | null = null;

  constructor(geminiApiKey: string, openaiApiKey: string) {
    this.geminiApiKey = geminiApiKey;
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Initialize Gemini client
   */
  private getGeminiClient(): GoogleGenerativeAI {
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenerativeAI(this.geminiApiKey);
    }
    return this.geminiClient;
  }

  /**
   * Initialize OpenAI client
   */
  private getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: this.openaiApiKey,
      });
    }
    return this.openaiClient;
  }

  /**
   * Generate donor intelligence with automatic fallback
   */
  async generateDonorIntelligence(
    request: DonorIntelligenceRequest
  ): Promise<AIResponse<DonorIntelligence>> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Try Gemini first
      console.log('[AI Service] Attempting Gemini API...');
      const result = await this.generateWithGemini(request);

      return {
        data: result,
        provider: 'gemini',
        requestId,
        latencyMs: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (geminiError) {
      console.warn('[AI Service] Gemini failed, falling back to OpenAI:', geminiError);

      try {
        // Fallback to OpenAI
        const result = await this.generateWithOpenAI(request);

        return {
          data: result,
          provider: 'openai',
          requestId,
          latencyMs: Date.now() - startTime,
          timestamp: new Date(),
        };
      } catch (openaiError) {
        console.error('[AI Service] Both providers failed');
        throw new Error(`AI generation failed: ${(geminiError as Error).message}`);
      }
    }
  }

  /**
   * Generate using Gemini API
   */
  private async generateWithGemini(
    request: DonorIntelligenceRequest
  ): Promise<DonorIntelligence> {
    const genAI = this.getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = buildDonorIntelligencePrompt(request);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return this.parseIntelligenceResponse(text, 'gemini');
  }

  /**
   * Generate using OpenAI API
   */
  private async generateWithOpenAI(
    request: DonorIntelligenceRequest
  ): Promise<DonorIntelligence> {
    const openai = this.getOpenAIClient();

    const prompt = buildDonorIntelligencePrompt(request);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an AI research assistant for nonprofit fundraising. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content || '';
    return this.parseIntelligenceResponse(text, 'openai');
  }

  /**
   * Parse AI response into DonorIntelligence structure
   */
  private parseIntelligenceResponse(
    text: string,
    provider: 'gemini' | 'openai'
  ): DonorIntelligence {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanText);

      // Validate required fields
      if (!parsed.summary || !Array.isArray(parsed.keyInsights)) {
        throw new Error('Invalid response structure from AI');
      }

      return parsed as DonorIntelligence;
    } catch (error) {
      console.error(`[AI Service] Failed to parse ${provider} response:`, error);
      console.error('[AI Service] Raw text:', text);

      // Return fallback structure
      return {
        summary: `Unable to generate detailed intelligence for this donor. Raw data available.`,
        keyInsights: ['Analysis incomplete - please try again'],
        givingCapacity: 'unknown',
        preferredCauses: [],
        connectionPoints: [],
        recommendedApproach: 'Conduct manual research before engagement',
        confidence: 0,
        dataSources: ['AI analysis failed'],
      };
    }
  }
}

/**
 * Create AI service instance from environment variables
 */
export function createAIService(): AIService {
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!geminiApiKey || !openaiApiKey) {
    throw new Error(
      'Missing required environment variables: GOOGLE_GEMINI_API_KEY and OPENAI_API_KEY'
    );
  }

  return new AIService(geminiApiKey, openaiApiKey);
}
