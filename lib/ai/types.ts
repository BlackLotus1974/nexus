/**
 * TypeScript Types and Interfaces for AI Service Integration
 *
 * Defines all data structures used across the AI service layer
 */

// ============================================================================
// Donor Intelligence Types
// ============================================================================

export interface DonorIntelligence {
  summary: string;
  keyInsights: string[];
  givingCapacity: 'high' | 'medium' | 'low' | 'unknown';
  preferredCauses: string[];
  connectionPoints: ConnectionPoint[];
  recommendedApproach: string;
  confidence: number; // 0.0 - 1.0
  dataSources: string[];
  geographicConnections?: string[];
  israeliConnections?: string[];
  estimatedCapacity?: string;
  philanthropicHistory?: string[];
}

export interface ConnectionPoint {
  type: 'shared_interest' | 'location' | 'network' | 'cause' | 'organization' | 'other';
  description: string;
  strength: number; // 1-10
}

// ============================================================================
// Relationship Analysis Types
// ============================================================================

export interface RelationshipAnalysis {
  connectionStrength: number; // 1-10
  relationshipType: 'direct' | 'indirect' | 'potential' | 'none';
  warmPathRecommendations: WarmPathRecommendation[];
  introductionStrategies: IntroductionStrategy[];
  communicationPatterns?: CommunicationPattern;
  confidence: number; // 0.0 - 1.0
}

export interface WarmPathRecommendation {
  path: string[];
  strength: number; // 1-10
  description: string;
  suggestedApproach: string;
}

export interface IntroductionStrategy {
  approach: string;
  timing: string;
  talking_points: string[];
  confidence: number;
}

export interface CommunicationPattern {
  frequency: 'high' | 'medium' | 'low' | 'none';
  lastContact?: string;
  responsiveness: 'high' | 'medium' | 'low' | 'unknown';
  preferredChannel?: 'email' | 'phone' | 'linkedin' | 'in-person';
}

// ============================================================================
// Engagement Strategy Types
// ============================================================================

export interface EngagementStrategy {
  recommendedApproach: 'email' | 'call' | 'event' | 'linkedin' | 'in-person';
  timing: TimingRecommendation;
  messagingTone: 'formal' | 'casual' | 'professional' | 'personal';
  talkingPoints: string[];
  followUpCadence: FollowUpCadence;
  emailTemplate?: EmailTemplate;
  pitchRecommendations: string[];
  confidence: number; // 0.0 - 1.0
}

export interface TimingRecommendation {
  bestTimeframe: string;
  dayOfWeek?: string;
  timeOfDay?: string;
  reasoning: string;
}

export interface FollowUpCadence {
  initialFollowUp: string;
  subsequentFollowUps: string[];
  maxFollowUps: number;
}

export interface EmailTemplate {
  subject: string;
  greeting: string;
  opening: string;
  body: string;
  closing: string;
  signature: string;
}

// ============================================================================
// Project Alignment Types
// ============================================================================

export interface ProjectAlignment {
  alignmentScore: number; // 0.0 - 1.0
  connectionPoints: string[];
  pitchRecommendations: string[];
  potentialConcerns: string[];
  strengths: string[];
  confidence: number; // 0.0 - 1.0
}

// ============================================================================
// AI Service Configuration
// ============================================================================

export interface AIServiceConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  geminiModel?: string;
  openaiModel?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ============================================================================
// AI Request/Response Types
// ============================================================================

export interface AIResponse<T> {
  data: T;
  provider: 'gemini' | 'openai';
  tokensUsed?: number;
  requestId?: string;
  latencyMs: number;
  timestamp: Date;
}

export interface DonorIntelligenceRequest {
  name: string;
  location?: string;
  context?: string;
  organizationContext?: string;
}

export interface RelationshipAnalysisRequest {
  donorData: any;
  emailData?: any;
  linkedinData?: any;
  organizationContext?: string;
}

export interface EngagementStrategyRequest {
  donorData: any;
  projectData: any;
  relationshipData?: any;
  organizationContext?: string;
}

export interface ProjectAlignmentRequest {
  donorIntelligence: DonorIntelligence;
  projectDetails: any;
  organizationContext?: string;
}

// ============================================================================
// Logging and Monitoring Types
// ============================================================================

export interface AIOperationLog {
  service: 'gemini' | 'openai';
  operation: string;
  duration: number;
  success: boolean;
  tokenCount?: number;
  errorType?: string;
  timestamp: Date;
}

// ============================================================================
// Internal AI Provider Response Types
// ============================================================================

export interface GeminiResponse {
  text: string;
  tokensUsed?: number;
}

export interface OpenAIResponse {
  text: string;
  tokensUsed?: number;
}
