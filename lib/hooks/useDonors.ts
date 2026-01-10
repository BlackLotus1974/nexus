import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Donor } from '@/types';
import type { Database } from '@/types/database';

type DonorRow = Database['public']['Tables']['donors']['Row'];
type DonorInsert = Database['public']['Tables']['donors']['Insert'];
type DonorUpdate = Database['public']['Tables']['donors']['Update'];

// Helper to convert database row to Donor type
const convertDonorRowToDonor = (row: DonorRow): Donor => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  location: row.location || undefined,
  intelligenceData: row.intelligence_data as any,
  lastUpdated: new Date(row.last_updated || new Date()),
  createdAt: new Date(row.created_at || new Date()),
});

/**
 * Fetch all donors for an organization
 */
export function useDonors(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['donors', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertDonorRowToDonor);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single donor by ID
 */
export function useDonor(donorId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['donors', organizationId, donorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('id', donorId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return convertDonorRowToDonor(data);
    },
    enabled: enabled && !!donorId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search donors by name
 */
export function useSearchDonors(organizationId: string, searchQuery: string, enabled = true) {
  return useQuery({
    queryKey: ['donors', organizationId, 'search', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId)
        .ilike('name', `%${searchQuery}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertDonorRowToDonor);
    },
    enabled: enabled && !!organizationId && !!searchQuery,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
}

/**
 * Generate donor intelligence using AI
 */
export function useGenerateDonorIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      name: string; 
      location?: string; 
      context?: string;
      donorId?: string; // For updating existing donor
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'donor-intelligence-generator',
        {
          body: {
            donor_name: input.name,
            location: input.location,
            context: input.context,
            donor_id: input.donorId,
          },
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate donor intelligence');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'AI generation failed');
      }

      return {
        donorId: data.data.donor_id,
        intelligenceData: data.data.intelligence_data,
        generatedAt: new Date(data.data.generated_at),
        providerUsed: data.data.provider_used,
        latencyMs: data.data.latency_ms,
      };
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['donors'],
      });
      
      // Also invalidate the specific donor if it was an update
      if (data.donorId) {
        queryClient.invalidateQueries({
          queryKey: ['donors', undefined, data.donorId],
        });
      }
    },
    onError: (error) => {
      console.error('Donor intelligence generation failed:', error);
    },
  });
}

/**
 * Create a new donor (basic record without AI)
 */
export function useCreateDonor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donor: { name: string; location?: string; organizationId: string }) => {
      const insertData: DonorInsert = {
        name: donor.name,
        location: donor.location,
        organization_id: donor.organizationId,
        intelligence_data: {},
      };

      const { data, error } = await supabase
        .from('donors')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return convertDonorRowToDonor(data);
    },
    onSuccess: (data) => {
      // Invalidate and refetch donors list
      queryClient.invalidateQueries({
        queryKey: ['donors', data.organizationId],
      });
    },
  });
}

/**
 * Update a donor
 */
export function useUpdateDonor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      donorId,
      organizationId,
      updates,
    }: {
      donorId: string;
      organizationId: string;
      updates: Partial<Omit<Donor, 'id' | 'organizationId' | 'createdAt'>>;
    }) => {
      const updateData: DonorUpdate = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.intelligenceData) updateData.intelligence_data = updates.intelligenceData as any;
      if (updates.lastUpdated) updateData.last_updated = updates.lastUpdated.toISOString();

      const { data, error } = await supabase
        .from('donors')
        .update(updateData)
        .eq('id', donorId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return convertDonorRowToDonor(data);
    },
    onSuccess: (data) => {
      // Update the specific donor in cache
      queryClient.setQueryData(['donors', data.organizationId, data.id], data);

      // Invalidate the donors list
      queryClient.invalidateQueries({
        queryKey: ['donors', data.organizationId],
      });
    },
  });
}

/**
 * Delete a donor
 */
export function useDeleteDonor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      donorId,
      organizationId,
    }: {
      donorId: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('donors')
        .delete()
        .eq('id', donorId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return { donorId, organizationId };
    },
    onSuccess: ({ donorId, organizationId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['donors', organizationId, donorId],
      });

      // Invalidate donors list
      queryClient.invalidateQueries({
        queryKey: ['donors', organizationId],
      });
    },
  });
}
