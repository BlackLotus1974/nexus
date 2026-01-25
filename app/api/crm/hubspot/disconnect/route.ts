/**
 * HubSpot Disconnect API Route
 *
 * Disconnects the HubSpot integration by revoking tokens and removing credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteCredentials } from '@/lib/crm/oauth';
import { logCRMActivity } from '@/lib/crm/activity-logger';

export async function POST(_request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's organization ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get the current credentials to revoke the refresh token
    const { data: integration } = await supabase
      .from('crm_integrations')
      .select('credentials')
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', 'hubspot')
      .single();

    if (integration?.credentials) {
      const credentials = integration.credentials as {
        type: string;
        refreshToken?: string;
      };

      // Revoke the refresh token with HubSpot
      if (credentials.type === 'oauth2' && credentials.refreshToken) {
        try {
          await fetch(
            `https://api.hubapi.com/oauth/v1/refresh-tokens/${credentials.refreshToken}`,
            { method: 'DELETE' }
          );
        } catch (revokeError) {
          console.warn('[HubSpot Disconnect] Token revocation failed:', revokeError);
          // Continue with disconnect even if revocation fails
        }
      }
    }

    // Delete credentials from database
    await deleteCredentials(profile.organization_id, 'hubspot');

    // Log the disconnection
    await logCRMActivity(profile.organization_id, 'crm_disconnected', {
      provider: 'hubspot',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[HubSpot Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect HubSpot' },
      { status: 500 }
    );
  }
}
