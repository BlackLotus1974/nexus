/**
 * AI Service Test Helpers
 *
 * Mock data and utilities for testing AI services
 * Useful for development and testing without consuming API credits
 */

import {
  DonorIntelligence,
  RelationshipAnalysis,
  EngagementStrategy,
  ProjectAlignment,
  AIResponse,
} from './types';

/**
 * Mock donor intelligence response
 */
export const mockDonorIntelligence: DonorIntelligence = {
  summary:
    'John Doe is a successful technology entrepreneur based in Silicon Valley with a demonstrated history of philanthropic engagement. He has previously donated to educational initiatives and technology-focused nonprofits. His estimated giving capacity is high based on his position as CEO of a mid-sized tech company and recent IPO.',
  keyInsights: [
    'Previously donated $100K+ to educational technology initiatives',
    'Strong interest in STEM education and youth development',
    'Active member of Tech Gives Back network',
    'Alumni of Stanford University - potential connection point',
  ],
  givingCapacity: 'high',
  preferredCauses: [
    'Education',
    'Technology for Social Good',
    'Youth Development',
    'STEM Programs',
  ],
  connectionPoints: [
    {
      type: 'shared_interest',
      description: 'Both organization and donor focus on technology education',
      strength: 9,
    },
    {
      type: 'network',
      description: 'Member of Tech Gives Back, which includes our board member Sarah Chen',
      strength: 7,
    },
    {
      type: 'location',
      description: 'Based in San Francisco Bay Area, same as organization headquarters',
      strength: 6,
    },
  ],
  recommendedApproach:
    'Initial email introduction highlighting tech education programs, followed by invitation to visit program site. Emphasize measurable impact and use of technology in curriculum delivery.',
  confidence: 0.85,
  dataSources: [
    'LinkedIn profile',
    'Company press releases',
    'Tech Gives Back member directory',
    'Public donation records',
  ],
  geographicConnections: ['San Francisco Bay Area', 'Silicon Valley'],
  israeliConnections: [],
  estimatedCapacity: '$50,000 - $250,000 annual giving capacity',
  philanthropicHistory: [
    'Donated to Code.org annual fundraiser 2022-2023',
    'Board member of Local STEM Foundation',
    'Sponsor of annual Tech for Good conference',
  ],
};

/**
 * Mock relationship analysis response
 */
export const mockRelationshipAnalysis: RelationshipAnalysis = {
  connectionStrength: 7,
  relationshipType: 'indirect',
  warmPathRecommendations: [
    {
      path: ['Sarah Chen (Board Member)', 'Tech Gives Back Network', 'John Doe'],
      strength: 8,
      description:
        'Sarah Chen is an active member of Tech Gives Back and likely knows John Doe through this network',
      suggestedApproach:
        'Ask Sarah for a warm introduction, emphasizing the alignment between our tech education programs and John\'s interests',
    },
    {
      path: ['Michael Rodriguez (Donor)', 'Stanford Alumni Network', 'John Doe'],
      strength: 6,
      description: 'Both attended Stanford University, graduated within 3 years of each other',
      suggestedApproach:
        'Leverage Stanford alumni connection through Michael for a mutual introduction',
    },
  ],
  introductionStrategies: [
    {
      approach:
        'Request Sarah Chen to make email introduction highlighting tech education program outcomes',
      timing: 'Within next 2 weeks, before end of quarter',
      talking_points: [
        'Shared passion for technology education',
        'Measurable impact metrics from recent programs',
        'Opportunity to visit program site',
        'Potential for deeper engagement through advisory role',
      ],
      confidence: 0.8,
    },
  ],
  communicationPatterns: {
    frequency: 'medium',
    lastContact: undefined,
    responsiveness: 'high',
    preferredChannel: 'email',
  },
  confidence: 0.75,
};

/**
 * Mock engagement strategy response
 */
