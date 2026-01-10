/**
 * CRM Integration Types
 *
 * Defines the interface contract for all CRM adapters in the Nexus platform.
 * Each CRM provider (Salesforce, HubSpot, Bloomerang, Kindful, Neon One)
 * must implement this interface for consistent integration.
 */

import type { Json } from '@/types/database';

// =============================================================================
// CRM Provider Types
// =============================================================================

/**
 * Supported CRM providers
 */
export type CRMProvider =
  | 'salesforce'
  | 'hubspot'
  | 'bloomerang'
  | 'kindful'
  | 'neonone';

/**
 * Authentication methods supported by CRM providers
 */
export type CRMAuthType = 'oauth2' | 'api_key' | 'basic';

/**
 * CRM connection status
 */
export type CRMConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'error'
  | 'syncing';

/**
 * Sync operation status
 */
export type SyncStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'partial';

/**
 * Sync direction
 */
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

// =============================================================================
// Credential Types
// =============================================================================

/**
 * OAuth 2.0 credentials structure
 */
export interface OAuth2Credentials {
  type: 'oauth2';
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: Date;
  scope?: string;
  instanceUrl?: string; // For Salesforce
}

/**
 * API Key credentials structure
 */
export interface APIKeyCredentials {
  type: 'api_key';
  apiKey: string;
  apiSecret?: string;
}

/**
 * Basic auth credentials structure
 */
export interface BasicAuthCredentials {
  type: 'basic';
  username: string;
  password: string;
}

/**
 * Union type for all credential types
 */
export type CRMCredentials =
  | OAuth2Credentials
  | APIKeyCredentials
  | BasicAuthCredentials;

// =============================================================================
// Data Models - Normalized Donor Schema
// =============================================================================

/**
 * Normalized donor record that all CRM adapters map to/from
 */
export interface CRMDonor {
  /** External ID in the CRM system */
  externalId: string;
  /** Nexus internal donor ID (if linked) */
  nexusId?: string;
  /** Full name */
  name: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Email address */
  email?: string;
  /** Phone number */
  phone?: string;
  /** Mailing address */
  address?: CRMAddress;
  /** Company/Organization affiliation */
  company?: string;
  /** Job title */
  title?: string;
  /** Donor type classification */
  donorType?: 'individual' | 'organization' | 'foundation';
  /** Giving level/tier */
  givingLevel?: string;
  /** Total lifetime giving */
  totalGiving?: number;
  /** Last donation date */
  lastDonationDate?: Date;
  /** Last contact date */
  lastContactDate?: Date;
  /** Tags/categories */
  tags?: string[];
  /** Custom fields from CRM */
  customFields?: Record<string, unknown>;
  /** Source CRM provider */
  source: CRMProvider;
  /** Last synced timestamp */
  lastSyncedAt?: Date;
  /** Created in CRM timestamp */
  createdAt?: Date;
  /** Updated in CRM timestamp */
  updatedAt?: Date;
}

/**
 * Address structure
 */
export interface CRMAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Donation/Gift record
 */
export interface CRMDonation {
  /** External ID in the CRM system */
  externalId: string;
  /** Associated donor external ID */
  donorExternalId: string;
  /** Donation amount */
  amount: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Donation date */
  date: Date;
  /** Payment method */
  paymentMethod?: string;
  /** Campaign/Fund designation */
  campaign?: string;
  /** Donation type */
  type?: 'one-time' | 'recurring' | 'pledge' | 'in-kind';
  /** Status */
  status?: 'completed' | 'pending' | 'failed' | 'refunded';
  /** Notes */
  notes?: string;
  /** Source CRM provider */
  source: CRMProvider;
}

/**
 * Interaction/Activity record
 */
export interface CRMInteraction {
  /** External ID in the CRM system */
  externalId: string;
  /** Associated donor external ID */
  donorExternalId: string;
  /** Interaction type */
  type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'other';
  /** Subject/Title */
  subject: string;
  /** Description/Body */
  description?: string;
  /** Interaction date */
  date: Date;
  /** Direction (for emails/calls) */
  direction?: 'inbound' | 'outbound';
  /** Status */
  status?: 'completed' | 'scheduled' | 'cancelled';
  /** Assigned user */
  assignedTo?: string;
  /** Source CRM provider */
  source: CRMProvider;
}

// =============================================================================
// Sync Configuration
// =============================================================================

/**
 * Configuration for CRM sync operations
 */
