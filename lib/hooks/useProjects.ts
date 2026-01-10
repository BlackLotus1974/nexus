import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/types';
import type { Database } from '@/types/database';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

// Helper to convert database row to Project type
const convertProjectRowToProject = (row: ProjectRow): Project => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  description: row.description || undefined,
  conceptNote: row.concept_note || undefined,
  fundingGoal: row.funding_goal || undefined,
  status: row.status as 'active' | 'completed' | 'archived',
  createdAt: new Date(row.created_at || new Date()),
  updatedAt: new Date(row.updated_at || new Date()),
});

/**
 * Fetch all projects for an organization
 */
export function useProjects(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertProjectRowToProject);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(projectId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['projects', organizationId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return convertProjectRowToProject(data);
    },
    enabled: enabled && !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch projects by status
 */
export function useProjectsByStatus(
  organizationId: string,
  status: 'active' | 'completed' | 'archived',
  enabled = true
) {
  return useQuery({
    queryKey: ['projects', organizationId, 'status', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertProjectRowToProject);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: {
      name: string;
      description?: string;
      conceptNote?: string;
      fundingGoal?: number;
      organizationId: string;
    }) => {
      const insertData: ProjectInsert = {
        name: project.name,
        description: project.description,
        concept_note: project.conceptNote,
        funding_goal: project.fundingGoal,
        organization_id: project.organizationId,
        status: 'active',
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return convertProjectRowToProject(data);
    },
    onSuccess: (data) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({
        queryKey: ['projects', data.organizationId],
      });
    },
  });
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      organizationId,
      updates,
    }: {
      projectId: string;
      organizationId: string;
      updates: Partial<Omit<Project, 'id' | 'organizationId' | 'createdAt'>>;
    }) => {
      const updateData: ProjectUpdate = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.conceptNote !== undefined) updateData.concept_note = updates.conceptNote;
      if (updates.fundingGoal !== undefined) updateData.funding_goal = updates.fundingGoal;
      if (updates.status) updateData.status = updates.status;

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return convertProjectRowToProject(data);
    },
    onSuccess: (data) => {
      // Update the specific project in cache
      queryClient.setQueryData(['projects', data.organizationId, data.id], data);

      // Invalidate the projects list
      queryClient.invalidateQueries({
        queryKey: ['projects', data.organizationId],
      });
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      organizationId,
    }: {
      projectId: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return { projectId, organizationId };
    },
    onSuccess: ({ projectId, organizationId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['projects', organizationId, projectId],
      });

      // Invalidate projects list
      queryClient.invalidateQueries({
        queryKey: ['projects', organizationId],
      });
    },
  });
}
