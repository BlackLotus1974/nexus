/**
 * HubSpot OAuth Callback Handler
 *
 * Handles the OAuth 2.0 callback from HubSpot after user authorization.
 * Exchanges the authorization code for access/refresh tokens and stores them.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  validateOAuthState,
  storeCredentials,
} from '@/lib/crm/oauth';
import { logCRMActivity } from '@/lib/crm/activity-logger';
import type { CRMProvider } from '@/lib/crm/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from HubSpot
  if (error) {
    console.error('[HubSpot OAuth] Error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/crm?error=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/crm?error=Missing%20required%20parameters', request.url)
    );
  }

  // Validate and parse state parameter (CSRF protection)
  const stateData = validateOAuthState(state);
  if (!stateData) {
    return NextResponse.redirect(
      new URL('/crm?error=Invalid%20or%20expired%20state', request.url)
    );
  }

  const { organizationId, provider } = stateData;

  // Verify this is a HubSpot callback
  if (provider !== 'hubspot') {
    return NextResponse.redirect(
      new URL('/crm?error=Invalid%20provider', request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const credentials = await exchangeCodeForTokens('hubspot', code);

    // Store credentials in database
    await storeCredentials(organizationId, 'hubspot', credentials);

    // Log the connection activity
    await logCRMActivity(organizationId, 'crm_connected', {
      provider: 'hubspot',
    });

    // Redirect to CRM page with success message
    return NextResponse.redirect(
      new URL('/crm?success=HubSpot%20connected%20successfully', request.url)
    );
  } catch (err) {
    console.error('[HubSpot OAuth] Token exchange failed:', err);

    // Log the error
    await logCRMActivity(organizationId, 'crm_error', {
      provider: 'hubspot',
      error: {
        code: 'OAUTH_CALLBACK_FAILED',
        message: (err as Error).message,
      },
    });

    return NextResponse.redirect(
      new URL(
        `/crm?error=${encodeURIComponent('Failed to connect to HubSpot. Please try again.')}`,
        request.url
      )
    );
  }
}
