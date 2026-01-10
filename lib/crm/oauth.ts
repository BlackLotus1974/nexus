/**
 * OAuth Token Management for CRM Integrations
 *
 * Handles OAuth 2.0 flows, token storage, encryption, and refresh logic
 * for all CRM providers that use OAuth authentication.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  CRMProvider,
  OAuth2Credentials,
  CRMCredentials,
} from './types';
import { CRMAuthError } from './types';

// =============================================================================
// OAuth Configuration per Provider
// =============================================================================

export interface OAuthConfig {
  provider: CRMProvider;
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * OAuth configurations for each provider
 * Note: Client IDs and secrets should come from environment variables
 */
export const OAUTH_CONFIGS: Record<CRMProvider, Partial<OAuthConfig>> = {
  salesforce: {
    provider: 'salesforce',
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token', 'offline_access'],
  },
  hubspot: {
    provider: 'hubspot',
    authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
    ],
  },
  bloomerang: {
    provider: 'bloomerang',
    // Bloomerang uses API key auth, but including for completeness
    authorizationUrl: '',
    tokenUrl: '',
    scopes: [],
  },
  kindful: {
    provider: 'kindful',
    authorizationUrl: 'https://app.kindful.com/oauth/authorize',
    tokenUrl: 'https://app.kindful.com/oauth/token',
    scopes: ['read', 'write'],
  },
  neonone: {
    provider: 'neonone',
    // Neon One uses API key auth
    authorizationUrl: '',
    tokenUrl: '',
    scopes: [],
  },
};

// =============================================================================
// OAuth Flow Management
// =============================================================================

/**
 * Generate OAuth authorization URL for a provider
 */
export function generateAuthorizationUrl(
  provider: CRMProvider,
  state: string,
  redirectUri?: string
): string {
  const config = OAUTH_CONFIGS[provider];

  if (!config.authorizationUrl) {
    throw new CRMAuthError(
      provider,
      `OAuth is not supported for ${provider}. Use API key authentication.`
    );
  }

  const clientId = getClientId(provider);
  const finalRedirectUri = redirectUri || getRedirectUri(provider);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: finalRedirectUri,
    response_type: 'code',
    state,
    scope: config.scopes?.join(' ') || '',
  });

  // Salesforce-specific parameters
  if (provider === 'salesforce') {
    params.append('prompt', 'consent');
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  provider: CRMProvider,
  code: string,
  redirectUri?: string
): Promise<OAuth2Credentials> {
  const config = OAUTH_CONFIGS[provider];

  if (!config.tokenUrl) {
    throw new CRMAuthError(
      provider,
      `OAuth is not supported for ${provider}`
    );
  }

  const clientId = getClientId(provider);
  const clientSecret = getClientSecret(provider);
  const finalRedirectUri = redirectUri || getRedirectUri(provider);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: finalRedirectUri,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new CRMAuthError(
      provider,
      `Failed to exchange code for tokens: ${error}`
    );
  }

  const data = await response.json();

  return parseTokenResponse(provider, data);
}

/**
 * Refresh OAuth tokens
 */
export async function refreshOAuthTokens(
  provider: CRMProvider,
  refreshToken: string
): Promise<OAuth2Credentials> {
  const config = OAUTH_CONFIGS[provider];

  if (!config.tokenUrl) {
    throw new CRMAuthError(
      provider,
      `OAuth is not supported for ${provider}`
    );
  }

  const clientId = getClientId(provider);
  const clientSecret = getClientSecret(provider);

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new CRMAuthError(
      provider,
      `Failed to refresh tokens: ${error}`
    );
  }

  const data = await response.json();

  // Some providers don't return a new refresh token
  const credentials = parseTokenResponse(provider, data);
  if (!credentials.refreshToken) {
    credentials.refreshToken = refreshToken;
  }

  return credentials;
}

/**
 * Parse token response from OAuth provider
 */
function parseTokenResponse(
  provider: CRMProvider,
  data: Record<string, unknown>
): OAuth2Credentials {
  // Calculate expiration time
  const expiresIn = (data.expires_in as number) || 3600; // Default to 1 hour
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return {
    type: 'oauth2',
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    tokenType: (data.token_type as string) || 'Bearer',
    expiresAt,
    scope: data.scope as string | undefined,
    // Salesforce-specific: instance URL
    instanceUrl: data.instance_url as string | undefined,
  };
}

// =============================================================================
// Credential Storage
// =============================================================================

/**
 * Store CRM credentials securely in the database
 */
