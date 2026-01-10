/**
 * CRM Service Orchestrator
 *
 * Central service for managing CRM integrations across all providers.
 * Handles adapter lifecycle, connection management, and sync orchestration.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  CRMProvider,
  CRMAdapterConfig,
  CRMCredentials,
  CRMSyncConfig,
  CRMSyncResult,
  CRMConnectionStatus,
  CRMIntegration,
  ICRMAdapter,
} from './types';
import { CRMError, CRMAuthError } from './types';
import {
  retrieveCredentials,
  storeCredentials,
  deleteCredentials,
  updateSyncStatus,
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  generateOAuthState,
  validateOAuthState,
} from './oauth';
import {
  logCRMConnected,
  logCRMDisconnected,
  logCRMError,
} from './activity-logger';

// Import adapters (will be implemented in separate files)
// import { SalesforceAdapter } from './adapters/salesforce';
// import { HubSpotAdapter } from './adapters/hubspot';
// import { BloomerangAdapter } from './adapters/bloomerang';
// import { KindfulAdapter } from './adapters/kindful';
// import { NeonOneAdapter } from './adapters/neonone';

/**
 * Registry of adapter constructors by provider
 */
type AdapterConstructor = new () => ICRMAdapter;

const ADAPTER_REGISTRY: Partial<Record<CRMProvider, AdapterConstructor>> = {
  // These will be populated as adapters are implemented
  // salesforce: SalesforceAdapter,
  // hubspot: HubSpotAdapter,
  // bloomerang: BloomerangAdapter,
  // kindful: KindfulAdapter,
  // neonone: NeonOneAdapter,
};

/**
 * Register an adapter for a provider
 */
export function registerAdapter(
  provider: CRMProvider,
  adapterClass: AdapterConstructor
): void {
  ADAPTER_REGISTRY[provider] = adapterClass;
}

/**
 * CRM Service - manages all CRM integrations
 */
export class CRMService {
  private adapters: Map<string, ICRMAdapter> = new Map();
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Get OAuth authorization URL to initiate connection
   */
  getAuthorizationUrl(provider: CRMProvider, redirectUri?: string): string {
    const state = generateOAuthState(this.organizationId, provider);
    return generateAuthorizationUrl(provider, state, redirectUri);
  }

