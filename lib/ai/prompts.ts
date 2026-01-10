/**
 * AI Prompt Templates
 *
 * Structured prompts for different AI operations in the fundraising domain
 * Templates use variable substitution for dynamic content
 */

import {
  DonorIntelligenceRequest,
  RelationshipAnalysisRequest,
  EngagementStrategyRequest,
  ProjectAlignmentRequest,
} from './types';

/**
 * System prompt that sets context for all AI operations
 */
export const SYSTEM_PROMPT = `You are an expert fundraising research specialist and relationship strategist for non-profit organizations. Your role is to analyze donor information, identify connection opportunities, and provide actionable insights for fundraising professionals.

Key principles:
- Base all analysis on publicly available information and provided data
- Be explicit about confidence levels and data limitations
- Prioritize actionable, specific recommendations over generic advice
- Consider cultural sensitivity, especially for international donors
- Focus on relationship-building rather than transactional approaches
- Return responses in valid JSON format only`;

/**
 * Donor Intelligence Generation Prompt
 */
export function buildDonorIntelligencePrompt(
  request: DonorIntelligenceRequest
): string {
  const { name, location, context, organizationContext } = request;

  return `${SYSTEM_PROMPT}

TASK: Generate comprehensive donor intelligence profile

DONOR INFORMATION:
- Name: ${name}
- Location: ${location || 'Unknown'}
${context ? `- Additional Context: ${context}` : ''}
${organizationContext ? `- Organization Context: ${organizationContext}` : ''}

ANALYSIS REQUIREMENTS:
1. Background Research
   - Professional background and current position
   - Public information about wealth indicators
   - Known philanthropic activities

2. Giving Patterns
   - Historical giving (if publicly available)
   - Preferred causes and organizations
   - Giving capacity estimation (high/medium/low)

3. Connection Points
   - Shared interests with organization mission
   - Geographic connections
   - Network overlaps
   - Israeli connections (if relevant)

4. Engagement Strategy
   - Recommended initial approach
   - Key talking points
   - Potential concerns to address

OUTPUT FORMAT (strict JSON):
{
  "summary": "Comprehensive 2-3 paragraph overview of the donor",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "givingCapacity": "high" | "medium" | "low" | "unknown",
  "preferredCauses": ["cause 1", "cause 2"],
  "connectionPoints": [
    {
      "type": "shared_interest" | "location" | "network" | "cause" | "organization",
      "description": "Specific description of connection",
      "strength": 1-10
    }
  ],
  "recommendedApproach": "Detailed engagement strategy",
  "confidence": 0.0-1.0,
  "dataSources": ["source 1", "source 2"],
  "geographicConnections": ["connection 1"],
  "israeliConnections": ["connection 1"],
  "estimatedCapacity": "Specific capacity range or indicators",
  "philanthropicHistory": ["activity 1", "activity 2"]
}

IMPORTANT:
- Return ONLY valid JSON (no markdown, no code blocks)
- Be specific and actionable
- Indicate confidence levels honestly
- List all data sources used
- If information is unavailable, use "unknown" or empty arrays`;
}

/**
 * Relationship Analysis Prompt
 */
export function buildRelationshipAnalysisPrompt(
  request: RelationshipAnalysisRequest
): string {
  const { donorData, emailData, linkedinData, organizationContext } = request;

  return `${SYSTEM_PROMPT}

TASK: Analyze relationship strength and identify warm introduction paths

DONOR DATA:
${JSON.stringify(donorData, null, 2)}

${emailData ? `EMAIL INTERACTION DATA:\n${JSON.stringify(emailData, null, 2)}` : ''}

${linkedinData ? `LINKEDIN CONNECTION DATA:\n${JSON.stringify(linkedinData, null, 2)}` : ''}

${organizationContext ? `ORGANIZATION CONTEXT:\n${organizationContext}` : ''}

ANALYSIS REQUIREMENTS:
1. Connection Strength Assessment
   - Evaluate directness of connection (direct, indirect, potential, none)
   - Assess strength on 1-10 scale
   - Identify communication patterns

2. Warm Path Identification
   - Map potential introduction paths through mutual connections
   - Rank paths by strength and viability
   - Provide specific introduction strategies

3. Communication Insights
   - Analyze response patterns and frequency
   - Identify preferred communication channels
   - Suggest optimal timing for outreach

OUTPUT FORMAT (strict JSON):
{
  "connectionStrength": 1-10,
  "relationshipType": "direct" | "indirect" | "potential" | "none",
  "warmPathRecommendations": [
    {
      "path": ["Person A", "Person B", "Target Donor"],
      "strength": 1-10,
      "description": "Description of this connection path",
      "suggestedApproach": "How to leverage this path"
    }
  ],
  "introductionStrategies": [
    {
      "approach": "Specific introduction strategy",
      "timing": "Recommended timing",
      "talking_points": ["point 1", "point 2"],
      "confidence": 0.0-1.0
    }
  ],
  "communicationPatterns": {
    "frequency": "high" | "medium" | "low" | "none",
    "lastContact": "ISO date or null",
    "responsiveness": "high" | "medium" | "low" | "unknown",
    "preferredChannel": "email" | "phone" | "linkedin" | "in-person"
  },
  "confidence": 0.0-1.0
}

IMPORTANT:
- Return ONLY valid JSON (no markdown, no code blocks)
- Base paths on actual data provided
- Be realistic about connection strength
- Prioritize warmest paths first`;
}

