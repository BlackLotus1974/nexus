/**
 * CRM Integration Module
 *
 * Unified CRM integration layer for Nexus Fundraising Intelligence Platform.
 * Supports Salesforce, HubSpot, Bloomerang, Kindful, and Neon One.
 *
 * @example
 * ```typescript
 * import { getCRMService, CRMProvider } from '@/lib/crm';
 *
 * // Get service for organization
 * const crm = getCRMService(organizationId);
 *
 * // Connect to Salesforce via OAuth
 * const authUrl = crm.getAuthorizationUrl('salesforce');
 * // ... redirect user to authUrl ...
 * // ... after callback ...
 * await crm.completeOAuthFlow(code, state);
 *
 * // Connect to Bloomerang with API key
 * await crm.connectWithAPIKey('bloomerang', apiKey);
 *
 * // Sync data
 * const result = await crm.sync('salesforce');
 * console.log(`Synced ${result.stats.totalProcessed} records`);
 *
 * // Get adapter for direct operations
 * const adapter = await crm.getAdapter('salesforce');
 * const donors = await adapter.fetchDonors({ pageSize: 100 });
 * ```
 */

// Types
export type {
  CRMProvider,
  CRMAuthType,
  CRMConnectionStatus,
  SyncStatus,
  SyncDirection,
  OAuth2Credentials,
  APIKeyCredentials,
  BasicAuthCredentials,
  CRMCredentials,
  CRMDonor,
  CRMAddress,
  CRMDonation,
  CRMInteraction,
  CRMSyncConfig,
  CRMSyncFilters,
  CRMSyncResult,
  CRMSyncStats,
  CRMSyncError,
  CRMAdapterConfig,
  ICRMAdapter,
  CRMActivityType,
  CRMActivityMetadata,
  CRMIntegration,
} from './types';

// Error classes
export {
  CRMError,
  CRMAuthError,
  CRMRateLimitError,
  CRMAPIError,
  CRMValidationError,
} from './types';

// Base adapter class
export { BaseCRMAdapter } from './base-adapter';

// OAuth utilities
export {
  OAUTH_CONFIGS,
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  refreshOAuthTokens,
  storeCredentials,
  retrieveCredentials,
  deleteCredentials,
  updateSyncStatus,
  generateOAuthState,
  validateOAuthState,
} from './oauth';

// Activity logging
export {
  logCRMActivity,
  logCRMConnected,
  logCRMDisconnected,
  logSyncStarted,
  logSyncCompleted,
  logSyncFailed,
  logDonorSynced,
  logDonationSynced,
  logInteractionCreated,
  logTokenRefreshed,
  logCRMError,
  getRecentCRMActivities,
  getSyncHistory,
} from './activity-logger';

// CRM Service
export {
  CRMService,
  getCRMService,
  clearCRMService,
  registerAdapter,
} from './service';

// Adapters will be exported here as they are implemented
// export { SalesforceAdapter } from './adapters/salesforce';
// export { HubSpotAdapter } from './adapters/hubspot';
// export { BloomerangAdapter } from './adapters/bloomerang';
// export { KindfulAdapter } from './adapters/kindful';
// export { NeonOneAdapter } from './adapters/neonone';
