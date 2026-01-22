'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeAuth, setUser } from '@/store/slices/authSlice';
import { supabase } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * AuthProvider - Manages authentication state across the application
 *
 * Responsibilities:
 * - Initialize auth state on app load
 * - Listen to auth state changes from Supabase
 * - Update Redux store when auth state changes
 * - Handle session refresh automatically
 * - Fetch and update user profile data
 */

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();
  const { initialized } = useAppSelector((state) => state.auth);
  const initializingRef = useRef(false);

  useEffect(() => {
    // Guard against multiple initializations (React StrictMode, fast refresh, etc.)
    if (initialized || initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    // Initialize auth state on mount
    dispatch(initializeAuth()).finally(() => {
      // Keep ref true to prevent re-init even if component remounts
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state change:', event, session?.user?.email);

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session?.user) {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('[AuthProvider] Error fetching profile:', profileError);

              // If profile doesn't exist or permission denied, sign out and clear cookies
              if (profileError.code === 'PGRST116' || profileError.message.includes('406')) {
                console.warn('[AuthProvider] Profile not found or inaccessible. Signing out to clear stale session.');
                await supabase.auth.signOut();
                return;
              }
            }

            dispatch(
              setUser({
                user: session.user,
                profile: profile as any || null,
                session,
              })
            );
          }
          break;

        case 'SIGNED_OUT':
          dispatch(
            setUser({
              user: null,
              profile: null,
              session: null,
            })
          );
          break;

        case 'PASSWORD_RECOVERY':
          // User clicked reset password link
          console.log('Password recovery initiated');
          break;

        default:
          break;
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, initialized]);

  return <>{children}</>;
}
