/**
 * Project Alignment Generator Edge Function
 *
 * Calculates AI-powered alignment scores between donors and projects.
 * Supports single alignment calculation and batch processing.
 *
 * Endpoints:
 * - POST /project-alignment-generator (single alignment)
 * - POST /project-alignment-generator/batch (batch alignment)
 */

import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

interface AlignmentRequest {
  donorId: string;
  projectId: string;
  organizationId: string;
}

interface BatchAlignmentRequest {
  organizationId: string;
  projectId?: string; // Calculate for all donors against this project
  donorId?: string; // Calculate for this donor against all projects
  minAlignmentScore?: number;
  forceRecalculate?: boolean;
}

interface DonorIntelligence {
  summary: string;
  keyInsights: string[];
  givingCapacity: string;
  preferredCauses: string[];
  confidence: number;
}

interface ProjectAlignment {
  alignmentScore: number;
  connectionPoints: string[];
  pitchRecommendations: string[];
  potentialConcerns: string[];
  strengths: string[];
  confidence: number;
}

/**
 * Generate alignment using Gemini API
 */
async function generateAlignmentWithGemini(
  donorIntelligence: DonorIntelligence,
  projectDetails: Record<string, unknown>
): Promise<ProjectAlignment> {
  const prompt = `Analyze the alignment between this donor and project.

DONOR INTELLIGENCE:
${JSON.stringify(donorIntelligence, null, 2)}

PROJECT DETAILS:
${JSON.stringify(projectDetails, null, 2)}

Provide a JSON response with the following structure:
{
  "alignmentScore": <number 0.0-1.0>,
  "connectionPoints": [<strings describing what aligns>],
  "pitchRecommendations": [<strings with pitch suggestions>],
  "potentialConcerns": [<strings with potential issues>],
  "strengths": [<strings describing match strengths>],
  "confidence": <number 0.0-1.0>
}

Focus on:
1. Interest alignment between donor preferences and project goals
2. Giving capacity match with project funding needs
3. Geographic or cause area overlaps
4. Potential concerns or mismatches

Return ONLY valid JSON, no additional text.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }

  return JSON.parse(jsonMatch[0]) as ProjectAlignment;
}

/**
 * Generate alignment using OpenAI API (fallback)
 */
async function generateAlignmentWithOpenAI(
  donorIntelligence: DonorIntelligence,
  projectDetails: Record<string, unknown>
): Promise<ProjectAlignment> {
  const prompt = `Analyze the alignment between this donor and project.

DONOR INTELLIGENCE:
${JSON.stringify(donorIntelligence, null, 2)}

PROJECT DETAILS:
${JSON.stringify(projectDetails, null, 2)}

Provide a JSON response with:
- alignmentScore (0.0-1.0)
- connectionPoints (array of strings)
- pitchRecommendations (array of strings)
- potentialConcerns (array of strings)
- strengths (array of strings)
- confidence (0.0-1.0)

Return ONLY valid JSON.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI that analyzes donor-project alignment. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from OpenAI response');
  }

  return JSON.parse(jsonMatch[0]) as ProjectAlignment;
}

/**
 * Generate alignment with fallback
 */
async function generateAlignment(
  donorIntelligence: DonorIntelligence,
  projectDetails: Record<string, unknown>
): Promise<ProjectAlignment> {
  // Try Gemini first
  if (geminiApiKey) {
    try {
      return await generateAlignmentWithGemini(donorIntelligence, projectDetails);
    } catch (error) {
      console.error('[Alignment] Gemini failed, trying OpenAI:', error);
    }
  }

  // Fallback to OpenAI
  if (openaiApiKey) {
    return await generateAlignmentWithOpenAI(donorIntelligence, projectDetails);
  }

  throw new Error('No AI API keys configured');
}

/**
 * Calculate single alignment
 */
