/**
 * React Hooks for Project-Donor Alignments
 *
 * Provides hooks for managing and calculating alignments between donors and projects.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  alignmentService,
  AlignmentResult,
  AlignmentInput,
  AlignmentStats,
} from '@/lib/ai/alignment';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get alignment for a specific donor-project pair
 */
export function useAlignment(
  donorId: string,
  projectId: string,
  enabled = true
) {
  return useQuery<AlignmentResult | null, Error>({
    queryKey: ['alignment', donorId, projectId],
    queryFn: () => alignmentService.getAlignment(donorId, projectId),
    enabled: enabled && !!donorId && !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get all alignments for a project
 */
export function useProjectAlignments(
  projectId: string,
  organizationId: string,
  options?: {
    minScore?: number;
    limit?: number;
    offset?: number;
  },
  enabled = true
) {
  return useQuery<AlignmentResult[], Error>({
    queryKey: ['projectAlignments', projectId, organizationId, options],
    queryFn: () => alignmentService.getProjectAlignments(projectId, organizationId, options),
    enabled: enabled && !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get all alignments for a donor
 */
export function useDonorAlignments(
  donorId: string,
  organizationId: string,
  options?: {
    minScore?: number;
    limit?: number;
    offset?: number;
  },
  enabled = true
) {
  return useQuery<AlignmentResult[], Error>({
    queryKey: ['donorAlignments', donorId, organizationId, options],
    queryFn: () => alignmentService.getDonorAlignments(donorId, organizationId, options),
    enabled: enabled && !!donorId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get alignment statistics for an organization
 */
export function useAlignmentStats(organizationId: string, enabled = true) {
  return useQuery<AlignmentStats, Error>({
    queryKey: ['alignmentStats', organizationId],
    queryFn: () => alignmentService.getAlignmentStats(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Calculate and store alignment for a donor-project pair
 */
export function useCalculateAlignment() {
  const queryClient = useQueryClient();

  return useMutation<AlignmentResult, Error, AlignmentInput>({
    mutationFn: (input) => alignmentService.calculateAndStoreAlignment(input),
    onSuccess: (data, input) => {
      // Update specific alignment cache
      queryClient.setQueryData(['alignment', data.donorId, data.projectId], data);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['projectAlignments', data.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['donorAlignments', data.donorId],
      });
      queryClient.invalidateQueries({
        queryKey: ['alignmentStats', input.organizationId],
      });
    },
  });
}

/**
 * Calculate alignments for all donors against a project (batch)
 */
export function useCalculateProjectAlignmentsBatch() {
  const queryClient = useQueryClient();

  return useMutation<
    { calculated: number; skipped: number; errors: number },
    Error,
    {
      projectId: string;
      organizationId: string;
      minAlignmentScore?: number;
      forceRecalculate?: boolean;
    }
  >({
    mutationFn: ({ projectId, organizationId, ...options }) =>
      alignmentService.calculateProjectAlignmentsBatch(projectId, organizationId, options),
    onSuccess: (_, { projectId, organizationId }) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: ['projectAlignments', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['alignmentStats', organizationId],
      });
      // Invalidate all donor alignment queries for this org
      queryClient.invalidateQueries({
        queryKey: ['donorAlignments'],
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key[2] === organizationId;
        },
      });
    },
  });
}

/**
 * Calculate alignments for a donor against all active projects (batch)
 */
export function useCalculateDonorAlignmentsBatch() {
  const queryClient = useQueryClient();

  return useMutation<
    { calculated: number; skipped: number; errors: number },
    Error,
    {
      donorId: string;
      organizationId: string;
      minAlignmentScore?: number;
      forceRecalculate?: boolean;
    }
  >({
    mutationFn: ({ donorId, organizationId, ...options }) =>
      alignmentService.calculateDonorAlignmentsBatch(donorId, organizationId, options),
    onSuccess: (_, { donorId, organizationId }) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: ['donorAlignments', donorId],
      });
      queryClient.invalidateQueries({
        queryKey: ['alignmentStats', organizationId],
      });
      // Invalidate all project alignment queries for this org
      queryClient.invalidateQueries({
        queryKey: ['projectAlignments'],
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key[2] === organizationId;
        },
      });
    },
  });
}

/**
 * Delete an alignment
 */
export function useDeleteAlignment() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { donorId: string; projectId: string; organizationId: string }
  >({
    mutationFn: ({ donorId, projectId }) =>
      alignmentService.deleteAlignment(donorId, projectId),
    onSuccess: (_, { donorId, projectId, organizationId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['alignment', donorId, projectId],
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['projectAlignments', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['donorAlignments', donorId],
      });
      queryClient.invalidateQueries({
        queryKey: ['alignmentStats', organizationId],
      });
    },
  });
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Get top aligned donors for a project
 */
export function useTopProjectMatches(
  projectId: string,
  organizationId: string,
  limit = 5,
  enabled = true
) {
  return useProjectAlignments(
    projectId,
    organizationId,
    { minScore: 0.5, limit },
    enabled
  );
}

/**
 * Get top aligned projects for a donor
 */
export function useTopDonorMatches(
  donorId: string,
  organizationId: string,
  limit = 5,
  enabled = true
) {
  return useDonorAlignments(
    donorId,
    organizationId,
    { minScore: 0.5, limit },
    enabled
  );
}