export async function storeCredentials(
  organizationId: string,
  provider: CRMProvider,
  credentials: CRMCredentials
): Promise<void> {
  const supabase = createClient();

  // Encrypt sensitive credential data
  const encryptedCredentials = await encryptCredentials(credentials);

  const { error } = await supabase
    .from('crm_integrations')
    .upsert({
      organization_id: organizationId,
      crm_type: provider,
      credentials: encryptedCredentials,
      sync_status: 'connected',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'organization_id,crm_type',
    });

  if (error) {
    throw new CRMAuthError(
      provider,
      `Failed to store credentials: ${error.message}`
    );
  }
}

/**
 * Retrieve CRM credentials from the database
 */
export async function retrieveCredentials(
  organizationId: string,
  provider: CRMProvider
): Promise<CRMCredentials | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('crm_integrations')
    .select('credentials')
    .eq('organization_id', organizationId)
    .eq('crm_type', provider)
    .single();

  if (error || !data) {
    return null;
  }

  // Decrypt credentials
  return decryptCredentials(data.credentials as Record<string, unknown>);
}

/**
 * Delete CRM credentials from the database
 */
export async function deleteCredentials(
  organizationId: string,
  provider: CRMProvider
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('crm_integrations')
    .delete()
    .eq('organization_id', organizationId)
    .eq('crm_type', provider);

  if (error) {
    throw new CRMAuthError(
      provider,
      `Failed to delete credentials: ${error.message}`
    );
  }
}

/**
 * Update sync status in the database
 */
export async function updateSyncStatus(
  organizationId: string,
  provider: CRMProvider,
  status: string,
  lastSync?: Date
): Promise<void> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {
    sync_status: status,
    updated_at: new Date().toISOString(),
  };

  if (lastSync) {
    updateData.last_sync = lastSync.toISOString();
  }

  const { error } = await supabase
    .from('crm_integrations')
    .update(updateData)
    .eq('organization_id', organizationId)
    .eq('crm_type', provider);

  if (error) {
    console.error(`Failed to update sync status: ${error.message}`);
  }
}

// =============================================================================
// Encryption (Placeholder - should use proper encryption in production)
// =============================================================================

/**
 * Encrypt credentials for storage
 * NOTE: In production, use proper AES-256 encryption with a secure key
 */
async function encryptCredentials(
  credentials: CRMCredentials
): Promise<Record<string, unknown>> {
  // For now, we're relying on Supabase's encryption at rest
  // In production, add application-level encryption here

  // Convert Date objects to ISO strings for JSON storage
  const serialized = JSON.parse(JSON.stringify(credentials, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));

  return serialized;
}

/**
 * Decrypt credentials after retrieval
 */
function decryptCredentials(
  encrypted: Record<string, unknown>
): CRMCredentials {
  // In production, decrypt here

  // Convert ISO date strings back to Date objects
  if (encrypted.type === 'oauth2' && encrypted.expiresAt) {
    encrypted.expiresAt = new Date(encrypted.expiresAt as string);
  }

  return encrypted as CRMCredentials;
}

// =============================================================================
// Environment Helpers
// =============================================================================

/**
 * Get OAuth client ID for a provider from environment
 */
function getClientId(provider: CRMProvider): string {
  const envKey = `${provider.toUpperCase()}_CLIENT_ID`;
  const clientId = process.env[envKey];

  if (!clientId) {
    throw new CRMAuthError(
      provider,
      `Missing environment variable: ${envKey}`
    );
  }

  return clientId;
}

/**
 * Get OAuth client secret for a provider from environment
 */
function getClientSecret(provider: CRMProvider): string {
  const envKey = `${provider.toUpperCase()}_CLIENT_SECRET`;
  const clientSecret = process.env[envKey];

  if (!clientSecret) {
    throw new CRMAuthError(
      provider,
      `Missing environment variable: ${envKey}`
    );
  }

  return clientSecret;
}

/**
 * Get OAuth redirect URI
 */
function getRedirectUri(provider: CRMProvider): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/crm/${provider}/callback`;
}

// =============================================================================
// State Management (for CSRF protection)
// =============================================================================

/**
 * Generate a state parameter for OAuth flow
 */
export function generateOAuthState(
  organizationId: string,
  provider: CRMProvider
): string {
  const stateData = {
    organizationId,
    provider,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2),
  };

  return Buffer.from(JSON.stringify(stateData)).toString('base64url');
}

/**
 * Validate and parse OAuth state parameter
 */
export function validateOAuthState(
  state: string
): { organizationId: string; provider: CRMProvider } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const data = JSON.parse(decoded);

    // Check if state is not too old (5 minutes)
    const age = Date.now() - data.timestamp;
    if (age > 5 * 60 * 1000) {
      return null;
    }

    return {
      organizationId: data.organizationId,
      provider: data.provider,
    };
  } catch {
    return null;
  }
}
