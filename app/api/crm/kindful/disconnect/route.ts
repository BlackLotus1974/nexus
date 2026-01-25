/**
 * Kindful Disconnect API Route
 *
 * Disconnects the Kindful integration by removing stored credentials.
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

    // Delete credentials from database
    await deleteCredentials(profile.organization_id, 'kindful');

    // Log the disconnection
    await logCRMActivity(profile.organization_id, 'crm_disconnected', {
      provider: 'kindful',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Kindful Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Kindful' },
      { status: 500 }
    );
  }
}
