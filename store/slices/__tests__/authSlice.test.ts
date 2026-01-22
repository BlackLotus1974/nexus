/**
 * Tests for Auth Redux Slice
 */

import authReducer, {
  setUser,
  clearError,
  setOrganization,
  initializeAuth,
  signIn,
  signOut,
} from '../authSlice';
import {
  createAuthState,
  createMockUser,
  createMockProfile,
  createMockSession,
} from '@/lib/test/fixtures';

describe('authSlice', () => {
  describe('reducers', () => {
    describe('setUser', () => {
      it('should set user, profile, session, and organizationId', () => {
        const initialState = createAuthState();
        const user = createMockUser();
        const profile = createMockProfile({ organization_id: 'org-123' });
        const session = createMockSession({ user });

        const nextState = authReducer(
          initialState,
          setUser({ user, profile, session })
        );

        expect(nextState.user).toBe(user);
        expect(nextState.profile).toBe(profile);
        expect(nextState.session).toBe(session);
        expect(nextState.organizationId).toBe('org-123');
      });

      it('should handle null values', () => {
        const initialState = createAuthState({
          user: createMockUser(),
          profile: createMockProfile(),
          session: createMockSession(),
          organizationId: 'org-123',
        });

        const nextState = authReducer(
          initialState,
          setUser({ user: null, profile: null, session: null })
        );

        expect(nextState.user).toBeNull();
        expect(nextState.profile).toBeNull();
        expect(nextState.session).toBeNull();
        expect(nextState.organizationId).toBeNull();
      });

      it('should set organizationId to null when profile has no organization_id', () => {
        const initialState = createAuthState();
        const user = createMockUser();
        const profile = createMockProfile({ organization_id: null });
        const session = createMockSession({ user });

        const nextState = authReducer(
          initialState,
          setUser({ user, profile, session })
        );

        expect(nextState.organizationId).toBeNull();
      });
    });

    describe('clearError', () => {
      it('should clear the error state', () => {
        const initialState = createAuthState({ error: 'Some error' });

        const nextState = authReducer(initialState, clearError());

        expect(nextState.error).toBeNull();
      });

      it('should not affect other state', () => {
        const user = createMockUser();
        const initialState = createAuthState({
          error: 'Some error',
          user,
          loading: false,
        });

        const nextState = authReducer(initialState, clearError());

        expect(nextState.user).toBe(user);
        expect(nextState.loading).toBe(false);
      });
    });

    describe('setOrganization', () => {
      it('should set the organization ID', () => {
        const initialState = createAuthState();

        const nextState = authReducer(initialState, setOrganization('new-org-id'));

        expect(nextState.organizationId).toBe('new-org-id');
      });

      it('should update existing organization ID', () => {
        const initialState = createAuthState({ organizationId: 'old-org-id' });

        const nextState = authReducer(initialState, setOrganization('new-org-id'));

        expect(nextState.organizationId).toBe('new-org-id');
      });
    });
  });

  describe('extraReducers', () => {
    describe('initializeAuth', () => {
      it('should set loading to true on pending', () => {
        const initialState = createAuthState();
        const action = { type: initializeAuth.pending.type };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(true);
        expect(nextState.error).toBeNull();
      });

      it('should set initialized and user data on fulfilled', () => {
        const initialState = createAuthState({ loading: true });
        const user = createMockUser();
        const profile = createMockProfile({ organization_id: 'org-123' });
        const session = createMockSession({ user });

        const action = {
          type: initializeAuth.fulfilled.type,
          payload: { user, profile, session },
        };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.initialized).toBe(true);
        expect(nextState.user).toBe(user);
        expect(nextState.profile).toBe(profile);
        expect(nextState.session).toBe(session);
        expect(nextState.organizationId).toBe('org-123');
      });

      it('should handle fulfilled with null user', () => {
        const initialState = createAuthState({ loading: true });
        const action = {
          type: initializeAuth.fulfilled.type,
          payload: { user: null, profile: null, session: null },
        };

        const nextState = authReducer(initialState, action);

        expect(nextState.initialized).toBe(true);
        expect(nextState.user).toBeNull();
        expect(nextState.profile).toBeNull();
      });

      it('should set error on rejected', () => {
        const initialState = createAuthState({ loading: true });
        const action = {
          type: initializeAuth.rejected.type,
          payload: 'Session expired',
        };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.initialized).toBe(true);
        expect(nextState.error).toBe('Session expired');
      });
    });

    describe('signIn', () => {
      it('should set loading to true on pending', () => {
        const initialState = createAuthState();
        const action = { type: signIn.pending.type };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(true);
        expect(nextState.error).toBeNull();
      });

      it('should set user data on fulfilled', () => {
        const initialState = createAuthState({ loading: true });
        const user = createMockUser();
        const profile = createMockProfile({ organization_id: 'org-456' });
        const session = createMockSession({ user });

        const action = {
          type: signIn.fulfilled.type,
          payload: { user, profile, session },
        };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.user).toBe(user);
        expect(nextState.profile).toBe(profile);
        expect(nextState.session).toBe(session);
        expect(nextState.organizationId).toBe('org-456');
      });

      it('should set error on rejected', () => {
        const initialState = createAuthState({ loading: true });
        const action = {
          type: signIn.rejected.type,
          payload: 'Invalid credentials',
        };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.error).toBe('Invalid credentials');
      });
    });

    describe('signOut', () => {
      it('should set loading to true on pending', () => {
        const user = createMockUser();
        const initialState = createAuthState({ user });
        const action = { type: signOut.pending.type };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(true);
        expect(nextState.error).toBeNull();
      });

      it('should clear all auth data on fulfilled', () => {
        const initialState = createAuthState({
          user: createMockUser(),
          profile: createMockProfile(),
          session: createMockSession(),
          organizationId: 'org-123',
          loading: true,
        });
        const action = { type: signOut.fulfilled.type };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.user).toBeNull();
        expect(nextState.profile).toBeNull();
        expect(nextState.session).toBeNull();
        expect(nextState.organizationId).toBeNull();
      });

      it('should set error on rejected', () => {
        const initialState = createAuthState({ loading: true });
        const action = {
          type: signOut.rejected.type,
          payload: 'Sign out failed',
        };

        const nextState = authReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.error).toBe('Sign out failed');
      });
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = authReducer(undefined, { type: 'unknown' });

      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.session).toBeNull();
      expect(state.organizationId).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.initialized).toBe(false);
    });
  });
});
