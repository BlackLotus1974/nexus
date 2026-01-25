/**
 * CRM Adapters Index
 *
 * Exports all CRM adapter implementations.
 */

export { SalesforceAdapter } from './salesforce';
export { HubSpotAdapter } from './hubspot';
export { BloomerangAdapter } from './bloomerang';
export { KindfulAdapter } from './kindful';
export { NeonOneAdapter } from './neonone';

import type { CRMProvider, ICRMAdapter } from '../types';
import { SalesforceAdapter } from './salesforce';
import { HubSpotAdapter } from './hubspot';
import { BloomerangAdapter } from './bloomerang';
import { KindfulAdapter } from './kindful';
import { NeonOneAdapter } from './neonone';

/**
 * Factory function to create CRM adapter by provider type
 */
export function createCRMAdapter(provider: CRMProvider): ICRMAdapter {
  switch (provider) {
    case 'salesforce':
      return new SalesforceAdapter();
    case 'hubspot':
      return new HubSpotAdapter();
    case 'bloomerang':
      return new BloomerangAdapter();
    case 'kindful':
      return new KindfulAdapter();
    case 'neonone':
      return new NeonOneAdapter();
    default:
      throw new Error(`Unsupported CRM provider: ${provider}`);
  }
}

/**
 * Get display name for CRM provider
 */
export function getCRMDisplayName(provider: CRMProvider): string {
  const displayNames: Record<CRMProvider, string> = {
    salesforce: 'Salesforce',
    hubspot: 'HubSpot',
    bloomerang: 'Bloomerang',
    kindful: 'Kindful',
    neonone: 'Neon One',
  };
  return displayNames[provider] || provider;
}

/**
 * Get authentication type for CRM provider
 */
export function getCRMAuthType(provider: CRMProvider): 'oauth2' | 'api_key' {
  const authTypes: Record<CRMProvider, 'oauth2' | 'api_key'> = {
    salesforce: 'oauth2',
    hubspot: 'oauth2',
    bloomerang: 'api_key',
    kindful: 'api_key',
    neonone: 'api_key',
  };
  return authTypes[provider];
}
