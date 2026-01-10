/**
 * Abstract Base CRM Adapter
 *
 * Provides common functionality for all CRM adapters including:
 * - Credential management
 * - Token refresh logic
 * - Rate limiting with exponential backoff
 * - Activity logging
 * - Error handling
 *
 * All provider-specific adapters (Salesforce, HubSpot, etc.) extend this class.
 */

import type {
  CRMProvider,
  CRMAdapterConfig,
  CRMCredentials,
  OAuth2Credentials,
  CRMConnectionStatus,
  CRMSyncConfig,
  CRMSyncResult,
  CRMSyncStats,
  CRMSyncError,
  CRMDonor,
  CRMDonation,
  CRMInteraction,
  ICRMAdapter,
  CRMActivityType,
  CRMActivityMetadata,
} from './types';
import {
  CRMError,
  CRMAuthError,
  CRMRateLimitError,
  CRMAPIError,
} from './types';
import { logCRMActivity } from './activity-logger';

/**
 * Default sync configuration
 */
const DEFAULT_SYNC_CONFIG: CRMSyncConfig = {
  direction: 'bidirectional',
  syncDonors: true,
  syncDonations: true,
  syncInteractions: true,
  syncFrequencyMinutes: 60,
  conflictResolution: 'newest_wins',
};

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
};

/**
 * Abstract base class for CRM adapters
 */
export abstract class BaseCRMAdapter implements ICRMAdapter {
  abstract readonly provider: CRMProvider;

  protected _organizationId: string = '';
  protected _credentials: CRMCredentials | null = null;
  protected _syncConfig: CRMSyncConfig = DEFAULT_SYNC_CONFIG;
  protected _connectionStatus: CRMConnectionStatus = 'disconnected';
  protected _lastSyncResult: CRMSyncResult | null = null;
  protected _rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG;
  protected _options: Record<string, unknown> = {};

  get organizationId(): string {
    return this._organizationId;
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Initialize the adapter with configuration
   */
  async initialize(config: CRMAdapterConfig): Promise<void> {
    this._organizationId = config.organizationId;
    this._credentials = config.credentials;
    this._syncConfig = { ...DEFAULT_SYNC_CONFIG, ...config.syncConfig };
    this._options = config.options || {};

    // Validate credentials
    this.validateCredentials(config.credentials);

    // Provider-specific initialization
    await this.onInitialize(config);

    // Test the connection
    const connected = await this.testConnection();
    if (connected) {
      this._connectionStatus = 'connected';
      await this.logActivity('crm_connected', {
        provider: this.provider,
      });
    } else {
      this._connectionStatus = 'error';
      throw new CRMAuthError(
        this.provider,
        'Failed to establish connection after initialization'
      );
    }
  }

  /**
   * Provider-specific initialization hook
   */
  protected abstract onInitialize(config: CRMAdapterConfig): Promise<void>;

  /**
   * Test the connection to the CRM
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get current connection status
   */
  async getConnectionStatus(): Promise<CRMConnectionStatus> {
    // Check if tokens are expired for OAuth2
    if (this._credentials?.type === 'oauth2') {
      const oauth = this._credentials as OAuth2Credentials;
      if (new Date() >= oauth.expiresAt) {
        this._connectionStatus = 'expired';
      }
    }
    return this._connectionStatus;
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(): Promise<OAuth2Credentials | null> {
    if (this._credentials?.type !== 'oauth2') {
      return null;
    }

    try {
      const newCredentials = await this.performTokenRefresh(
        this._credentials as OAuth2Credentials
      );

      if (newCredentials) {
        this._credentials = newCredentials;
        this._connectionStatus = 'connected';

        await this.logActivity('crm_token_refreshed', {
          provider: this.provider,
        });

        // Save updated credentials to database
        await this.saveCredentials(newCredentials);

        return newCredentials;
      }
    } catch (error) {
      this._connectionStatus = 'expired';
      await this.logActivity('crm_error', {
        provider: this.provider,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: (error as Error).message,
        },
      });
      throw new CRMAuthError(
        this.provider,
        'Failed to refresh OAuth tokens',
        error as Error
      );
    }

    return null;
  }

  /**
   * Provider-specific token refresh implementation
   */
  protected abstract performTokenRefresh(
    credentials: OAuth2Credentials
  ): Promise<OAuth2Credentials | null>;

  /**
   * Save updated credentials to database
   */
  protected abstract saveCredentials(
    credentials: CRMCredentials
  ): Promise<void>;

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    await this.onDisconnect();
    this._connectionStatus = 'disconnected';
    this._credentials = null;

    await this.logActivity('crm_disconnected', {
      provider: this.provider,
    });
  }

