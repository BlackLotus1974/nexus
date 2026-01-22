import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Client-side Supabase client with proper cookie handling
 *
 * Uses @supabase/ssr for modern cookie storage that works correctly
 * with Next.js App Router and middleware.
 */

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Limit retry attempts to prevent infinite loops when Supabase is down
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-client-info': 'nexus-app',
        },
      },
    }
  );
}

// Export a singleton instance
export const supabase = createClient();
