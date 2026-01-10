/**
 * AI Response Parser
 *
 * Parses and validates AI responses into typed data structures
 * Handles malformed responses and provides sensible defaults
 */

import {
  DonorIntelligence,
  RelationshipAnalysis,
  EngagementStrategy,
  ProjectAlignment,
  ConnectionPoint,
} from './types';
import { InvalidResponseError } from './errors';
import { extractJSON } from './prompts';
import {
  isValidJSON,
  normalizeConfidence,
  validateResponseFields,
} from './utils';

/**
 * Parse donor intelligence response
 */
export function parseDonorIntelligence(
  rawResponse: string,
  provider: 'gemini' | 'openai'
): DonorIntelligence {
  try {
    const jsonText = extractJSON(rawResponse);

    if (!isValidJSON(jsonText)) {
      throw new InvalidResponseError(provider, rawResponse);
    }

    const data = JSON.parse(jsonText);

    // Validate required fields
    const requiredFields: (keyof DonorIntelligence)[] = [
      'summary',
      'keyInsights',
      'givingCapacity',
      'preferredCauses',
      'connectionPoints',
      'recommendedApproach',
      'confidence',
      'dataSources',
    ];

    if (!validateResponseFields<DonorIntelligence>(data, requiredFields)) {
      throw new InvalidResponseError(
        provider,
        `Missing required fields. Expected: ${requiredFields.join(', ')}`
      );
    }

    // Normalize and validate data
    return {
      summary: String(data.summary || ''),
      keyInsights: Array.isArray(data.keyInsights)
        ? data.keyInsights.map(String)
        : [],
      givingCapacity: validateGivingCapacity(data.givingCapacity),
      preferredCauses: Array.isArray(data.preferredCauses)
        ? data.preferredCauses.map(String)
        : [],
      connectionPoints: parseConnectionPoints(data.connectionPoints),
      recommendedApproach: String(data.recommendedApproach || ''),
      confidence: normalizeConfidence(data.confidence),
      dataSources: Array.isArray(data.dataSources)
        ? data.dataSources.map(String)
        : [],
      geographicConnections: Array.isArray(data.geographicConnections)
        ? data.geographicConnections.map(String)
        : undefined,
      israeliConnections: Array.isArray(data.israeliConnections)
        ? data.israeliConnections.map(String)
        : undefined,
      estimatedCapacity: data.estimatedCapacity
        ? String(data.estimatedCapacity)
        : undefined,
      philanthropicHistory: Array.isArray(data.philanthropicHistory)
        ? data.philanthropicHistory.map(String)
        : undefined,
    };
  } catch (error) {
    if (error instanceof InvalidResponseError) {
      throw error;
    }
    throw new InvalidResponseError(provider, rawResponse, error as Error);
  }
}

/**
 * Parse relationship analysis response
 */
export function parseRelationshipAnalysis(
  rawResponse: string,
  provider: 'gemini' | 'openai'
): RelationshipAnalysis {
  try {
    const jsonText = extractJSON(rawResponse);

    if (!isValidJSON(jsonText)) {
      throw new InvalidResponseError(provider, rawResponse);
    }

    const data = JSON.parse(jsonText);

    return {
      connectionStrength: validateStrength(data.connectionStrength),
      relationshipType: validateRelationshipType(data.relationshipType),
      warmPathRecommendations: Array.isArray(data.warmPathRecommendations)
        ? data.warmPathRecommendations.map(parseWarmPathRecommendation)
        : [],
      introductionStrategies: Array.isArray(data.introductionStrategies)
        ? data.introductionStrategies.map(parseIntroductionStrategy)
        : [],
      communicationPatterns: data.communicationPatterns
        ? parseCommunicationPatterns(data.communicationPatterns)
        : undefined,
      confidence: normalizeConfidence(data.confidence),
    };
  } catch (error) {
    if (error instanceof InvalidResponseError) {
      throw error;
    }
    throw new InvalidResponseError(provider, rawResponse, error as Error);
  }
}

/**
 * Parse engagement strategy response
 */
export function parseEngagementStrategy(
  rawResponse: string,
  provider: 'gemini' | 'openai'
): EngagementStrategy {
  try {
    const jsonText = extractJSON(rawResponse);

    if (!isValidJSON(jsonText)) {
      throw new InvalidResponseError(provider, rawResponse);
    }

    const data = JSON.parse(jsonText);

    return {
      recommendedApproach: validateApproach(data.recommendedApproach),
      timing: {
        bestTimeframe: String(data.timing?.bestTimeframe || 'Within 1-2 weeks'),
        dayOfWeek: data.timing?.dayOfWeek
          ? String(data.timing.dayOfWeek)
          : undefined,
        timeOfDay: data.timing?.timeOfDay
          ? String(data.timing.timeOfDay)
          : undefined,
        reasoning: String(data.timing?.reasoning || ''),
      },
      messagingTone: validateMessagingTone(data.messagingTone),
      talkingPoints: Array.isArray(data.talkingPoints)
        ? data.talkingPoints.map(String)
        : [],
      followUpCadence: {
        initialFollowUp: String(data.followUpCadence?.initialFollowUp || '1 week'),
        subsequentFollowUps: Array.isArray(data.followUpCadence?.subsequentFollowUps)
          ? data.followUpCadence.subsequentFollowUps.map(String)
          : ['2 weeks', '1 month'],
        maxFollowUps: Number(data.followUpCadence?.maxFollowUps) || 3,
      },
      emailTemplate: data.emailTemplate
        ? {
            subject: String(data.emailTemplate.subject || ''),
            greeting: String(data.emailTemplate.greeting || ''),
            opening: String(data.emailTemplate.opening || ''),
            body: String(data.emailTemplate.body || ''),
            closing: String(data.emailTemplate.closing || ''),
            signature: String(data.emailTemplate.signature || ''),
          }
        : undefined,
      pitchRecommendations: Array.isArray(data.pitchRecommendations)
        ? data.pitchRecommendations.map(String)
        : [],
      confidence: normalizeConfidence(data.confidence),
    };
  } catch (error) {
    if (error instanceof InvalidResponseError) {
      throw error;
    }
    throw new InvalidResponseError(provider, rawResponse, error as Error);
  }
}