export const mockEngagementStrategy: EngagementStrategy = {
  recommendedApproach: 'email',
  timing: {
    bestTimeframe: 'Tuesday or Wednesday morning, 9-11 AM PST',
    dayOfWeek: 'Tuesday or Wednesday',
    timeOfDay: '9-11 AM PST',
    reasoning:
      'Tech executives typically review strategic communications early in week, mornings before meetings start',
  },
  messagingTone: 'professional',
  talkingPoints: [
    'Alignment between tech education mission and donor\'s known interests',
    'Specific impact metrics: 500+ students reached, 85% program completion rate',
    'Use of innovative technology platform for curriculum delivery',
    'Opportunity for strategic involvement beyond financial support',
  ],
  followUpCadence: {
    initialFollowUp: '1 week after initial contact',
    subsequentFollowUps: ['2 weeks later if no response', '1 month final follow-up'],
    maxFollowUps: 3,
  },
  emailTemplate: {
    subject: 'Tech Education Impact: Partnership Opportunity for John',
    greeting: 'Hi John,',
    opening:
      'I hope this email finds you well. Sarah Chen mentioned your passion for technology education and suggested I reach out.',
    body:
      'We\'re making significant impact in tech education with 500+ students this year achieving 85% completion rates through our innovative curriculum platform. Given your background in technology and education philanthropy, I thought you might be interested in learning more about how we\'re preparing the next generation of tech leaders.\n\nWould you be open to a brief call or coffee to discuss potential partnership opportunities?',
    closing:
      'I\'d love to share our impact metrics and explore how your expertise could help us scale our programs.',
    signature: 'Best regards,\n[Your name]\n[Title]\n[Organization]',
  },
  pitchRecommendations: [
    'Lead with technology innovation and measurable outcomes',
    'Emphasize scalability and efficiency of programs',
    'Offer advisory or strategic role in addition to financial support',
    'Provide clear metrics and ROI on educational investment',
  ],
  confidence: 0.82,
};

/**
 * Mock project alignment response
 */
export const mockProjectAlignment: ProjectAlignment = {
  alignmentScore: 0.88,
  connectionPoints: [
    'Project focuses on STEM education, matching donor\'s primary interest area',
    'Technology-driven approach aligns with donor\'s professional background',
    'Geographic overlap: project serves Bay Area students',
    'Scalable model appeals to donor\'s entrepreneurial mindset',
  ],
  pitchRecommendations: [
    'Emphasize use of proprietary technology platform for curriculum delivery',
    'Highlight measurable outcomes and data-driven approach',
    'Offer opportunity to pilot new features or curriculum modules',
    'Present clear scaling plan with defined milestones',
  ],
  potentialConcerns: [
    'Donor may prefer early-stage innovation over established programs - address by highlighting new initiatives',
    'May want more direct involvement - offer advisory board seat or mentorship role',
  ],
  strengths: [
    'Perfect alignment with donor\'s stated cause interests',
    'Strong track record with measurable results',
    'Technology focus differentiates from traditional education nonprofits',
    'Existing warm connection through Sarah Chen',
  ],
  confidence: 0.85,
};

/**
 * Create mock AI response wrapper
 */
export function createMockAIResponse<T>(
  data: T,
  provider: 'gemini' | 'openai' = 'gemini'
): AIResponse<T> {
  return {
    data,
    provider,
    tokensUsed: 1500,
    requestId: `mock_${Date.now()}`,
    latencyMs: 2500,
    timestamp: new Date(),
  };
}

/**
 * Sample donor data for testing
 */
export const sampleDonorData = {
  name: 'John Doe',
  location: 'San Francisco, CA',
  context: 'Technology entrepreneur, interested in education',
  organizationContext: 'Tech education nonprofit serving Bay Area youth',
};

/**
 * Sample project data for testing
 */
export const sampleProjectData = {
  name: 'STEM Education Initiative 2024',
  description:
    'Comprehensive technology education program for underserved youth in the San Francisco Bay Area',
  budget: 250000,
  duration: '12 months',
  impactGoals: [
    'Reach 500 students',
    '85% program completion rate',
    'Prepare students for tech careers',
  ],
};

/**
 * Delay utility for simulating API latency in tests
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock AI service for testing (no API calls)
 */
export class MockAIService {
  async generateDonorIntelligence(
    request: any
  ): Promise<AIResponse<DonorIntelligence>> {
    await delay(500); // Simulate API latency
    return createMockAIResponse(mockDonorIntelligence);
  }

  async analyzeRelationships(
    request: any
  ): Promise<AIResponse<RelationshipAnalysis>> {
    await delay(400);
    return createMockAIResponse(mockRelationshipAnalysis);
  }

  async generateEngagementStrategy(
    request: any
  ): Promise<AIResponse<EngagementStrategy>> {
    await delay(350);
    return createMockAIResponse(mockEngagementStrategy);
  }

  async analyzeProjectAlignment(
    request: any
  ): Promise<AIResponse<ProjectAlignment>> {
    await delay(300);
    return createMockAIResponse(mockProjectAlignment);
  }
}
