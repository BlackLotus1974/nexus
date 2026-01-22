import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Relationship } from '@/types';
import type { Database } from '@/types/database';
import type {
  WarmPath,
  RelationshipType,
  RelationshipConnection,
  RelationshipStats,
} from '@/lib/relationships/types';
import {
  findWarmPaths,
  discoverConnections,
  getRelationshipStats,
  getRelationshipConnections,
  updateConnectionStatus,
} from '@/lib/relationships/service';

type RelationshipRow = Database['public']['Tables']['relationships']['Row'];
type RelationshipInsert = Database['public']['Tables']['relationships']['Insert'];

// Helper to convert database row to Relationship type
const convertRelationshipRowToRelationship = (row: RelationshipRow): Relationship => ({
  id: row.id,
  donorId: row.donor_id,
  organizationId: row.organization_id,
  connectionType: (row.connection_type as Relationship['connectionType']) || 'direct',
  strengthScore: row.strength_score || 0,
  contactInfo: row.contact_info as any,
  lastInteraction: row.last_interaction ? new Date(row.last_interaction) : undefined,
  relationshipNotes: row.relationship_notes || undefined,
});

/**
 * Fetch all relationships for a donor
 */
export function useDonorRelationships(donorId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['relationships', organizationId, 'donor', donorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('donor_id', donorId)
        .eq('organization_id', organizationId)
        .order('strength_score', { ascending: false });

      if (error) throw error;
      return data.map(convertRelationshipRowToRelationship);
    },
    enabled: enabled && !!donorId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch all relationships for an organization
 */
export function useRelationships(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['relationships', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('organization_id', organizationId)
        .order('strength_score', { ascending: false });

      if (error) throw error;
      return data.map(convertRelationshipRowToRelationship);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new relationship
 */
export function useCreateRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationship: {
      donorId: string;
      organizationId: string;
      connectionType?: Relationship['connectionType'];
      strengthScore?: number;
      contactInfo: Relationship['contactInfo'];
      relationshipNotes?: string;
    }) => {
      const insertData: RelationshipInsert = {
        donor_id: relationship.donorId,
        organization_id: relationship.organizationId,
        connection_type: relationship.connectionType || 'direct',
        strength_score: relationship.strengthScore || 5,
        contact_info: relationship.contactInfo as any,
        relationship_notes: relationship.relationshipNotes,
      };

      const { data, error } = await supabase
        .from('relationships')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return convertRelationshipRowToRelationship(data);
    },
    onSuccess: (data) => {
      // Invalidate relationships for this donor
      queryClient.invalidateQueries({
        queryKey: ['relationships', data.organizationId, 'donor', data.donorId],
      });

      // Invalidate all relationships
      queryClient.invalidateQueries({
        queryKey: ['relationships', data.organizationId],
      });
    },
  });
}

/**
 * Update a relationship
 */
export function useUpdateRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      relationshipId,
      organizationId,
      updates,
    }: {
      relationshipId: string;
      organizationId: string;
      updates: Partial<Omit<Relationship, 'id' | 'donorId' | 'organizationId'>>;
    }) => {
      const updateData: any = {};

      if (updates.connectionType) updateData.connection_type = updates.connectionType;
      if (updates.strengthScore !== undefined) updateData.strength_score = updates.strengthScore;
      if (updates.contactInfo) updateData.contact_info = updates.contactInfo;
      if (updates.lastInteraction) updateData.last_interaction = updates.lastInteraction.toISOString();
      if (updates.relationshipNotes !== undefined) updateData.relationship_notes = updates.relationshipNotes;

      const { data, error } = await supabase
        .from('relationships')
        .update(updateData)
        .eq('id', relationshipId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return convertRelationshipRowToRelationship(data);
    },
    onSuccess: (data) => {
      // Invalidate relationships for this donor
      queryClient.invalidateQueries({
        queryKey: ['relationships', data.organizationId, 'donor', data.donorId],
      });

      // Invalidate all relationships
      queryClient.invalidateQueries({
        queryKey: ['relationships', data.organizationId],
      });
    },
  });
}

/**
 * Delete a relationship
 */
export function useDeleteRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      relationshipId,
      organizationId,
      donorId,
    }: {
      relationshipId: string;
      organizationId: string;
      donorId: string;
    }) => {
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', relationshipId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return { relationshipId, organizationId, donorId };
    },
    onSuccess: ({ donorId, organizationId }) => {
      // Invalidate relationships for this donor
      queryClient.invalidateQueries({
        queryKey: ['relationships', organizationId, 'donor', donorId],
      });

      // Invalidate all relationships
      queryClient.invalidateQueries({
        queryKey: ['relationships', organizationId],
      });
    },
  });
}

// ============================================================================
// Warm Path Discovery Hooks
// ============================================================================

/**
 * Find warm paths to a specific donor
 */
export function useWarmPaths(
  targetDonorId: string,
  organizationId: string,
  options?: {
    maxHops?: number;
    minScore?: number;
    limit?: number;
  }
) {
  return useQuery<WarmPath[], Error>({
    queryKey: ['warmPaths', organizationId, targetDonorId, options],
    queryFn: () =>
      findWarmPaths({
        organizationId,
        targetDonorId,
        maxHops: options?.maxHops,
        minScore: options?.minScore,
        limit: options?.limit,
      }),
    enabled: !!targetDonorId && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get relationship connections for an organization
 */
export function useRelationshipConnections(
  organizationId: string,
  options?: {
    sourceDonorId?: string;
    targetDonorId?: string;
    maxPathLength?: number;
    minScore?: number;
    status?: string;
    limit?: number;
  }
) {
  return useQuery<RelationshipConnection[], Error>({
    queryKey: ['relationshipConnections', organizationId, options],
    queryFn: () => getRelationshipConnections(organizationId, options),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get relationship statistics for an organization
 */
export function useRelationshipStats(organizationId: string) {
  return useQuery<RelationshipStats, Error>({
    queryKey: ['relationshipStats', organizationId],
    queryFn: () => getRelationshipStats(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Discover relationship connections (runs analysis to find indirect paths)
 */
export function useDiscoverConnections() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, string>({
    mutationFn: (organizationId: string) => discoverConnections(organizationId),
    onSuccess: (_, organizationId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['relationshipConnections', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['warmPaths', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['relationshipStats', organizationId],
      });
    },
  });
}

/**
 * Update connection status (mark as used, declined, etc.)
 */
export function useUpdateConnectionStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    RelationshipConnection,
    Error,
    {
      connectionId: string;
      status: 'active' | 'used' | 'declined' | 'expired';
      organizationId: string;
    }
  >({
    mutationFn: ({ connectionId, status }) =>
      updateConnectionStatus(connectionId, status),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['relationshipConnections', organizationId],
      });
    },
  });
}
