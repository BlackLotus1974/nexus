/**
 * HubSpot OAuth Connect Handler
 *
 * Initiates the OAuth 2.0 flow by redirecting to HubSpot's authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  generateAuthorizationUrl,
  generateOAuthState,
} from '@/lib/crm/oauth';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/login?redirect=/crm', request.url)
      );
    }

    // Get the user's organization ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.redirect(
        new URL('/crm?error=Organization%20not%20found', request.url)
      );
    }

    // Generate state parameter for CSRF protection
    const state = generateOAuthState(profile.organization_id, 'hubspot');

    // Generate the authorization URL
    const authUrl = generateAuthorizationUrl('hubspot', state);

    // Redirect to HubSpot's authorization page
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error('[HubSpot Connect] Error:', err);
    return NextResponse.redirect(
      new URL(
        `/crm?error=${encodeURIComponent('Failed to initiate HubSpot connection')}`,
        request.url
      )
    );
  }
}
