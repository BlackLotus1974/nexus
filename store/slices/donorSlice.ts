import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase/client';
import type { Donor } from '@/types';
import type { Database } from '@/types/database';

type DonorRow = Database['public']['Tables']['donors']['Row'];

interface DonorState {
  donors: Donor[];
  selectedDonor: Donor | null;
  searchQuery: string;
  filterCriteria: DonorFilterCriteria;
  searchHistory: string[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

interface DonorFilterCriteria {
  location?: string;
  hasRelationships?: boolean;
  lastUpdatedAfter?: Date;
}

const initialState: DonorState = {
  donors: [],
  selectedDonor: null,
  searchQuery: '',
  filterCriteria: {},
  searchHistory: [],
  loading: false,
  error: null,
  lastFetch: null,
};

// Helper function to convert database row to Donor type
const convertDonorRowToDonor = (row: DonorRow): Donor => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  location: row.location || undefined,
  intelligenceData: row.intelligence_data as any,
  lastUpdated: new Date(row.last_updated || new Date()),
  createdAt: new Date(row.created_at || new Date()),
});

// Async thunks
export const fetchDonors = createAsyncThunk(
  'donor/fetchDonors',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(convertDonorRowToDonor);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDonorById = createAsyncThunk(
  'donor/fetchDonorById',
  async ({ donorId, organizationId }: { donorId: string; organizationId: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('id', donorId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return convertDonorRowToDonor(data);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createDonor = createAsyncThunk(
  'donor/createDonor',
  async (
    donor: { name: string; location?: string; organizationId: string },
    { rejectWithValue }
  ) => {
    try {
      const { data, error } = await supabase
        .from('donors')
        .insert({
          name: donor.name,
          location: donor.location,
          organization_id: donor.organizationId,
          intelligence_data: {},
        })
        .select()
        .single();

      if (error) throw error;
      return convertDonorRowToDonor(data);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateDonor = createAsyncThunk(
  'donor/updateDonor',
  async (
    {
      donorId,
      organizationId,
      updates,
    }: {
      donorId: string;
      organizationId: string;
      updates: Partial<Omit<Donor, 'id' | 'organizationId' | 'createdAt'>>;
    },
    { rejectWithValue }
  ) => {
    try {
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.intelligenceData) updateData.intelligence_data = updates.intelligenceData;
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
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteDonor = createAsyncThunk(
  'donor/deleteDonor',
  async (
    { donorId, organizationId }: { donorId: string; organizationId: string },
    { rejectWithValue }
  ) => {
    try {
      const { error } = await supabase
        .from('donors')
        .delete()
        .eq('id', donorId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return donorId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchDonors = createAsyncThunk(
  'donor/searchDonors',
  async (
    { organizationId, query }: { organizationId: string; query: string },
    { rejectWithValue }
  ) => {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId)
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { donors: data.map(convertDonorRowToDonor), query };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const donorSlice = createSlice({
  name: 'donor',
  initialState,
  reducers: {
    setSelectedDonor: (state, action: PayloadAction<Donor | null>) => {
      state.selectedDonor = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilterCriteria: (state, action: PayloadAction<DonorFilterCriteria>) => {
      state.filterCriteria = action.payload;
    },
    addToSearchHistory: (state, action: PayloadAction<string>) => {
      if (!state.searchHistory.includes(action.payload)) {
        state.searchHistory = [action.payload, ...state.searchHistory.slice(0, 9)]; // Keep last 10
      }
    },
    clearSearchHistory: (state) => {
      state.searchHistory = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch donors
    builder
      .addCase(fetchDonors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDonors.fulfilled, (state, action) => {
        state.loading = false;
        state.donors = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchDonors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch donor by ID
    builder
      .addCase(fetchDonorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDonorById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedDonor = action.payload;

        // Update in donors list if exists
        const index = state.donors.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.donors[index] = action.payload;
        } else {
          state.donors.unshift(action.payload);
        }
      })
      .addCase(fetchDonorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create donor
    builder
      .addCase(createDonor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDonor.fulfilled, (state, action) => {
        state.loading = false;
        state.donors.unshift(action.payload);
        state.selectedDonor = action.payload;
      })
      .addCase(createDonor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update donor
    builder
      .addCase(updateDonor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDonor.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.donors.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.donors[index] = action.payload;
        }
        if (state.selectedDonor?.id === action.payload.id) {
          state.selectedDonor = action.payload;
        }
      })
      .addCase(updateDonor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete donor
    builder
      .addCase(deleteDonor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDonor.fulfilled, (state, action) => {
        state.loading = false;
        state.donors = state.donors.filter((d) => d.id !== action.payload);
        if (state.selectedDonor?.id === action.payload) {
          state.selectedDonor = null;
        }
      })
      .addCase(deleteDonor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Search donors
    builder
      .addCase(searchDonors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchDonors.fulfilled, (state, action) => {
        state.loading = false;
        state.donors = action.payload.donors;
        state.searchQuery = action.payload.query;
        if (action.payload.query && !state.searchHistory.includes(action.payload.query)) {
          state.searchHistory = [action.payload.query, ...state.searchHistory.slice(0, 9)];
        }
      })
      .addCase(searchDonors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedDonor,
  setSearchQuery,
  setFilterCriteria,
  addToSearchHistory,
  clearSearchHistory,
  clearError,
} = donorSlice.actions;

export default donorSlice.reducer;