/**
 * Parse project alignment response
 */
export function parseProjectAlignment(
  rawResponse: string,
  provider: 'gemini' | 'openai'
): ProjectAlignment {
  try {
    const jsonText = extractJSON(rawResponse);

    if (!isValidJSON(jsonText)) {
      throw new InvalidResponseError(provider, rawResponse);
    }

    const data = JSON.parse(jsonText);

    return {
      alignmentScore: normalizeConfidence(data.alignmentScore),
      connectionPoints: Array.isArray(data.connectionPoints)
        ? data.connectionPoints.map(String)
        : [],
      pitchRecommendations: Array.isArray(data.pitchRecommendations)
        ? data.pitchRecommendations.map(String)
        : [],
      potentialConcerns: Array.isArray(data.potentialConcerns)
        ? data.potentialConcerns.map(String)
        : [],
      strengths: Array.isArray(data.strengths)
        ? data.strengths.map(String)
        : [],
      confidence: normalizeConfidence(data.confidence),
    };
  } catch (error) {
    if (error instanceof InvalidResponseError) {
      throw error;
    }
    throw new InvalidResponseError(provider, rawResponse, error as Error);
  }
}

// ============================================================================
// Helper Validation Functions
// ============================================================================

function validateGivingCapacity(value: any): 'high' | 'medium' | 'low' | 'unknown' {
  const valid = ['high', 'medium', 'low', 'unknown'];
  return valid.includes(value) ? value : 'unknown';
}

function validateRelationshipType(
  value: any
): 'direct' | 'indirect' | 'potential' | 'none' {
  const valid = ['direct', 'indirect', 'potential', 'none'];
  return valid.includes(value) ? value : 'none';
}

function validateApproach(
  value: any
): 'email' | 'call' | 'event' | 'linkedin' | 'in-person' {
  const valid = ['email', 'call', 'event', 'linkedin', 'in-person'];
  return valid.includes(value) ? value : 'email';
}

function validateMessagingTone(
  value: any
): 'formal' | 'casual' | 'professional' | 'personal' {
  const valid = ['formal', 'casual', 'professional', 'personal'];
  return valid.includes(value) ? value : 'professional';
}

function validateStrength(value: any): number {
  const num = Number(value);
  if (isNaN(num)) return 5;
  return Math.max(1, Math.min(10, Math.round(num)));
}

function parseConnectionPoints(points: any[]): ConnectionPoint[] {
  if (!Array.isArray(points)) return [];

  return points.map((point) => ({
    type: validateConnectionType(point.type),
    description: String(point.description || ''),
    strength: validateStrength(point.strength),
  }));
}

function validateConnectionType(
  value: any
): 'shared_interest' | 'location' | 'network' | 'cause' | 'organization' | 'other' {
  const valid = ['shared_interest', 'location', 'network', 'cause', 'organization', 'other'];
  return valid.includes(value) ? value : 'other';
}

function parseWarmPathRecommendation(data: any) {
  return {
    path: Array.isArray(data.path) ? data.path.map(String) : [],
    strength: validateStrength(data.strength),
    description: String(data.description || ''),
    suggestedApproach: String(data.suggestedApproach || ''),
  };
}

function parseIntroductionStrategy(data: any) {
  return {
    approach: String(data.approach || ''),
    timing: String(data.timing || ''),
    talking_points: Array.isArray(data.talking_points)
      ? data.talking_points.map(String)
      : [],
    confidence: normalizeConfidence(data.confidence),
  };
}

function parseCommunicationPatterns(data: any) {
  return {
    frequency: validateFrequency(data.frequency),
    lastContact: data.lastContact ? String(data.lastContact) : undefined,
    responsiveness: validateResponsiveness(data.responsiveness),
    preferredChannel: validatePreferredChannel(data.preferredChannel),
  };
}

function validateFrequency(value: any): 'high' | 'medium' | 'low' | 'none' {
  const valid = ['high', 'medium', 'low', 'none'];
  return valid.includes(value) ? value : 'none';
}

function validateResponsiveness(value: any): 'high' | 'medium' | 'low' | 'unknown' {
  const valid = ['high', 'medium', 'low', 'unknown'];
  return valid.includes(value) ? value : 'unknown';
}

function validatePreferredChannel(
  value: any
): 'email' | 'phone' | 'linkedin' | 'in-person' | undefined {
  const valid = ['email', 'phone', 'linkedin', 'in-person'];
  return valid.includes(value) ? value : undefined;
}