export interface CRMSyncConfig {
  /** Sync direction */
  direction: SyncDirection;
  /** Enable donor sync */
  syncDonors: boolean;
  /** Enable donation sync */
  syncDonations: boolean;
  /** Enable interaction sync */
  syncInteractions: boolean;
  /** Sync frequency in minutes (0 = manual only) */
  syncFrequencyMinutes: number;
  /** Field mapping overrides */
  fieldMappings?: Record<string, string>;
  /** Filter criteria for sync */
  filters?: CRMSyncFilters;
  /** Conflict resolution strategy */
  conflictResolution: 'crm_wins' | 'nexus_wins' | 'newest_wins' | 'manual';
}

/**
 * Filters for sync operations
 */
export interface CRMSyncFilters {
  /** Only sync donors modified after this date */
  modifiedAfter?: Date;
  /** Only sync specific donor types */
  donorTypes?: string[];
  /** Only sync donors with tags */
  tags?: string[];
  /** Custom filter expression (CRM-specific) */
  customFilter?: string;
}

// =============================================================================
// Sync Results
// =============================================================================

/**
 * Result of a sync operation
 */
export interface CRMSyncResult {
  /** Unique sync operation ID */
  syncId: string;
  /** CRM provider */
  provider: CRMProvider;
  /** Organization ID */
  organizationId: string;
  /** Sync direction */
  direction: SyncDirection;
  /** Overall status */
  status: SyncStatus;
  /** Start time */
  startedAt: Date;
  /** End time */
  completedAt?: Date;
  /** Summary statistics */
  stats: CRMSyncStats;
  /** Errors encountered */
  errors: CRMSyncError[];
}

/**
 * Sync statistics
 */
export interface CRMSyncStats {
  /** Total records processed */
  totalProcessed: number;
  /** Records created in Nexus */
  created: number;
  /** Records updated in Nexus */
  updated: number;
  /** Records pushed to CRM */
  pushed: number;
  /** Records skipped (no changes) */
  skipped: number;
  /** Records failed */
  failed: number;
}

/**
 * Sync error details
 */
export interface CRMSyncError {
  /** Record external ID */
  recordId?: string;
  /** Record type */
  recordType: 'donor' | 'donation' | 'interaction';
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Timestamp */
  timestamp: Date;
}

// =============================================================================
// CRM Adapter Interface
// =============================================================================

/**
 * Configuration for initializing a CRM adapter
 */
export interface CRMAdapterConfig {
  /** CRM provider type */
  provider: CRMProvider;
  /** Organization ID */
  organizationId: string;
  /** Credentials (encrypted at rest) */
  credentials: CRMCredentials;
  /** Sync configuration */
  syncConfig: CRMSyncConfig;
  /** Provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Interface that all CRM adapters must implement
 */
export interface ICRMAdapter {
  /** Provider identifier */
  readonly provider: CRMProvider;

  /** Organization ID this adapter is configured for */
  readonly organizationId: string;

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  /**
   * Initialize the adapter with credentials
   */
  initialize(config: CRMAdapterConfig): Promise<void>;

  /**
   * Test the connection to the CRM
   */
  testConnection(): Promise<boolean>;

  /**
   * Get current connection status
   */
  getConnectionStatus(): Promise<CRMConnectionStatus>;

  /**
   * Refresh OAuth tokens if needed
   */
  refreshTokens(): Promise<OAuth2Credentials | null>;

  /**
   * Disconnect and cleanup
   */
  disconnect(): Promise<void>;

  // ---------------------------------------------------------------------------
  // Donor Operations
  // ---------------------------------------------------------------------------

  /**
   * Fetch all donors from CRM (paginated)
   */
  fetchDonors(options?: {
    page?: number;
    pageSize?: number;
    modifiedAfter?: Date;
  }): Promise<{ donors: CRMDonor[]; hasMore: boolean; nextPage?: number }>;

  /**
   * Fetch a single donor by external ID
   */
  fetchDonor(externalId: string): Promise<CRMDonor | null>;

  /**
   * Search donors by criteria
   */
  searchDonors(query: string, limit?: number): Promise<CRMDonor[]>;

  /**
   * Create a new donor in the CRM
   */
  createDonor(donor: Omit<CRMDonor, 'externalId' | 'source'>): Promise<CRMDonor>;

  /**
   * Update an existing donor in the CRM
   */
  updateDonor(
    externalId: string,
    updates: Partial<CRMDonor>
  ): Promise<CRMDonor>;