  /**
   * Complete OAuth flow with authorization code
   */
  async completeOAuthFlow(
    code: string,
    state: string,
    redirectUri?: string
  ): Promise<{ provider: CRMProvider; success: boolean }> {
    // Validate state
    const stateData = validateOAuthState(state);
    if (!stateData || stateData.organizationId !== this.organizationId) {
      throw new CRMAuthError(
        'salesforce', // Default provider for error
        'Invalid or expired OAuth state'
      );
    }

    const { provider } = stateData;

    try {
      // Exchange code for tokens
      const credentials = await exchangeCodeForTokens(provider, code, redirectUri);

      // Store credentials
      await storeCredentials(this.organizationId, provider, credentials);

      // Initialize adapter
      await this.connect(provider, credentials);

      await logCRMConnected(this.organizationId, provider);

      return { provider, success: true };
    } catch (error) {
      await logCRMError(this.organizationId, provider, {
        code: 'OAUTH_FAILED',
        message: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Connect to a CRM provider with API key credentials
   */
  async connectWithAPIKey(
    provider: CRMProvider,
    apiKey: string,
    apiSecret?: string
  ): Promise<void> {
    const credentials: CRMCredentials = {
      type: 'api_key',
      apiKey,
      apiSecret,
    };

    // Store credentials
    await storeCredentials(this.organizationId, provider, credentials);

    // Initialize adapter
    await this.connect(provider, credentials);

    await logCRMConnected(this.organizationId, provider);
  }

  /**
   * Connect to a CRM provider
   */
  async connect(
    provider: CRMProvider,
    credentials?: CRMCredentials
  ): Promise<ICRMAdapter> {
    const key = this.getAdapterKey(provider);

    // Check if already connected
    if (this.adapters.has(key)) {
      const existing = this.adapters.get(key)!;
      const status = await existing.getConnectionStatus();
      if (status === 'connected') {
        return existing;
      }
    }

    // Get credentials if not provided
    if (!credentials) {
      credentials = await retrieveCredentials(this.organizationId, provider);
      if (!credentials) {
        throw new CRMAuthError(
          provider,
          `No credentials found for ${provider}. Please connect the CRM first.`
        );
      }
    }

    // Get sync config
    const syncConfig = await this.getSyncConfig(provider);

    // Create adapter instance
    const adapter = this.createAdapter(provider);

    // Initialize adapter
    const config: CRMAdapterConfig = {
      provider,
      organizationId: this.organizationId,
      credentials,
      syncConfig,
    };

    await adapter.initialize(config);

    // Store adapter
    this.adapters.set(key, adapter);

    // Update status in database
    await updateSyncStatus(this.organizationId, provider, 'connected');

    return adapter;
  }

  /**
   * Disconnect from a CRM provider
   */
  async disconnect(provider: CRMProvider): Promise<void> {
    const key = this.getAdapterKey(provider);
    const adapter = this.adapters.get(key);

    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(key);
    }

    // Delete credentials from database
    await deleteCredentials(this.organizationId, provider);

    await logCRMDisconnected(this.organizationId, provider);
  }

  /**
   * Get connection status for a provider
   */
  async getConnectionStatus(
    provider: CRMProvider
  ): Promise<CRMConnectionStatus> {
    const key = this.getAdapterKey(provider);
    const adapter = this.adapters.get(key);

    if (adapter) {
      return adapter.getConnectionStatus();
    }

    // Check if credentials exist in database
    const credentials = await retrieveCredentials(this.organizationId, provider);
    if (credentials) {
      return 'disconnected'; // Has credentials but not connected
    }

    return 'disconnected';
  }

  /**
   * Get adapter for a provider (connects if not already connected)
   */
  async getAdapter(provider: CRMProvider): Promise<ICRMAdapter> {
    const key = this.getAdapterKey(provider);
    let adapter = this.adapters.get(key);

    if (!adapter) {
      adapter = await this.connect(provider);
    }

    return adapter;
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Sync a specific provider
   */
  async sync(
    provider: CRMProvider,
    config?: Partial<CRMSyncConfig>
  ): Promise<CRMSyncResult> {
    const adapter = await this.getAdapter(provider);
    return adapter.sync(config);
  }

  /**
   * Sync all connected providers
   */
  async syncAll(
    config?: Partial<CRMSyncConfig>
  ): Promise<Map<CRMProvider, CRMSyncResult>> {
    const results = new Map<CRMProvider, CRMSyncResult>();
    const integrations = await this.getIntegrations();

    for (const integration of integrations) {
      try {
        const result = await this.sync(integration.crmType, config);
        results.set(integration.crmType, result);
      } catch (error) {
        console.error(
          `[CRM Service] Failed to sync ${integration.crmType}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Get last sync result for a provider
   */
  async getLastSyncResult(provider: CRMProvider): Promise<CRMSyncResult | null> {
    const key = this.getAdapterKey(provider);
    const adapter = this.adapters.get(key);

    if (adapter) {
      return adapter.getLastSyncResult();
    }

    return null;
  }

  // ===========================================================================
  // Integration Management
  // ===========================================================================

  /**
   * Get all CRM integrations for this organization
   */
  async getIntegrations(): Promise<CRMIntegration[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('crm_integrations')
      .select('*')
      .eq('organization_id', this.organizationId);

    if (error) {
      console.error('[CRM Service] Failed to fetch integrations:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      crmType: row.crm_type as CRMProvider,
      credentials: row.credentials as CRMCredentials,
      syncConfig: row.sync_config as CRMSyncConfig | null,
      syncStatus: row.sync_status as CRMConnectionStatus | null,
      lastSync: row.last_sync ? new Date(row.last_sync) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Get a specific integration
   */
  async getIntegration(provider: CRMProvider): Promise<CRMIntegration | null> {
    const integrations = await this.getIntegrations();
    return integrations.find((i) => i.crmType === provider) || null;
  }

  /**
   * Update sync configuration for a provider
   */
  async updateSyncConfig(
    provider: CRMProvider,
    config: Partial<CRMSyncConfig>
  ): Promise<void> {
    const supabase = createClient();

    // Get current config
    const existing = await this.getSyncConfig(provider);
    const newConfig = { ...existing, ...config };

    const { error } = await supabase
      .from('crm_integrations')
      .update({
        sync_config: newConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', this.organizationId)
      .eq('crm_type', provider);

    if (error) {
      throw new CRMError(
        `Failed to update sync config: ${error.message}`,
        'CONFIG_ERROR',
        provider,
        true
      );
    }
  }

  /**
   * Get sync configuration for a provider
   */
  async getSyncConfig(provider: CRMProvider): Promise<CRMSyncConfig> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('crm_integrations')
      .select('sync_config')
      .eq('organization_id', this.organizationId)
      .eq('crm_type', provider)
      .single();

    if (error || !data?.sync_config) {
      // Return default config
      return {
        direction: 'bidirectional',
        syncDonors: true,
        syncDonations: true,
        syncInteractions: true,
        syncFrequencyMinutes: 60,
        conflictResolution: 'newest_wins',
      };
    }

    return data.sync_config as CRMSyncConfig;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Create an adapter instance for a provider
   */
  private createAdapter(provider: CRMProvider): ICRMAdapter {
    const AdapterClass = ADAPTER_REGISTRY[provider];

    if (!AdapterClass) {
      throw new CRMError(
        `No adapter registered for provider: ${provider}`,
        'ADAPTER_NOT_FOUND',
        provider,
        false
      );
    }

    return new AdapterClass();
  }

  /**
   * Get unique key for adapter storage
   */
  private getAdapterKey(provider: CRMProvider): string {
    return `${this.organizationId}:${provider}`;
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: CRMProvider): boolean {
    return provider in ADAPTER_REGISTRY;
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): CRMProvider[] {
    return Object.keys(ADAPTER_REGISTRY) as CRMProvider[];
  }
}

// ===========================================================================
// Singleton Factory
// ===========================================================================

const serviceInstances = new Map<string, CRMService>();

/**
 * Get or create CRM service for an organization
 */
export function getCRMService(organizationId: string): CRMService {
  let service = serviceInstances.get(organizationId);

  if (!service) {
    service = new CRMService(organizationId);
    serviceInstances.set(organizationId, service);
  }

  return service;
}

/**
 * Clear service instance (for testing or cleanup)
 */
export function clearCRMService(organizationId: string): void {
  serviceInstances.delete(organizationId);
}