  /**
   * Provider-specific disconnect hook
   */
  protected abstract onDisconnect(): Promise<void>;

  // ===========================================================================
  // Donor Operations (Abstract - must be implemented by providers)
  // ===========================================================================

  abstract fetchDonors(options?: {
    page?: number;
    pageSize?: number;
    modifiedAfter?: Date;
  }): Promise<{ donors: CRMDonor[]; hasMore: boolean; nextPage?: number }>;

  abstract fetchDonor(externalId: string): Promise<CRMDonor | null>;

  abstract searchDonors(query: string, limit?: number): Promise<CRMDonor[]>;

  abstract createDonor(
    donor: Omit<CRMDonor, 'externalId' | 'source'>
  ): Promise<CRMDonor>;

  abstract updateDonor(
    externalId: string,
    updates: Partial<CRMDonor>
  ): Promise<CRMDonor>;

  // ===========================================================================
  // Donation Operations (Abstract)
  // ===========================================================================

  abstract fetchDonations(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<CRMDonation[]>;

  abstract fetchAllDonations(options?: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    donations: CRMDonation[];
    hasMore: boolean;
    nextPage?: number;
  }>;

  // ===========================================================================
  // Interaction Operations (Abstract)
  // ===========================================================================

  abstract fetchInteractions(
    donorExternalId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: CRMInteraction['type'];
    }
  ): Promise<CRMInteraction[]>;

  abstract createInteraction(
    interaction: Omit<CRMInteraction, 'externalId' | 'source'>
  ): Promise<CRMInteraction>;

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Perform a full sync operation
   */
  async sync(config?: Partial<CRMSyncConfig>): Promise<CRMSyncResult> {
    const syncConfig = { ...this._syncConfig, ...config };
    const syncId = this.generateSyncId();
    const startedAt = new Date();

    const result: CRMSyncResult = {
      syncId,
      provider: this.provider,
      organizationId: this._organizationId,
      direction: syncConfig.direction,
      status: 'in_progress',
      startedAt,
      stats: {
        totalProcessed: 0,
        created: 0,
        updated: 0,
        pushed: 0,
        skipped: 0,
        failed: 0,
      },
      errors: [],
    };

    this._connectionStatus = 'syncing';

    await this.logActivity('crm_sync_started', {
      provider: this.provider,
      syncId,
    });

    try {
      // Sync donors
      if (syncConfig.syncDonors) {
        await this.syncDonors(result, syncConfig);
      }

      // Sync donations
      if (syncConfig.syncDonations) {
        await this.syncDonations(result, syncConfig);
      }

      // Sync interactions
      if (syncConfig.syncInteractions) {
        await this.syncInteractions(result, syncConfig);
      }

      result.status = result.errors.length > 0 ? 'partial' : 'completed';
      result.completedAt = new Date();

      await this.logActivity('crm_sync_completed', {
        provider: this.provider,
        syncId,
        stats: result.stats,
      });
    } catch (error) {
      result.status = 'failed';
      result.completedAt = new Date();
      result.errors.push({
        recordType: 'donor',
        code: 'SYNC_ERROR',
        message: (error as Error).message,
        retryable: true,
        timestamp: new Date(),
      });

      await this.logActivity('crm_sync_failed', {
        provider: this.provider,
        syncId,
        error: {
          code: 'SYNC_ERROR',
          message: (error as Error).message,
        },
      });
    }

    this._connectionStatus = 'connected';
    this._lastSyncResult = result;

    return result;
  }

