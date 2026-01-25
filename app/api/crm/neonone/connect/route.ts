/**
 * Neon One Connect API Route
 *
 * Stores the API key and organization ID for Neon One integration.
 * Neon One uses API key + org ID for Basic authentication.
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

    // Parse request body for API key and org ID
    const body = await request.json();
    const { apiKey, neonOrgId } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!neonOrgId || typeof neonOrgId !== 'string') {
      return NextResponse.json(
        { error: 'Neon One organization ID is required' },
        { status: 400 }
      );
    }

    // Validate credentials by making a test request to Neon One
    const authString = Buffer.from(`${neonOrgId}:${apiKey}`).toString('base64');
    const testResponse = await fetch(
      'https://api.neoncrm.com/v2/accounts?pageSize=1',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('[Neon One Connect] Validation failed:', errorText);
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your API key and organization ID.' },
        { status: 400 }
      );
    }

    // Store credentials in database
    // apiSecret is used to store the Neon One organization ID
    const credentials: APIKeyCredentials = {
      type: 'api_key',
      apiKey,
      apiSecret: neonOrgId,
    };

    await storeCredentials(profile.organization_id, 'neonone', credentials);

    // Log the connection activity
    await logCRMActivity(profile.organization_id, 'crm_connected', {
      provider: 'neonone',
    });

    return NextResponse.json({
      success: true,
      message: 'Neon One connected successfully',
    });
  } catch (error) {
    console.error('[Neon One Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Neon One' },
      { status: 500 }
    );
  }
}
