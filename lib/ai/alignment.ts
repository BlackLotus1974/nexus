/**
 * Project-Donor Alignment Service
 *
 * AI-powered matching of donors to projects based on interests, giving patterns,
 * and donor intelligence data.
 */

import { supabase } from '@/lib/supabase/client';
import { aiService } from './orchestrator';
import type {
  ProjectAlignment,
  DonorIntelligence,
  AIResponse,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface AlignmentResult {
  id: string;
  donorId: string;
  projectId: string;
  alignmentScore: number;
  analysisData: ProjectAlignment;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlignmentInput {
  donorId: string;
  projectId: string;
  organizationId: string;
  donorIntelligence?: DonorIntelligence;
  projectDetails?: {
    name: string;
    description?: string;
    conceptNote?: string;
    fundingGoal?: number;
  };
}

export interface BatchAlignmentOptions {
  organizationId: string;
  projectId?: string; // If provided, calculate for all donors against this project
  donorId?: string; // If provided, calculate for this donor against all projects
  minAlignmentScore?: number; // Only store alignments above this threshold
  forceRecalculate?: boolean; // Recalculate even if alignment exists
}

export interface AlignmentStats {
  totalAlignments: number;
  averageScore: number;
  highMatchCount: number; // score >= 0.7
  mediumMatchCount: number; // score >= 0.4 && < 0.7
  lowMatchCount: number; // score < 0.4
  topMatches: Array<{
    donorId: string;
    donorName: string;
    projectId: string;
    projectName: string;
    score: number;
  }>;
}

// ============================================================================
// Core Alignment Functions
// ============================================================================

/**
 * Calculate alignment between a donor and a project
 */
export async function calculateAlignment(
  input: AlignmentInput
): Promise<AIResponse<ProjectAlignment>> {
  let donorIntelligence = input.donorIntelligence;
  let projectDetails = input.projectDetails;

  // Fetch donor intelligence if not provided
  if (!donorIntelligence) {
    const { data: donor, error: donorError } = await supabase
      .from('donors')
      .select('name, location, intelligence_data')
      .eq('id', input.donorId)
      .eq('organization_id', input.organizationId)
      .single();

    if (donorError) {
      throw new Error(`Failed to fetch donor: ${donorError.message}`);
    }

    // Use existing intelligence data or create minimal intelligence
    const intelligenceData = donor.intelligence_data as Record<string, unknown> | null;
    donorIntelligence = intelligenceData ? (intelligenceData as unknown as DonorIntelligence) : {
      summary: `Donor: ${donor.name}`,
      keyInsights: [],
      givingCapacity: 'unknown' as const,
      preferredCauses: [],
      connectionPoints: [],
      recommendedApproach: 'General outreach',
      confidence: 0.3,
      dataSources: ['basic profile'],
      geographicConnections: donor.location ? [donor.location] : [],
    };
  }

  // Fetch project details if not provided
  if (!projectDetails) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, description, concept_note, funding_goal')
      .eq('id', input.projectId)
      .eq('organization_id', input.organizationId)
      .single();

    if (projectError) {
      throw new Error(`Failed to fetch project: ${projectError.message}`);
    }

    projectDetails = {
      name: project.name,
      description: project.description || undefined,
      conceptNote: project.concept_note || undefined,
      fundingGoal: project.funding_goal || undefined,
    };
  }

  // Call AI service to analyze alignment
  return aiService.analyzeProjectAlignment({
    donorIntelligence,
    projectDetails,
  });
}

/**
 * Calculate and store alignment in the database
 */
export async function calculateAndStoreAlignment(
  input: AlignmentInput
): Promise<AlignmentResult> {
  // Calculate alignment
  const alignmentResponse = await calculateAlignment(input);
  const alignment = alignmentResponse.data;

  // Store in database - use type assertion for JSON field
  const upsertData = {
    donor_id: input.donorId,
    project_id: input.projectId,
    alignment_score: alignment.alignmentScore,
    analysis_data: alignment,
  };

  const { data, error } = await supabase
    .from('donor_project_alignments')
    .upsert(upsertData as never, {
      onConflict: 'donor_id,project_id',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store alignment: ${error.message}`);
  }

  return {
    id: data.id,
    donorId: data.donor_id,
    projectId: data.project_id,
    alignmentScore: data.alignment_score || 0,
    analysisData: data.analysis_data as unknown as ProjectAlignment,
    createdAt: new Date(data.created_at || new Date()),
    updatedAt: new Date(data.updated_at || new Date()),
  };
}

/**
 * Get stored alignment for a donor-project pair
 */
export async function getAlignment(
  donorId: string,
  projectId: string
): Promise<AlignmentResult | null> {
  const { data, error } = await supabase
    .from('donor_project_alignments')
    .select('*')
    .eq('donor_id', donorId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`Failed to fetch alignment: ${error.message}`);
  }

  return {
    id: data.id,
    donorId: data.donor_id,
    projectId: data.project_id,
    alignmentScore: data.alignment_score || 0,
    analysisData: data.analysis_data as unknown as ProjectAlignment,
    createdAt: new Date(data.created_at || new Date()),
    updatedAt: new Date(data.updated_at || new Date()),
  };
}

/**
 * Get all alignments for a project
 */
export async function getProjectAlignments(
  projectId: string,
  organizationId: string,
  options?: {
    minScore?: number;
    limit?: number;
    offset?: number;
  }
): Promise<AlignmentResult[]> {
  let query = supabase
    .from('donor_project_alignments')
    .select(`
      *,
      donor:donors!donor_project_alignments_donor_id_fkey(id, name, organization_id)
    `)
    .eq('project_id', projectId)
    .order('alignment_score', { ascending: false });

  if (options?.minScore) {
    query = query.gte('alignment_score', options.minScore);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch project alignments: ${error.message}`);
  }

  // Filter by organization (via donor's organization_id)
  const filteredData = (data || []).filter((row) => {
    const donor = row.donor as Record<string, unknown> | null;
    return donor?.organization_id === organizationId;
  });

  return filteredData.map((row) => ({
    id: row.id,
    donorId: row.donor_id,
    projectId: row.project_id,
    alignmentScore: row.alignment_score || 0,
    analysisData: row.analysis_data as unknown as ProjectAlignment,
    createdAt: new Date(row.created_at || new Date()),
    updatedAt: new Date(row.updated_at || new Date()),
  }));
}

/**
 * Get all alignments for a donor
 */
export async function getDonorAlignments(
  donorId: string,
  organizationId: string,
  options?: {
    minScore?: number;
    limit?: number;
    offset?: number;
  }
): Promise<AlignmentResult[]> {
  let query = supabase
    .from('donor_project_alignments')
    .select(`
      *,
      project:projects!donor_project_alignments_project_id_fkey(id, name, organization_id)
    `)
    .eq('donor_id', donorId)
    .order('alignment_score', { ascending: false });

  if (options?.minScore) {
    query = query.gte('alignment_score', options.minScore);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch donor alignments: ${error.message}`);
  }

  // Filter by organization (via project's organization_id)
  const filteredData = (data || []).filter((row) => {
    const project = row.project as Record<string, unknown> | null;
    return project?.organization_id === organizationId;
  });

  return filteredData.map((row) => ({
    id: row.id,
    donorId: row.donor_id,
    projectId: row.project_id,
    alignmentScore: row.alignment_score || 0,
    analysisData: row.analysis_data as unknown as ProjectAlignment,
    createdAt: new Date(row.created_at || new Date()),
    updatedAt: new Date(row.updated_at || new Date()),
  }));
}

// ============================================================================
// Batch Alignment Functions
// ============================================================================

/**
 * Calculate alignments for all donors against a specific project
 */
export async function calculateProjectAlignmentsBatch(
  projectId: string,
  organizationId: string,
  options?: Omit<BatchAlignmentOptions, 'projectId' | 'organizationId'>
): Promise<{ calculated: number; skipped: number; errors: number }> {
  const stats = { calculated: 0, skipped: 0, errors: 0 };

  // Fetch all donors for the organization
  const { data: donors, error: donorsError } = await supabase
    .from('donors')
    .select('id, name, intelligence_data')
    .eq('organization_id', organizationId);

  if (donorsError) {
    throw new Error(`Failed to fetch donors: ${donorsError.message}`);
  }

  // Fetch project details once
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, description, concept_note, funding_goal')
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .single();

  if (projectError) {
    throw new Error(`Failed to fetch project: ${projectError.message}`);
  }

  // Get existing alignments if not force recalculating
  let existingAlignmentDonorIds: Set<string> = new Set();
  if (!options?.forceRecalculate) {
    const { data: existing } = await supabase
      .from('donor_project_alignments')
      .select('donor_id')
      .eq('project_id', projectId);

    existingAlignmentDonorIds = new Set((existing || []).map(a => a.donor_id));
  }

  // Process each donor
  for (const donor of donors || []) {
    // Skip if alignment already exists and not force recalculating
    if (!options?.forceRecalculate && existingAlignmentDonorIds.has(donor.id)) {
      stats.skipped++;
      continue;
    }

    try {
      const intelligenceData = donor.intelligence_data as Record<string, unknown> | null;
      const donorIntelligence = intelligenceData ? (intelligenceData as unknown as DonorIntelligence) : {
        summary: `Donor: ${donor.name}`,
        keyInsights: [],
        givingCapacity: 'unknown' as const,
        preferredCauses: [],
        connectionPoints: [],
        recommendedApproach: 'General outreach',
        confidence: 0.3,
        dataSources: ['basic profile'],
      };

      const alignmentResponse = await aiService.analyzeProjectAlignment({
        donorIntelligence,
        projectDetails: {
          name: project.name,
          description: project.description || undefined,
          conceptNote: project.concept_note || undefined,
          fundingGoal: project.funding_goal || undefined,
        },
      });

      const alignment = alignmentResponse.data;

      // Skip if below minimum score threshold
      if (options?.minAlignmentScore && alignment.alignmentScore < options.minAlignmentScore) {
        stats.skipped++;
        continue;
      }

      // Store alignment - use type assertion for JSON field
      const batchUpsertData = {
        donor_id: donor.id,
        project_id: projectId,
        alignment_score: alignment.alignmentScore,
        analysis_data: alignment,
      };
      await supabase
        .from('donor_project_alignments')
        .upsert(batchUpsertData as never, {
          onConflict: 'donor_id,project_id',
        });

      stats.calculated++;
    } catch (error) {
      console.error(`[Alignment] Error calculating alignment for donor ${donor.id}:`, error);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Calculate alignments for a specific donor against all active projects
 */
export async function calculateDonorAlignmentsBatch(
  donorId: string,
  organizationId: string,
  options?: Omit<BatchAlignmentOptions, 'donorId' | 'organizationId'>
): Promise<{ calculated: number; skipped: number; errors: number }> {
  const stats = { calculated: 0, skipped: 0, errors: 0 };

  // Fetch donor details
  const { data: donor, error: donorError } = await supabase
    .from('donors')
    .select('id, name, location, intelligence_data')
    .eq('id', donorId)
    .eq('organization_id', organizationId)
    .single();

  if (donorError) {
    throw new Error(`Failed to fetch donor: ${donorError.message}`);
  }

  // Fetch all active projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, description, concept_note, funding_goal')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  // Get existing alignments if not force recalculating
  let existingAlignmentProjectIds: Set<string> = new Set();
  if (!options?.forceRecalculate) {
    const { data: existing } = await supabase
      .from('donor_project_alignments')
      .select('project_id')
      .eq('donor_id', donorId);

    existingAlignmentProjectIds = new Set((existing || []).map(a => a.project_id));
  }

  // Prepare donor intelligence
  const intelligenceData = donor.intelligence_data as Record<string, unknown> | null;
  const donorIntelligence = intelligenceData ? (intelligenceData as unknown as DonorIntelligence) : {
    summary: `Donor: ${donor.name}`,
    keyInsights: [],
    givingCapacity: 'unknown' as const,
    preferredCauses: [],
    connectionPoints: [],
    recommendedApproach: 'General outreach',
    confidence: 0.3,
    dataSources: ['basic profile'],
    geographicConnections: donor.location ? [donor.location] : [],
  };

  // Process each project
  for (const project of projects || []) {
    // Skip if alignment already exists and not force recalculating
    if (!options?.forceRecalculate && existingAlignmentProjectIds.has(project.id)) {
      stats.skipped++;
      continue;
    }

    try {
      const alignmentResponse = await aiService.analyzeProjectAlignment({
        donorIntelligence,
        projectDetails: {
          name: project.name,
          description: project.description || undefined,
          conceptNote: project.concept_note || undefined,
          fundingGoal: project.funding_goal || undefined,
        },
      });

      const alignment = alignmentResponse.data;

      // Skip if below minimum score threshold
      if (options?.minAlignmentScore && alignment.alignmentScore < options.minAlignmentScore) {
        stats.skipped++;
        continue;
      }

      // Store alignment - use type assertion for JSON field
      const donorBatchUpsertData = {
        donor_id: donorId,
        project_id: project.id,
        alignment_score: alignment.alignmentScore,
        analysis_data: alignment,
      };
      await supabase
        .from('donor_project_alignments')
        .upsert(donorBatchUpsertData as never, {
          onConflict: 'donor_id,project_id',
        });

      stats.calculated++;
    } catch (error) {
      console.error(`[Alignment] Error calculating alignment for project ${project.id}:`, error);
      stats.errors++;
    }
  }

  return stats;
}

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Get alignment statistics for an organization
 */
export async function getAlignmentStats(
  organizationId: string
): Promise<AlignmentStats> {
  // Fetch all alignments with donor and project info
  const { data: alignments, error } = await supabase
    .from('donor_project_alignments')
    .select(`
      *,
      donor:donors!donor_project_alignments_donor_id_fkey(id, name, organization_id),
      project:projects!donor_project_alignments_project_id_fkey(id, name, organization_id)
    `)
    .order('alignment_score', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch alignment stats: ${error.message}`);
  }

  // Filter by organization
  const orgAlignments = (alignments || []).filter((row) => {
    const donor = row.donor as Record<string, unknown> | null;
    return donor?.organization_id === organizationId;
  });

  if (orgAlignments.length === 0) {
    return {
      totalAlignments: 0,
      averageScore: 0,
      highMatchCount: 0,
      mediumMatchCount: 0,
      lowMatchCount: 0,
      topMatches: [],
    };
  }

  // Calculate statistics
  let totalScore = 0;
  let highMatchCount = 0;
  let mediumMatchCount = 0;
  let lowMatchCount = 0;

  for (const alignment of orgAlignments) {
    const score = alignment.alignment_score || 0;
    totalScore += score;

    if (score >= 0.7) {
      highMatchCount++;
    } else if (score >= 0.4) {
      mediumMatchCount++;
    } else {
      lowMatchCount++;
    }
  }

  // Get top 10 matches
  const topMatches = orgAlignments.slice(0, 10).map((row) => ({
    donorId: row.donor_id,
    donorName: (row.donor as Record<string, unknown>)?.name as string || 'Unknown',
    projectId: row.project_id,
    projectName: (row.project as Record<string, unknown>)?.name as string || 'Unknown',
    score: row.alignment_score || 0,
  }));

  return {
    totalAlignments: orgAlignments.length,
    averageScore: totalScore / orgAlignments.length,
    highMatchCount,
    mediumMatchCount,
    lowMatchCount,
    topMatches,
  };
}

/**
 * Delete an alignment
 */
export async function deleteAlignment(
  donorId: string,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from('donor_project_alignments')
    .delete()
    .eq('donor_id', donorId)
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to delete alignment: ${error.message}`);
  }
}

// ============================================================================
// Export Service Object
// ============================================================================

export const alignmentService = {
  calculateAlignment,
  calculateAndStoreAlignment,
  getAlignment,
  getProjectAlignments,
  getDonorAlignments,
  calculateProjectAlignmentsBatch,
  calculateDonorAlignmentsBatch,
  getAlignmentStats,
  deleteAlignment,
};
