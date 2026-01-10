// @ts-nocheck
/**
 * AI Service Usage Examples
 *
 * This file demonstrates how to use the AI service integration layer
 * Copy and adapt these examples for your specific use cases
 */

import { aiService } from './index';
import type {
  DonorIntelligenceRequest,
  RelationshipAnalysisRequest,
  EngagementStrategyRequest,
  ProjectAlignmentRequest,
} from './types';

/**
 * Example 1: Generate Donor Intelligence
 *
 * Use this to research and analyze potential donors
 */
export async function exampleDonorIntelligence() {
  try {
    const request: DonorIntelligenceRequest = {
      name: 'Sarah Johnson',
      location: 'Boston, MA',
      context: 'Healthcare executive with interest in medical research',
      organizationContext: 'Medical research nonprofit focusing on cancer treatment',
    };

    console.log('Generating donor intelligence...');
    const result = await aiService.generateDonorIntelligence(request);

    console.log('Success!');
    console.log(`Provider: ${result.provider}`);
    console.log(`Response time: ${result.latencyMs}ms`);
    console.log(`Tokens used: ${result.tokensUsed}`);
    console.log('\n--- Donor Intelligence ---');
    console.log(`Summary: ${result.data.summary}`);
    console.log(`Giving Capacity: ${result.data.givingCapacity}`);
    console.log(`Confidence: ${(result.data.confidence * 100).toFixed(0)}%`);
    console.log('\nKey Insights:');
    result.data.keyInsights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight}`);
    });
    console.log('\nConnection Points:');
    result.data.connectionPoints.forEach((cp) => {
      console.log(`  - ${cp.description} (strength: ${cp.strength}/10)`);
    });

    return result;
  } catch (error) {
    console.error('Failed to generate donor intelligence:', error);
    throw error;
  }
}

/**
 * Example 2: Analyze Relationships
 *
 * Use this to identify warm introduction paths to donors
 */
export async function exampleRelationshipAnalysis() {
  try {
    const request: RelationshipAnalysisRequest = {
      donorData: {
        name: 'Michael Chen',
        company: 'Tech Innovations Inc',
        location: 'San Francisco, CA',
      },
      emailData: {
        totalEmails: 5,
        lastEmailDate: '2024-09-15',
        responseRate: 0.8,
      },
      linkedinData: {
        mutualConnections: [
          'John Smith (Board Member)',
          'Emily Rodriguez (Advisory Board)',
        ],
        connectionDegree: 2,
      },
    };

    console.log('Analyzing relationships...');
    const result = await aiService.analyzeRelationships(request);

    console.log('\n--- Relationship Analysis ---');
    console.log(`Connection Strength: ${result.data.connectionStrength}/10`);
    console.log(`Relationship Type: ${result.data.relationshipType}`);
    console.log('\nWarm Paths:');
    result.data.warmPathRecommendations.forEach((path, i) => {
      console.log(`  ${i + 1}. ${path.path.join(' → ')}`);
      console.log(`     Strength: ${path.strength}/10`);
      console.log(`     Strategy: ${path.suggestedApproach}`);
    });

    return result;
  } catch (error) {
    console.error('Failed to analyze relationships:', error);
    throw error;
  }
}

/**
 * Example 3: Generate Engagement Strategy
 *
 * Use this to create personalized outreach plans
 */
export async function exampleEngagementStrategy() {
  try {
    const request: EngagementStrategyRequest = {
      donorData: {
        name: 'Jennifer Williams',
        interests: ['Education', 'Youth Development'],
        givingCapacity: 'high',
        preferredCommunication: 'email',
      },
      projectData: {
        name: 'STEM Education Initiative',
        description: 'After-school STEM program for underserved youth',
        budget: 150000,
        impactMetrics: {
          studentsServed: 300,
          completionRate: 0.85,
        },
      },
    };

    console.log('Generating engagement strategy...');
    const result = await aiService.generateEngagementStrategy(request);

    console.log('\n--- Engagement Strategy ---');
    console.log(`Recommended Approach: ${result.data.recommendedApproach}`);
    console.log(`Messaging Tone: ${result.data.messagingTone}`);
    console.log(`Best Timing: ${result.data.timing.bestTimeframe}`);
    console.log('\nTalking Points:');
    result.data.talkingPoints.forEach((point, i) => {
      console.log(`  ${i + 1}. ${point}`);
    });

    if (result.data.emailTemplate) {
      console.log('\n--- Email Template ---');
      console.log(`Subject: ${result.data.emailTemplate.subject}`);
      console.log(`\n${result.data.emailTemplate.greeting}`);
      console.log(`\n${result.data.emailTemplate.opening}`);
      console.log(`\n${result.data.emailTemplate.body}`);
      console.log(`\n${result.data.emailTemplate.closing}`);
    }

    return result;
  } catch (error) {
    console.error('Failed to generate engagement strategy:', error);
    throw error;
  }
}

/**
 * Example 4: Analyze Project Alignment
 *
 * Use this to assess donor-project compatibility
 */
export async function exampleProjectAlignment() {
  try {
    // First get donor intelligence
    const intelligenceResult = await aiService.generateDonorIntelligence({
      name: 'David Martinez',
      location: 'Austin, TX',
      context: 'Technology entrepreneur, education philanthropist',
    });

    const request: ProjectAlignmentRequest = {
      donorIntelligence: intelligenceResult.data,
      projectDetails: {
        name: 'Tech Literacy Program',
        description: 'Teaching coding and computer science to middle school students',
        location: 'Austin, TX',
        budget: 200000,
        duration: '18 months',
      },
    };

    console.log('Analyzing project alignment...');
    const result = await aiService.analyzeProjectAlignment(request);

    console.log('\n--- Project Alignment ---');
    console.log(`Alignment Score: ${(result.data.alignmentScore * 100).toFixed(0)}%`);
    console.log(`Confidence: ${(result.data.confidence * 100).toFixed(0)}%`);
    console.log('\nStrengths:');
    result.data.strengths.forEach((strength, i) => {
      console.log(`  ${i + 1}. ${strength}`);
    });
    console.log('\nPitch Recommendations:');
    result.data.pitchRecommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });

    if (result.data.potentialConcerns.length > 0) {
      console.log('\nPotential Concerns:');
      result.data.potentialConcerns.forEach((concern, i) => {
        console.log(`  ${i + 1}. ${concern}`);
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to analyze project alignment:', error);
    throw error;
  }
}

/**
 * Example 5: Complete Donor Research Workflow
 *
 * Demonstrates a full research workflow combining multiple operations
 */
export async function exampleCompleteWorkflow() {
  try {
    console.log('=== COMPLETE DONOR RESEARCH WORKFLOW ===\n');

    // Step 1: Generate donor intelligence
    console.log('Step 1: Generating donor intelligence...');
    const intelligence = await aiService.generateDonorIntelligence({
      name: 'Alexandra Thompson',
      location: 'Seattle, WA',
      context: 'Tech industry leader, focus on environmental causes',
    });
    console.log(`✓ Intelligence generated (${intelligence.latencyMs}ms)`);

    // Step 2: Analyze relationships
    console.log('\nStep 2: Analyzing relationships...');
    const relationships = await aiService.analyzeRelationships({
      donorData: { name: 'Alexandra Thompson' },
      emailData: { totalEmails: 0, lastEmailDate: null },
    });
    console.log(`✓ Relationships analyzed (${relationships.latencyMs}ms)`);

    // Step 3: Check project alignment
    console.log('\nStep 3: Analyzing project alignment...');
    const alignment = await aiService.analyzeProjectAlignment({
      donorIntelligence: intelligence.data,
      projectDetails: {
        name: 'Clean Energy Initiative',
        description: 'Renewable energy education and implementation',
      },
    });
    console.log(`✓ Alignment analyzed (${alignment.latencyMs}ms)`);

    // Step 4: Generate engagement strategy (if good alignment)
    if (alignment.data.alignmentScore > 0.6) {
      console.log('\nStep 4: Generating engagement strategy...');
      const strategy = await aiService.generateEngagementStrategy({
        donorData: intelligence.data,
        projectData: { name: 'Clean Energy Initiative' },
        relationshipData: relationships.data,
      });
      console.log(`✓ Strategy generated (${strategy.latencyMs}ms)`);

      // Summary
      console.log('\n=== WORKFLOW SUMMARY ===');
      console.log(`Total time: ${
        intelligence.latencyMs +
        relationships.latencyMs +
        alignment.latencyMs +
        strategy.latencyMs
      }ms`);
      console.log(`Alignment score: ${(alignment.data.alignmentScore * 100).toFixed(0)}%`);
      console.log(`Recommended approach: ${strategy.data.recommendedApproach}`);
      console.log(
        `Providers used: Gemini: ${
          [intelligence, relationships, alignment, strategy].filter(
            (r) => r.provider === 'gemini'
          ).length
        }, OpenAI: ${
          [intelligence, relationships, alignment, strategy].filter(
            (r) => r.provider === 'openai'
          ).length
        }`
      );
    } else {
      console.log('\nAlignment score too low, skipping engagement strategy');
    }

    return {
      intelligence,
      relationships,
      alignment,
    };
  } catch (error) {
    console.error('Workflow failed:', error);
    throw error;
  }
}

/**
 * Example 6: Error Handling
 *
 * Demonstrates proper error handling patterns
 */
export async function exampleErrorHandling() {
  try {
    const result = await aiService.generateDonorIntelligence({
      name: 'Test Donor',
      location: 'Test City',
    });
    return result;
  } catch (err) {
    // Import error types for specific handling
    const {
      RateLimitError,
      ServiceDownError,
      AuthenticationError,
      TimeoutError,
      AIServiceError,
    } = require('./errors');

    if (err instanceof RateLimitError) {
      console.error(
        `Rate limit hit on ${err.provider}. Retry after ${err.retryAfterMs}ms`
      );
      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, err.retryAfterMs || 5000));
      return exampleErrorHandling();
    } else if (err instanceof ServiceDownError) {
      console.error(
        `Service ${err.provider} is down (HTTP ${err.statusCode}). Please try again later.`
      );
    } else if (err instanceof AuthenticationError) {
      console.error(
        `Authentication failed for ${err.provider}. Check your API keys.`
      );
    } else if (err instanceof TimeoutError) {
      console.error(
        `Operation timed out on ${err.provider}. The AI service may be slow.`
      );
    } else if (err instanceof AIServiceError) {
      console.error(`AI Service Error on ${err.provider}:`, err.message);
    } else {
      console.error('Unknown error:', err);
    }

    throw err;
  }
}

// Run examples (uncomment to test)
// if (require.main === module) {
//   exampleDonorIntelligence();
//   exampleRelationshipAnalysis();
//   exampleEngagementStrategy();
//   exampleProjectAlignment();
//   exampleCompleteWorkflow();
// }