  /**
   * Sync donors between CRM and Nexus
   */
  protected abstract syncDonors(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void>;

  /**
   * Sync donations between CRM and Nexus
   */
  protected abstract syncDonations(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void>;

  /**
   * Sync interactions between CRM and Nexus
   */
  protected abstract syncInteractions(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void>;

  /**
   * Get the last sync result
   */
  async getLastSyncResult(): Promise<CRMSyncResult | null> {
    return this._lastSyncResult;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Map CRM-specific fields to normalized format
   */
  abstract mapToNexus<T>(
    crmRecord: unknown,
    type: 'donor' | 'donation' | 'interaction'
  ): T;

  /**
   * Map Nexus format to CRM-specific fields
   */
  abstract mapFromNexus<T>(
    nexusRecord: unknown,
    type: 'donor' | 'donation' | 'interaction'
  ): T;

  /**
   * Get available custom fields in the CRM
   */
  abstract getCustomFields(): Promise<
    { name: string; type: string; label: string }[]
  >;

  // ===========================================================================
  // Protected Helper Methods
  // ===========================================================================

  /**
   * Validate credentials structure
   */
  protected validateCredentials(credentials: CRMCredentials): void {
    if (!credentials) {
      throw new CRMAuthError(this.provider, 'Credentials are required');
    }

    switch (credentials.type) {
      case 'oauth2':
        if (!credentials.accessToken || !credentials.refreshToken) {
          throw new CRMAuthError(
            this.provider,
            'OAuth2 credentials require accessToken and refreshToken'
          );
        }
        break;
      case 'api_key':
        if (!credentials.apiKey) {
          throw new CRMAuthError(
            this.provider,
            'API key credentials require apiKey'
          );
        }
        break;
      case 'basic':
        if (!credentials.username || !credentials.password) {
          throw new CRMAuthError(
            this.provider,
            'Basic auth credentials require username and password'
          );
        }
        break;
    }
  }

  /**
   * Execute a request with automatic retry and exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this._rateLimitConfig.baseDelayMs;

    for (let attempt = 0; attempt <= this._rateLimitConfig.maxRetries; attempt++) {
      try {
        // Check if tokens need refresh before making request
        if (this._credentials?.type === 'oauth2') {
          const oauth = this._credentials as OAuth2Credentials;
          const expiresIn = oauth.expiresAt.getTime() - Date.now();
          // Refresh if expiring in less than 5 minutes
          if (expiresIn < 5 * 60 * 1000) {
            await this.refreshTokens();
          }
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Handle specific error types
        if (error instanceof CRMRateLimitError) {
          delay = Math.min(
            error.retryAfterMs || delay * 2,
            this._rateLimitConfig.maxDelayMs
          );
        } else if (error instanceof CRMAuthError) {
          // Try to refresh tokens on auth error
          try {
            await this.refreshTokens();
            // Retry immediately after token refresh
            continue;
          } catch {
            throw error;
          }
        } else if (error instanceof CRMAPIError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this._rateLimitConfig.maxRetries) {
          break;
        }

        // Wait before retrying
        await this.sleep(delay);
        delay = Math.min(delay * 2, this._rateLimitConfig.maxDelayMs);

        console.warn(
          `[${this.provider}] Retry ${attempt + 1}/${this._rateLimitConfig.maxRetries} for ${context}: ${lastError.message}`
        );
      }
    }

    throw new CRMError(
      `Max retries exceeded for ${context}: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED',
      this.provider,
      false,
      lastError || undefined
    );
  }

  /**
   * Log a CRM activity
   */
  protected async logActivity(
    activityType: CRMActivityType,
    metadata: CRMActivityMetadata
  ): Promise<void> {
    try {
      await logCRMActivity(
        this._organizationId,
        activityType,
        metadata
      );
    } catch (error) {
      // Don't fail operations due to logging errors
      console.error(
        `[${this.provider}] Failed to log activity:`,
        error
      );
    }
  }

  /**
   * Generate a unique sync ID
   */
  protected generateSyncId(): string {
    return `${this.provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add an error to sync result
   */
  protected addSyncError(
    result: CRMSyncResult,
    error: Omit<CRMSyncError, 'timestamp'>
  ): void {
    result.errors.push({
      ...error,
      timestamp: new Date(),
    });
    result.stats.failed++;
  }

  /**
   * Get the access token for API requests
   */
  protected getAccessToken(): string {
    if (!this._credentials) {
      throw new CRMAuthError(this.provider, 'No credentials available');
    }

    switch (this._credentials.type) {
      case 'oauth2':
        return this._credentials.accessToken;
      case 'api_key':
        return this._credentials.apiKey;
      case 'basic':
        return Buffer.from(
          `${this._credentials.username}:${this._credentials.password}`
        ).toString('base64');
    }
  }

  /**
   * Get authorization header for API requests
   */
  protected getAuthHeader(): Record<string, string> {
    if (!this._credentials) {
      throw new CRMAuthError(this.provider, 'No credentials available');
    }

    switch (this._credentials.type) {
      case 'oauth2':
        return {
          Authorization: `Bearer ${this._credentials.accessToken}`,
        };
      case 'api_key':
        return {
          'X-API-Key': this._credentials.apiKey,
        };
      case 'basic':
        return {
          Authorization: `Basic ${this.getAccessToken()}`,
        };
    }
  }
}