  // ---------------------------------------------------------------------------
  // Donation Operations
  // ---------------------------------------------------------------------------

  /**
   * Fetch donations for a donor
   */
  fetchDonations(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<CRMDonation[]>;

  /**
   * Fetch all donations (paginated)
   */
  fetchAllDonations(options?: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ donations: CRMDonation[]; hasMore: boolean; nextPage?: number }>;

  // ---------------------------------------------------------------------------
  // Interaction Operations
  // ---------------------------------------------------------------------------

  /**
   * Fetch interactions for a donor
   */
  fetchInteractions(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date; type?: CRMInteraction['type'] }
  ): Promise<CRMInteraction[]>;

  /**
   * Create an interaction/note in the CRM
   */
  createInteraction(
    interaction: Omit<CRMInteraction, 'externalId' | 'source'>
  ): Promise<CRMInteraction>;

  // ---------------------------------------------------------------------------
  // Sync Operations
  // ---------------------------------------------------------------------------

  /**
   * Perform a full sync operation
   */
  sync(config?: Partial<CRMSyncConfig>): Promise<CRMSyncResult>;

  /**
   * Get the last sync result
   */
  getLastSyncResult(): Promise<CRMSyncResult | null>;

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Map CRM-specific fields to normalized format
   */
  mapToNexus<T>(crmRecord: unknown, type: 'donor' | 'donation' | 'interaction'): T;

  /**
   * Map Nexus format to CRM-specific fields
   */
  mapFromNexus<T>(nexusRecord: unknown, type: 'donor' | 'donation' | 'interaction'): T;

  /**
   * Get available custom fields in the CRM
   */
  getCustomFields(): Promise<{ name: string; type: string; label: string }[]>;
}

// =============================================================================
// Activity Logging Types
// =============================================================================

/**
 * CRM activity log entry types
 */
export type CRMActivityType =
  | 'crm_connected'
  | 'crm_disconnected'
  | 'crm_sync_started'
  | 'crm_sync_completed'
  | 'crm_sync_failed'
  | 'crm_donor_created'
  | 'crm_donor_updated'
  | 'crm_donor_synced'
  | 'crm_donation_synced'
  | 'crm_interaction_created'
  | 'crm_token_refreshed'
  | 'crm_error';

/**
 * Metadata for CRM activity log entries
 */
export interface CRMActivityMetadata {
  provider: CRMProvider;
  syncId?: string;
  recordId?: string;
  recordType?: 'donor' | 'donation' | 'interaction';
  stats?: CRMSyncStats;
  error?: {
    code: string;
    message: string;
  };
  [key: string]: Json | undefined;
}

// =============================================================================
// Integration Record (matches database schema)
// =============================================================================

/**
 * CRM integration record as stored in database
 */
export interface CRMIntegration {
  id: string;
  organizationId: string;
  crmType: CRMProvider;
  credentials: CRMCredentials; // Encrypted at rest
  syncConfig: CRMSyncConfig | null;
  syncStatus: CRMConnectionStatus | null;
  lastSync: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Base CRM error class
 */
export class CRMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: CRMProvider,
    public readonly retryable: boolean = false,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CRMError';
  }
}

/**
 * Authentication error
 */
export class CRMAuthError extends CRMError {
  constructor(provider: CRMProvider, message: string, cause?: Error) {
    super(message, 'AUTH_ERROR', provider, true, cause);
    this.name = 'CRMAuthError';
  }
}

/**
 * Rate limit error
 */
export class CRMRateLimitError extends CRMError {
  constructor(
    provider: CRMProvider,
    public readonly retryAfterMs: number,
    cause?: Error
  ) {
    super(`Rate limit exceeded. Retry after ${retryAfterMs}ms`, 'RATE_LIMIT', provider, true, cause);
    this.name = 'CRMRateLimitError';
  }
}

/**
 * API error
 */
export class CRMAPIError extends CRMError {
  constructor(
    provider: CRMProvider,
    message: string,
    public readonly statusCode: number,
    cause?: Error
  ) {
    super(message, `API_ERROR_${statusCode}`, provider, statusCode >= 500, cause);
    this.name = 'CRMAPIError';
  }
}

/**
 * Validation error
 */
export class CRMValidationError extends CRMError {
  constructor(
    provider: CRMProvider,
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR', provider, false);
    this.name = 'CRMValidationError';
  }
}