async function calculateAlignment(
  supabase: ReturnType<typeof createClient>,
  request: AlignmentRequest
): Promise<{ alignment: ProjectAlignment; stored: boolean }> {
  // Fetch donor
  const { data: donor, error: donorError } = await supabase
    .from('donors')
    .select('id, name, location, intelligence_data')
    .eq('id', request.donorId)
    .eq('organization_id', request.organizationId)
    .single();

  if (donorError) {
    throw new Error(`Donor not found: ${donorError.message}`);
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, description, concept_note, funding_goal')
    .eq('id', request.projectId)
    .eq('organization_id', request.organizationId)
    .single();

  if (projectError) {
    throw new Error(`Project not found: ${projectError.message}`);
  }

  // Prepare donor intelligence
  const intelligenceData = donor.intelligence_data as Record<string, unknown> | null;
  const donorIntelligence: DonorIntelligence = intelligenceData ? {
    summary: (intelligenceData.summary as string) || `Donor: ${donor.name}`,
    keyInsights: (intelligenceData.keyInsights as string[]) || [],
    givingCapacity: (intelligenceData.givingCapacity as string) || 'unknown',
    preferredCauses: (intelligenceData.preferredCauses as string[]) || [],
    confidence: (intelligenceData.confidence as number) || 0.3,
  } : {
    summary: `Donor: ${donor.name}`,
    keyInsights: [],
    givingCapacity: 'unknown',
    preferredCauses: [],
    confidence: 0.3,
  };

  // Generate alignment
  const alignment = await generateAlignment(donorIntelligence, {
    name: project.name,
    description: project.description,
    conceptNote: project.concept_note,
    fundingGoal: project.funding_goal,
  });

  // Store alignment
  const { error: storeError } = await supabase
    .from('donor_project_alignments')
    .upsert({
      donor_id: request.donorId,
      project_id: request.projectId,
      alignment_score: alignment.alignmentScore,
      analysis_data: alignment,
    }, {
      onConflict: 'donor_id,project_id',
    });

  return {
    alignment,
    stored: !storeError,
  };
}

/**
 * Calculate batch alignments
 */
async function calculateBatchAlignments(
  supabase: ReturnType<typeof createClient>,
  request: BatchAlignmentRequest
): Promise<{ calculated: number; skipped: number; errors: number }> {
  const stats = { calculated: 0, skipped: 0, errors: 0 };

  if (request.projectId) {
    // Calculate for all donors against this project
    const { data: donors } = await supabase
      .from('donors')
      .select('id')
      .eq('organization_id', request.organizationId);

    for (const donor of donors || []) {
      try {
        // Check if alignment exists
        if (!request.forceRecalculate) {
          const { data: existing } = await supabase
            .from('donor_project_alignments')
            .select('id')
            .eq('donor_id', donor.id)
            .eq('project_id', request.projectId)
            .single();

          if (existing) {
            stats.skipped++;
            continue;
          }
        }

        const result = await calculateAlignment(supabase, {
          donorId: donor.id,
          projectId: request.projectId,
          organizationId: request.organizationId,
        });

        if (request.minAlignmentScore && result.alignment.alignmentScore < request.minAlignmentScore) {
          stats.skipped++;
        } else {
          stats.calculated++;
        }
      } catch (error) {
        console.error(`Error processing donor ${donor.id}:`, error);
        stats.errors++;
      }
    }
  } else if (request.donorId) {
    // Calculate for this donor against all active projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', request.organizationId)
      .eq('status', 'active');

    for (const project of projects || []) {
      try {
        // Check if alignment exists
        if (!request.forceRecalculate) {
          const { data: existing } = await supabase
            .from('donor_project_alignments')
            .select('id')
            .eq('donor_id', request.donorId)
            .eq('project_id', project.id)
            .single();

          if (existing) {
            stats.skipped++;
            continue;
          }
        }

        const result = await calculateAlignment(supabase, {
          donorId: request.donorId,
          projectId: project.id,
          organizationId: request.organizationId,
        });

        if (request.minAlignmentScore && result.alignment.alignmentScore < request.minAlignmentScore) {
          stats.skipped++;
        } else {
          stats.calculated++;
        }
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
        stats.errors++;
      }
    }
  }

  return stats;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Parse request body
    const body = await req.json();
    const url = new URL(req.url);
    const isBatch = url.pathname.endsWith('/batch');

    // Create authenticated Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Verify user has access to organization
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile to verify organization access
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const organizationId = body.organizationId || profile?.organization_id;
    if (!organizationId || (profile?.organization_id && profile.organization_id !== organizationId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    if (isBatch) {
      // Batch alignment calculation
      result = await calculateBatchAlignments(supabase, {
        ...body,
        organizationId,
      });
    } else {
      // Single alignment calculation
      if (!body.donorId || !body.projectId) {
        throw new Error('donorId and projectId are required');
      }

      result = await calculateAlignment(supabase, {
        donorId: body.donorId,
        projectId: body.projectId,
        organizationId,
      });
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[project-alignment-generator] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: error instanceof Error && error.message.includes('not found') ? 404 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
