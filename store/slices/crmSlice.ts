import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase/client';
import type { CRMIntegration } from '@/types';
import type { Database } from '@/types/database';

type CRMIntegrationRow = Database['public']['Tables']['crm_integrations']['Row'];

interface CRMState {
  integrations: CRMIntegration[];
  selectedIntegration: CRMIntegration | null;
  syncStatus: Record<string, 'idle' | 'syncing' | 'success' | 'error'>;
  loading: boolean;
  error: string | null;
}

const initialState: CRMState = {
  integrations: [],
  selectedIntegration: null,
  syncStatus: {},
  loading: false,
  error: null,
};

// Helper function to convert database row to CRMIntegration type
const convertCRMRowToIntegration = (row: CRMIntegrationRow): CRMIntegration => ({
  id: row.id,
  organizationId: row.organization_id,
  crmType: row.crm_type as CRMIntegration['crmType'],
  syncStatus: row.sync_status as CRMIntegration['syncStatus'],
  lastSync: row.last_sync ? new Date(row.last_sync) : undefined,
  syncConfig: row.sync_config as Record<string, unknown>,
});

// Async thunks
export const fetchCRMIntegrations = createAsyncThunk(
  'crm/fetchIntegrations',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertCRMRowToIntegration);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createCRMIntegration = createAsyncThunk(
  'crm/createIntegration',
  async (
    integration: {
      organizationId: string;
      crmType: CRMIntegration['crmType'];
      credentials: Record<string, unknown>;
      syncConfig?: Record<string, unknown>;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data, error } = await supabase
        .from('crm_integrations')
        .insert({
          organization_id: integration.organizationId,
          crm_type: integration.crmType,
          credentials: integration.credentials as any,
          sync_config: (integration.syncConfig || {}) as any,
          sync_status: 'paused',
        })
        .select()
        .single();

      if (error) throw error;
      return convertCRMRowToIntegration(data);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCRMIntegration = createAsyncThunk(
  'crm/updateIntegration',
  async (
    {
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
    },
    { rejectWithValue }
  ) => {
    try {
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
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCRMIntegration = createAsyncThunk(
  'crm/deleteIntegration',
  async (
    { integrationId, organizationId }: { integrationId: string; organizationId: string },
    { rejectWithValue }
  ) => {
    try {
      const { error } = await supabase
        .from('crm_integrations')
        .delete()
        .eq('id', integrationId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return integrationId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const triggerCRMSync = createAsyncThunk(
  'crm/triggerSync',
  async (
    { integrationId, organizationId }: { integrationId: string; organizationId: string },
    { rejectWithValue }
  ) => {
    try {
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
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const crmSlice = createSlice({
  name: 'crm',
  initialState,
  reducers: {
    setSelectedIntegration: (state, action: PayloadAction<CRMIntegration | null>) => {
      state.selectedIntegration = action.payload;
    },
    setSyncStatus: (
      state,
      action: PayloadAction<{ integrationId: string; status: 'idle' | 'syncing' | 'success' | 'error' }>
    ) => {
      state.syncStatus[action.payload.integrationId] = action.payload.status;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch integrations
    builder
      .addCase(fetchCRMIntegrations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMIntegrations.fulfilled, (state, action) => {
        state.loading = false;
        state.integrations = action.payload;
      })
      .addCase(fetchCRMIntegrations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create integration
    builder
      .addCase(createCRMIntegration.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCRMIntegration.fulfilled, (state, action) => {
        state.loading = false;
        state.integrations.unshift(action.payload);
        state.selectedIntegration = action.payload;
      })
      .addCase(createCRMIntegration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update integration
    builder
      .addCase(updateCRMIntegration.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCRMIntegration.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.integrations.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.integrations[index] = action.payload;
        }
        if (state.selectedIntegration?.id === action.payload.id) {
          state.selectedIntegration = action.payload;
        }
      })
      .addCase(updateCRMIntegration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete integration
    builder
      .addCase(deleteCRMIntegration.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCRMIntegration.fulfilled, (state, action) => {
        state.loading = false;
        state.integrations = state.integrations.filter((i) => i.id !== action.payload);
        if (state.selectedIntegration?.id === action.payload) {
          state.selectedIntegration = null;
        }
        delete state.syncStatus[action.payload];
      })
      .addCase(deleteCRMIntegration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Trigger sync
    builder
      .addCase(triggerCRMSync.pending, (state, action) => {
        state.syncStatus[action.meta.arg.integrationId] = 'syncing';
      })
      .addCase(triggerCRMSync.fulfilled, (state, action) => {
        state.syncStatus[action.payload.id] = 'success';
        const index = state.integrations.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.integrations[index] = action.payload;
        }
        if (state.selectedIntegration?.id === action.payload.id) {
          state.selectedIntegration = action.payload;
        }
      })
      .addCase(triggerCRMSync.rejected, (state, action) => {
        state.syncStatus[action.meta.arg.integrationId] = 'error';
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedIntegration, setSyncStatus, clearError } = crmSlice.actions;

export default crmSlice.reducer;
