/**
 * Bloomerang Connect API Route
 *
 * Stores the API key for Bloomerang integration.
 * Bloomerang uses API key authentication instead of OAuth.
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

    // Parse request body for API key
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Validate the API key by making a test request to Bloomerang
    const testResponse = await fetch(
      'https://api.bloomerang.co/v2/constituents?take=1',
      {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('[Bloomerang Connect] API key validation failed:', errorText);
      return NextResponse.json(
        { error: 'Invalid API key. Please check your credentials.' },
        { status: 400 }
      );
    }

    // Store credentials in database
    const credentials: APIKeyCredentials = {
      type: 'api_key',
      apiKey,
    };

    await storeCredentials(profile.organization_id, 'bloomerang', credentials);

    // Log the connection activity
    await logCRMActivity(profile.organization_id, 'crm_connected', {
      provider: 'bloomerang',
    });

    return NextResponse.json({
      success: true,
      message: 'Bloomerang connected successfully',
    });
  } catch (error) {
    console.error('[Bloomerang Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Bloomerang' },
      { status: 500 }
    );
  }
}
