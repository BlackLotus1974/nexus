/**
 * Tests for CRM Service
 */

import { CRMService, getCRMService, clearCRMService } from '../service';

// Mock Supabase client with proper chaining
const createMockQueryBuilder = () => {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn(() => builder);
  builder.insert = jest.fn(() => builder);
  builder.update = jest.fn(() => builder);
  builder.upsert = jest.fn(() => builder);
  builder.delete = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.order = jest.fn(() => Promise.resolve({ data: [], error: null }));
  builder.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
  return builder;
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => createMockQueryBuilder()),
  })),
}));

describe('CRMService', () => {
  const organizationId = 'test_org_123';
  let service: CRMService;

  beforeEach(() => {
    clearCRMService(organizationId);
    service = new CRMService(organizationId);
  });

  describe('constructor', () => {
    it('should create a service instance', () => {
      expect(service).toBeInstanceOf(CRMService);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return disconnected when no adapter exists', async () => {
      const status = await service.getConnectionStatus('salesforce');
      expect(status).toBe('disconnected');
    });
  });

  describe('getIntegrations', () => {
    it('should return empty array when no integrations exist', async () => {
      const integrations = await service.getIntegrations();
      expect(integrations).toEqual([]);
    });
  });

  describe('getSyncConfig', () => {
    it('should return default config when none exists', async () => {
      const config = await service.getSyncConfig('salesforce');

      expect(config).toEqual({
        direction: 'bidirectional',
        syncDonors: true,
        syncDonations: true,
        syncInteractions: true,
        syncFrequencyMinutes: 60,
        conflictResolution: 'newest_wins',
      });
    });
  });

  describe('static methods', () => {
    describe('isProviderSupported', () => {
      it('should return false for unregistered providers', () => {
        // Initially no adapters are registered
        expect(CRMService.isProviderSupported('salesforce')).toBe(false);
      });
    });

    describe('getSupportedProviders', () => {
      it('should return empty array when no adapters registered', () => {
        const providers = CRMService.getSupportedProviders();
        expect(providers).toEqual([]);
      });
    });
  });
});

describe('getCRMService', () => {
  const organizationId = 'test_org_456';

  beforeEach(() => {
    clearCRMService(organizationId);
  });

  it('should create a new service instance', () => {
    const service = getCRMService(organizationId);
    expect(service).toBeInstanceOf(CRMService);
  });

  it('should return the same instance for the same organization', () => {
    const service1 = getCRMService(organizationId);
    const service2 = getCRMService(organizationId);
    expect(service1).toBe(service2);
  });

  it('should return different instances for different organizations', () => {
    const service1 = getCRMService('org_1');
    const service2 = getCRMService('org_2');
    expect(service1).not.toBe(service2);

    // Cleanup
    clearCRMService('org_1');
    clearCRMService('org_2');
  });
});

describe('clearCRMService', () => {
  const organizationId = 'test_org_789';

  it('should remove the service instance', () => {
    const service1 = getCRMService(organizationId);
    clearCRMService(organizationId);
    const service2 = getCRMService(organizationId);

    expect(service1).not.toBe(service2);
  });
});
