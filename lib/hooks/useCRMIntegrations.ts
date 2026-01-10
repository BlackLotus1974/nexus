import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { CRMIntegration } from '@/types';
import type { Database } from '@/types/database';

type CRMIntegrationRow = Database['public']['Tables']['crm_integrations']['Row'];
type CRMIntegrationInsert = Database['public']['Tables']['crm_integrations']['Insert'];

// Helper to convert database row to CRMIntegration type
const convertCRMRowToIntegration = (row: CRMIntegrationRow): CRMIntegration => ({
  id: row.id,
  organizationId: row.organization_id,
  crmType: row.crm_type as CRMIntegration['crmType'],
  syncStatus: row.sync_status as CRMIntegration['syncStatus'],
  lastSync: row.last_sync ? new Date(row.last_sync) : undefined,
  syncConfig: row.sync_config as Record<string, unknown>,
});

/**
 * Fetch all CRM integrations for an organization
 */
export function useCRMIntegrations(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['crm-integrations', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertCRMRowToIntegration);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single CRM integration by ID
 */
export function useCRMIntegration(integrationId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['crm-integrations', organizationId, integrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return convertCRMRowToIntegration(data);
    },
    enabled: enabled && !!integrationId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new CRM integration
 */
export function useCreateCRMIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: {
      organizationId: string;
      crmType: CRMIntegration['crmType'];
      credentials: Record<string, unknown>;
      syncConfig?: Record<string, unknown>;
    }) => {
      const insertData: CRMIntegrationInsert = {
        organization_id: integration.organizationId,
        crm_type: integration.crmType,
        credentials: integration.credentials as any,
        sync_config: (integration.syncConfig || {}) as any,
        sync_status: 'paused',
      };

      const { data, error } = await supabase
        .from('crm_integrations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return convertCRMRowToIntegration(data);
    },
    onSuccess: (data) => {
      // Invalidate and refetch integrations list
      queryClient.invalidateQueries({
        queryKey: ['crm-integrations', data.organizationId],
      });
    },
  });
}

/**
 * Update a CRM integration
 */
export function useUpdateCRMIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      organizationId,
      updates,
    }: {
      integrationId: string;
      organizationId: string;
      updates: {
        credentials?: Record<string, unknown>;
        syncConfig?: Record<string, unknown>;
        syncStatus?: CRMIntegration['syncStatus'];
      };
    }) => {
      const updateData: any = {};

      if (updates.credentials) updateData.credentials = updates.credentials;
      if (updates.syncConfig) updateData.sync_config = updates.syncConfig;
      if (updates.syncStatus) updateData.sync_status = updates.syncStatus;

      const { data, error } = await supabase
        .from('crm_integrations')
        .update(updateData)
        .eq('id', integrationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return convertCRMRowToIntegration(data);
    },
    onSuccess: (data) => {
      // Update the specific integration in cache
      queryClient.setQueryData(['crm-integrations', data.organizationId, data.id], data);

      // Invalidate the integrations list
      queryClient.invalidateQueries({
        queryKey: ['crm-integrations', data.organizationId],
      });
    },
  });
}

/**
 * Delete a CRM integration
 */
export function useDeleteCRMIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      organizationId,
    }: {
      integrationId: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('crm_integrations')
        .delete()
        .eq('id', integrationId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return { integrationId, organizationId };
    },
    onSuccess: ({ integrationId, organizationId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['crm-integrations', organizationId, integrationId],
      });

      // Invalidate integrations list
      queryClient.invalidateQueries({
        queryKey: ['crm-integrations', organizationId],
      });
    },
  });
}

/**
 * Trigger a CRM sync
 */
export function useTriggerCRMSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      organizationId,
    }: {
      integrationId: string;
      organizationId: string;
    }) => {
      // This would typically call an edge function to trigger the sync
      // For now, we'll just update the last_sync time
      const { data, error } = await supabase
        .from('crm_integrations')
        .update({
          last_sync: new Date().toISOString(),
          sync_status: 'active'
        })
        .eq('id', integrationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return convertCRMRowToIntegration(data);
    },
    onMutate: async ({ integrationId, organizationId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['crm-integrations', organizationId, integrationId],
      });

      // Snapshot the previous value
      const previousIntegration = queryClient.getQueryData([
        'crm-integrations',
        organizationId,
        integrationId,
      ]);

      // Optimistically update to show syncing state
      queryClient.setQueryData(
        ['crm-integrations', organizationId, integrationId],
        (old: CRMIntegration | undefined) =>
          old ? { ...old, syncStatus: 'active' as const } : old
      );

      return { previousIntegration };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousIntegration) {
        queryClient.setQueryData(
          ['crm-integrations', variables.organizationId, variables.integrationId],
          context.previousIntegration
        );
      }
    },
    onSuccess: (data) => {
      // Update the specific integration in cache
      queryClient.setQueryData(['crm-integrations', data.organizationId, data.id], data);

      // Invalidate the integrations list
      queryClient.invalidateQueries({
        queryKey: ['crm-integrations', data.organizationId],
      });
    },
  });
}
