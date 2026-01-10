import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  organizationId: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  organizationId: null,
  loading: false,
  error: null,
  initialized: false,
};

// Async thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[AuthSlice] Initializing auth...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[AuthSlice] Session error:', sessionError);
        throw sessionError;
      }

      if (!session?.user) {
        console.log('[AuthSlice] No session found');
        return { user: null, profile: null, session: null };
      }

      console.log('[AuthSlice] Session found for:', session.user.email);

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('[AuthSlice] Profile fetch error during init:', profileError);
        // Don't fail initialization if profile fetch fails - just log it
        console.warn('[AuthSlice] Continuing with null profile');
      }

      console.log('[AuthSlice] Initialization complete:', {
        hasUser: !!session.user,
        hasProfile: !!profile
      });

      return {
        user: session.user,
        profile: profile || null,
        session,
      };
    } catch (error: any) {
      console.error('[AuthSlice] Initialize failed:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('[AuthSlice] Attempting signInWithPassword for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[AuthSlice] signInWithPassword response:', { data, error });

      if (error) {
        console.error('[AuthSlice] Auth error:', error.message);
        throw error;
      }
      if (!data.user) {
        console.error('[AuthSlice] No user returned');
        throw new Error('No user returned');
      }

      console.log('[AuthSlice] User authenticated, fetching profile for:', data.user.id);

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('[AuthSlice] Profile fetch response:', { profile, profileError });

      if (profileError) {
        console.error('[AuthSlice] Profile fetch error:', profileError);
        throw profileError;
      }

      console.log('[AuthSlice] Login successful');
      return {
        user: data.user,
        profile,
        session: data.session,
      };
    } catch (error: any) {
      console.error('[AuthSlice] signIn failed:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<Profile>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const userId = state.auth.user?.id;

      if (!userId) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ user: User | null; profile: Profile | null; session: Session | null }>) => {
      state.user = action.payload.user;
      state.profile = action.payload.profile;
      state.session = action.payload.session;
      state.organizationId = action.payload.profile?.organization_id || null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setOrganization: (state, action: PayloadAction<string>) => {
      state.organizationId = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Initialize auth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.session = action.payload.session;
        state.organizationId = action.payload.profile?.organization_id || null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error = action.payload as string;
      });

    // Sign in
    builder
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.session = action.payload.session;
        state.organizationId = action.payload.profile?.organization_id || null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Sign out
    builder
      .addCase(signOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.profile = null;
        state.session = null;
        state.organizationId = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.organizationId = action.payload.organization_id;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUser, clearError, setOrganization } = authSlice.actions;
export default authSlice.reducer;
