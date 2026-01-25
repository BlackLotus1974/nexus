/**
 * Kindful Connect API Route
 *
 * Stores the API token for Kindful integration.
 * Kindful uses API token authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { storeCredentials } from '@/lib/crm/oauth';
import { logCRMActivity } from '@/lib/crm/activity-logger';
import type { APIKeyCredentials } from '@/lib/crm/types';

export async function POST(request: NextRequest) {
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

    // Parse request body for API token
    const body = await request.json();
    const { apiToken } = body;

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    // Validate the API token by making a test request to Kindful
    const testResponse = await fetch(
      'https://app.kindful.com/api/v1/contacts?per_page=1',
      {
        method: 'GET',
        headers: {
          'Authorization': `Token token=${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('[Kindful Connect] API token validation failed:', errorText);
      return NextResponse.json(
        { error: 'Invalid API token. Please check your credentials.' },
        { status: 400 }
      );
    }

    // Store credentials in database
    const credentials: APIKeyCredentials = {
      type: 'api_key',
      apiKey: apiToken,
    };

    await storeCredentials(profile.organization_id, 'kindful', credentials);

    // Log the connection activity
    await logCRMActivity(profile.organization_id, 'crm_connected', {
      provider: 'kindful',
    });

    return NextResponse.json({
      success: true,
      message: 'Kindful connected successfully',
    });
  } catch (error) {
    console.error('[Kindful Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Kindful' },
      { status: 500 }
    );
  }
}
