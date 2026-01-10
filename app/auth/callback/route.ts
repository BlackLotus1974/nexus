import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * OAuth Callback Route Handler
 * Handles the OAuth callback from Google/Microsoft authentication
 */

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Exchange code for session
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
    } catch (err) {
      console.error('Unexpected error during OAuth callback:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=Authentication failed`
      );
    }
  }

  // No code provided
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
