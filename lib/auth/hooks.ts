import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { signOut as signOutAction } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Custom auth hooks for accessing auth state and actions
 * These hooks provide a clean API for components to interact with auth
 */

// Hook to get current auth state
export function useAuth() {
  const { user, profile, session, loading, error, initialized, organizationId } = useAppSelector(
    (state) => state.auth
  );

  return {
    user,
    profile,
    session,
    loading,
    error,
    initialized,
    organizationId,
    isAuthenticated: !!user,
  };
}

// Hook to get current user
export function useUser() {
  const { user } = useAppSelector((state) => state.auth);
  return user;
}

// Hook to get current session
export function useSession() {
  const { session } = useAppSelector((state) => state.auth);
  return session;
}

// Hook to get current profile
export function useProfile() {
  const { profile } = useAppSelector((state) => state.auth);
  return profile;
}

// Hook to get organization ID
export function useOrganizationId() {
  const { organizationId } = useAppSelector((state) => state.auth);
  return organizationId;
}

// Hook to check if user has specific role
export function useHasRole(requiredRole: 'user' | 'admin' | 'owner') {
  const { profile } = useAppSelector((state) => state.auth);

  if (!profile?.role) return false;

  const roleHierarchy: Record<string, number> = {
    user: 0,
    admin: 1,
    owner: 2,
  };

  const userRoleLevel = roleHierarchy[profile.role] ?? 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] ?? 0;

  return userRoleLevel >= requiredRoleLevel;
}

// Hook for sign out functionality
export function useSignOut() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await dispatch(signOutAction());
    router.push('/login');
  }, [dispatch, router]);

  return handleSignOut;
}

// Hook to check auth initialization status
export function useAuthInitialized() {
  const { initialized } = useAppSelector((state) => state.auth);
  return initialized;
}

// Hook to require authentication (redirects if not authenticated)
export function useRequireAuth(redirectTo: string = '/login') {
  const { user, initialized } = useAppSelector((state) => state.auth);
  const router = useRouter();

  if (initialized && !user) {
    router.push(redirectTo);
  }

  return { user, initialized };
}
