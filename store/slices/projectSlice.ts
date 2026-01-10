import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/types';
import type { Database } from '@/types/database';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  filters: ProjectFilters;
  loading: boolean;
  error: string | null;
}

interface ProjectFilters {
  status?: 'active' | 'completed' | 'archived';
}

const initialState: ProjectState = {
  projects: [],
  selectedProject: null,
  filters: {},
  loading: false,
  error: null,
};

// Helper function to convert database row to Project type
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

// Async thunks
export const fetchProjects = createAsyncThunk(
  'project/fetchProjects',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertProjectRowToProject);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'project/fetchProjectById',
  async (
    { projectId, organizationId }: { projectId: string; organizationId: string },
    { rejectWithValue }
  ) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return convertProjectRowToProject(data);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createProject = createAsyncThunk(
  'project/createProject',
  async (
    project: {
      name: string;
      description?: string;
      conceptNote?: string;
      fundingGoal?: number;
      organizationId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description,
          concept_note: project.conceptNote,
          funding_goal: project.fundingGoal,
          organization_id: project.organizationId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return convertProjectRowToProject(data);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProject = createAsyncThunk(
  'project/updateProject',
  async (
    {
      projectId,
      organizationId,
      updates,
    }: {
      projectId: string;
      organizationId: string;
      updates: Partial<Omit<Project, 'id' | 'organizationId' | 'createdAt'>>;
    },
    { rejectWithValue }
  ) => {
    try {
      const updateData: any = {};

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
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProject = createAsyncThunk(
  'project/deleteProject',
  async (
    { projectId, organizationId }: { projectId: string; organizationId: string },
    { rejectWithValue }
  ) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return projectId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setSelectedProject: (state, action: PayloadAction<Project | null>) => {
      state.selectedProject = action.payload;
    },
    setFilters: (state, action: PayloadAction<ProjectFilters>) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch project by ID
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProject = action.payload;

        // Update in projects list if exists
        const index = state.projects.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        } else {
          state.projects.unshift(action.payload);
        }
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.unshift(action.payload);
        state.selectedProject = action.payload;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update project
    builder
      .addCase(updateProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.projects.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.selectedProject?.id === action.payload.id) {
          state.selectedProject = action.payload;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete project
    builder
      .addCase(deleteProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = state.projects.filter((p) => p.id !== action.payload);
        if (state.selectedProject?.id === action.payload) {
          state.selectedProject = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedProject, setFilters, clearError } = projectSlice.actions;

export default projectSlice.reducer;
