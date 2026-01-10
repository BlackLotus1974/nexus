import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';

/**
 * Auth utility functions for Supabase authentication
 * Provides server-safe methods for auth operations
 */

// Get current user
export async function getUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

// Get current session
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Get user profile
export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Sign out
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error as Error };
  }
}

// Sign in with email and password
export async function signInWithPassword(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { data: null, error: error as Error };
  }
}

// Sign up with email and password
export async function signUpWithPassword(email: string, password: string, fullName?: string) {
  try {
    console.log('[Auth Utils] signUpWithPassword called for:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    console.log('[Auth Utils] Supabase signUp response:', { data, error });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Auth Utils] Error signing up:', error);
    return { data: null, error: error as Error };
  }
}

// Reset password
export async function resetPasswordForEmail(email: string) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { data: null, error: error as Error };
  }
}

// Update password
export async function updatePassword(newPassword: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating password:', error);
    return { data: null, error: error as Error };
  }
}

// Sign in with OAuth provider
export async function signInWithOAuth(provider: 'google' | 'azure') {
  try {
    console.log('[Auth Utils] signInWithOAuth called for provider:', provider);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    console.log('[Auth Utils] OAuth response:', { data, error });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Auth Utils] Error signing in with OAuth:', error);
    return { data: null, error: error as Error };
  }
}

// Parse auth error messages for user-friendly display
export function getAuthErrorMessage(error: Error | null | undefined): string {
  if (!error) return 'An unknown error occurred';

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email before logging in';
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists';
  }
  if (message.includes('password should be at least')) {
    return 'Password must be at least 6 characters';
  }
  if (message.includes('invalid email')) {
    return 'Please enter a valid email address';
  }
  if (message.includes('network')) {
    return 'Network error. Please check your connection';
  }

  return error.message;
}