/**
 * Engagement Strategy Generation Prompt
 */
export function buildEngagementStrategyPrompt(
  request: EngagementStrategyRequest
): string {
  const { donorData, projectData, relationshipData, organizationContext } = request;

  return `${SYSTEM_PROMPT}

TASK: Generate personalized donor engagement strategy

DONOR PROFILE:
${JSON.stringify(donorData, null, 2)}

PROJECT DETAILS:
${JSON.stringify(projectData, null, 2)}

${relationshipData ? `RELATIONSHIP DATA:\n${JSON.stringify(relationshipData, null, 2)}` : ''}

${organizationContext ? `ORGANIZATION CONTEXT:\n${organizationContext}` : ''}

STRATEGY REQUIREMENTS:
1. Approach Recommendation
   - Best communication channel
   - Optimal messaging tone
   - Personalization opportunities

2. Timing Strategy
   - Best timeframe for initial contact
   - Suggested day/time if applicable
   - Follow-up cadence

3. Messaging Framework
   - Key talking points aligned with donor interests
   - Pitch recommendations specific to this donor
   - Potential concerns to address proactively

4. Email Template (if email is recommended channel)
   - Subject line
   - Personalized opening
   - Value proposition
   - Clear call to action

OUTPUT FORMAT (strict JSON):
{
  "recommendedApproach": "email" | "call" | "event" | "linkedin" | "in-person",
  "timing": {
    "bestTimeframe": "Specific timeframe recommendation",
    "dayOfWeek": "Optional specific day",
    "timeOfDay": "Optional specific time",
    "reasoning": "Why this timing"
  },
  "messagingTone": "formal" | "casual" | "professional" | "personal",
  "talkingPoints": ["point 1", "point 2", "point 3"],
  "followUpCadence": {
    "initialFollowUp": "Timeframe for first follow-up",
    "subsequentFollowUps": ["timeframe 1", "timeframe 2"],
    "maxFollowUps": 3
  },
  "emailTemplate": {
    "subject": "Compelling subject line",
    "greeting": "Personalized greeting",
    "opening": "Personalized opening paragraph",
    "body": "Main message body with value proposition",
    "closing": "Clear call to action",
    "signature": "Professional signature"
  },
  "pitchRecommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.0-1.0
}

IMPORTANT:
- Return ONLY valid JSON (no markdown, no code blocks)
- Personalize based on donor profile
- Align messaging with donor interests
- Provide specific, actionable recommendations`;
}

/**
 * Project-Donor Alignment Analysis Prompt
 */
export function buildProjectAlignmentPrompt(
  request: ProjectAlignmentRequest
): string {
  const { donorIntelligence, projectDetails, organizationContext } = request;

  return `${SYSTEM_PROMPT}

TASK: Assess alignment between donor and project

DONOR INTELLIGENCE:
${JSON.stringify(donorIntelligence, null, 2)}

PROJECT DETAILS:
${JSON.stringify(projectDetails, null, 2)}

${organizationContext ? `ORGANIZATION CONTEXT:\n${organizationContext}` : ''}

ASSESSMENT REQUIREMENTS:
1. Alignment Scoring
   - Calculate alignment score (0.0 - 1.0)
   - Consider cause fit, capacity match, timing

2. Connection Identification
   - Identify specific alignment points
   - Highlight donor interests that match project

3. Pitch Strategy
   - Recommend how to position this project
   - Suggest emphasis areas based on donor profile
   - Identify potential objections

4. Risk Assessment
   - Flag potential concerns
   - Suggest mitigation strategies

OUTPUT FORMAT (strict JSON):
{
  "alignmentScore": 0.0-1.0,
  "connectionPoints": [
    "Specific connection point 1",
    "Specific connection point 2"
  ],
  "pitchRecommendations": [
    "How to position the project to this donor",
    "Specific aspects to emphasize",
    "Value proposition tailored to donor"
  ],
  "potentialConcerns": [
    "Concern 1 and mitigation strategy",
    "Concern 2 and mitigation strategy"
  ],
  "strengths": [
    "Why this project matches donor interests",
    "Unique selling points for this donor"
  ],
  "confidence": 0.0-1.0
}

IMPORTANT:
- Return ONLY valid JSON (no markdown, no code blocks)
- Be honest about alignment (low scores are valid)
- Provide specific, actionable pitch recommendations
- Consider both fit and feasibility`;
}

/**
 * Helper function to extract JSON from AI response
 * Handles cases where AI returns JSON wrapped in markdown code blocks
 */
export function extractJSON(responseText: string): string {
  // Remove markdown code blocks if present
  const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    return jsonMatch[1];
  }

  // Try to find JSON object directly
  const directMatch = responseText.match(/\{[\s\S]*\}/);
  if (directMatch) {
    return directMatch[0];
  }

  return responseText.trim();
}
