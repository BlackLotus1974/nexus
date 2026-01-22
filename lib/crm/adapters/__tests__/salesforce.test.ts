/**
 * Tests for Salesforce CRM Adapter
 */

// Mock Supabase client before imports
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

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { SalesforceAdapter } from '../salesforce';
import type { CRMAdapterConfig, OAuth2Credentials } from '../../types';

describe('SalesforceAdapter', () => {
  let adapter: SalesforceAdapter;
  const mockCredentials: OAuth2Credentials = {
    type: 'oauth2',
    accessToken: 'test_access_token',
    refreshToken: 'test_refresh_token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    instanceUrl: 'https://test.salesforce.com',
  };

  const mockConfig: CRMAdapterConfig = {
    provider: 'salesforce',
    organizationId: 'test_org_123',
    credentials: mockCredentials,
    syncConfig: {
      direction: 'bidirectional',
      syncDonors: true,
      syncDonations: true,
      syncInteractions: true,
      syncFrequencyMinutes: 60,
      conflictResolution: 'newest_wins',
    },
  };

  // Helper to initialize adapter with mocked successful connection
  const initializeAdapter = async () => {
    // Mock successful API version check (testConnection)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ version: '59.0' }),
    });
    await adapter.initialize(mockConfig);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SalesforceAdapter();
  });

  describe('initialization', () => {
    it('should initialize with valid OAuth credentials', async () => {
      await initializeAdapter();
      expect(adapter.provider).toBe('salesforce');
    });

    it('should throw error without instance URL', async () => {
      const configWithoutUrl: CRMAdapterConfig = {
        ...mockConfig,
        credentials: {
          ...mockCredentials,
          instanceUrl: undefined,
        },
      };

      await expect(adapter.initialize(configWithoutUrl)).rejects.toThrow(
        'Salesforce instance URL is required'
      );
    });
  });

  describe('testConnection', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should return true on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ version: '59.0' }),
      });

      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve([{ message: 'Unauthorized', errorCode: 'INVALID_SESSION' }]),
      });

      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('fetchDonors', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should fetch and map contacts to donors', async () => {
      const mockContacts = {
        totalSize: 2,
        done: true,
        records: [
          {
            Id: 'sf_contact_1',
            FirstName: 'John',
            LastName: 'Doe',
            Email: 'john@example.com',
            Phone: '555-1234',
            MailingCity: 'New York',
            MailingState: 'NY',
            CreatedDate: '2024-01-01T00:00:00Z',
            LastModifiedDate: '2024-01-15T00:00:00Z',
          },
          {
            Id: 'sf_contact_2',
            FirstName: 'Jane',
            LastName: 'Smith',
            Email: 'jane@example.com',
            CreatedDate: '2024-01-02T00:00:00Z',
            LastModifiedDate: '2024-01-16T00:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockContacts),
      });

      const result = await adapter.fetchDonors({ pageSize: 100 });

      expect(result.donors).toHaveLength(2);
      expect(result.donors[0].externalId).toBe('sf_contact_1');
      expect(result.donors[0].name).toBe('John Doe');
      expect(result.donors[0].email).toBe('john@example.com');
      expect(result.donors[0].source).toBe('salesforce');
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination', async () => {
      const mockContacts = {
        totalSize: 200,
        done: false,
        nextRecordsUrl: '/services/data/v59.0/query/next',
        records: [
          {
            Id: 'sf_contact_1',
            LastName: 'Doe',
            CreatedDate: '2024-01-01T00:00:00Z',
            LastModifiedDate: '2024-01-15T00:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockContacts),
      });

      const result = await adapter.fetchDonors({ pageSize: 100, page: 1 });

      expect(result.hasMore).toBe(true);
      expect(result.nextPage).toBe(2);
    });

    it('should apply date filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ totalSize: 0, done: true, records: [] }),
      });

      await adapter.fetchDonors({
        modifiedAfter: new Date('2024-01-01'),
      });

      expect(mockFetch).toHaveBeenCalled();
      // Call index 1 because index 0 is the testConnection call from initialization
      const callArgs = mockFetch.mock.calls[1];
      expect(callArgs[0]).toContain('LastModifiedDate');
    });
  });

  describe('createDonor', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should create new contact in Salesforce', async () => {
      const newDonor = {
        name: 'New Donor',
        firstName: 'New',
        lastName: 'Donor',
        email: 'new@example.com',
      };

      // Mock create response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 'sf_new_contact' }),
      });

      // Mock fetch of created record
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            Id: 'sf_new_contact',
            FirstName: 'New',
            LastName: 'Donor',
            Email: 'new@example.com',
            CreatedDate: new Date().toISOString(),
            LastModifiedDate: new Date().toISOString(),
          }),
      });

      const result = await adapter.createDonor(newDonor);

      expect(result.externalId).toBe('sf_new_contact');
      // 3 calls: 1 for init (testConnection) + 2 for create (POST + GET)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateDonor', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should update existing contact in Salesforce', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Donor',
        email: 'updated@example.com',
      };

      // Mock update response (204 No Content)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
      });

      // Mock fetch of updated record
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            Id: 'sf_existing_contact',
            FirstName: 'Updated',
            LastName: 'Donor',
            Email: 'updated@example.com',
            CreatedDate: '2024-01-01T00:00:00Z',
            LastModifiedDate: new Date().toISOString(),
          }),
      });

      const result = await adapter.updateDonor('sf_existing_contact', updates);

      expect(result.externalId).toBe('sf_existing_contact');
      // 3 calls: 1 for init (testConnection) + 2 for update (PATCH + GET)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('fetchDonations', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should fetch and map opportunities to donations', async () => {
      const mockOpportunities = {
        totalSize: 1,
        done: true,
        records: [
          {
            Id: 'sf_opp_1',
            Name: 'Donation 2024',
            Amount: 1000,
            StageName: 'Closed Won',
            CloseDate: '2024-01-15',
            ContactId: 'sf_contact_1',
            Type: 'one_time',
            CreatedDate: '2024-01-01T00:00:00Z',
            LastModifiedDate: '2024-01-15T00:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpportunities),
      });

      const donations = await adapter.fetchDonations('sf_contact_1');

      expect(donations).toHaveLength(1);
      expect(donations[0].externalId).toBe('sf_opp_1');
      expect(donations[0].amount).toBe(1000);
      expect(donations[0].donorExternalId).toBe('sf_contact_1');
    });
  });

  describe('fetchAllDonations', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should fetch all donations with pagination', async () => {
      const mockOpportunities = {
        totalSize: 1,
        done: true,
        records: [
          {
            Id: 'sf_opp_1',
            Name: 'Donation 2024',
            Amount: 1000,
            StageName: 'Closed Won',
            CloseDate: '2024-01-15',
            ContactId: 'sf_contact_1',
            Type: 'one_time',
            CreatedDate: '2024-01-01T00:00:00Z',
            LastModifiedDate: '2024-01-15T00:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpportunities),
      });

      const result = await adapter.fetchAllDonations({ pageSize: 100 });

      expect(result.donations).toHaveLength(1);
      expect(result.donations[0].externalId).toBe('sf_opp_1');
      expect(result.donations[0].amount).toBe(1000);
      expect(result.donations[0].donorExternalId).toBe('sf_contact_1');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should handle rate limiting (429)', async () => {
      // Mock all calls to return 429 - use mockImplementation for consistent behavior
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          headers: { get: () => '1' }, // 1 second retry
          json: () => Promise.resolve([{ message: 'Rate limit exceeded' }]),
        })
      );

      // Test expects "Rate limit exceeded" in the error message after max retries
      await expect(adapter.fetchDonors()).rejects.toThrow(/Rate limit/i);
    }, 30000);

    it('should handle authentication errors (401)', async () => {
      // Mock all calls to return 401 (including token refresh attempts)
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () =>
            Promise.resolve([{ message: 'Session expired', errorCode: 'INVALID_SESSION' }]),
        })
      );

      await expect(adapter.fetchDonors()).rejects.toThrow('Authentication failed');
    }, 15000);

    it('should handle API errors (4xx/5xx)', async () => {
      // 400 errors are non-retryable, so only one mock needed
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve([{ message: 'Invalid query', errorCode: 'MALFORMED_QUERY' }]),
      });

      await expect(adapter.fetchDonors()).rejects.toThrow('Invalid query');
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await initializeAdapter();
    });

    it('should revoke token on disconnect', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await adapter.disconnect();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/services/oauth2/revoke'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

describe('Salesforce Data Mapping', () => {
  let adapter: SalesforceAdapter;

  beforeEach(async () => {
    adapter = new SalesforceAdapter();
    // Mock successful connection test
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ version: '59.0' }),
    });
    await adapter.initialize({
      provider: 'salesforce',
      organizationId: 'test_org',
      credentials: {
        type: 'oauth2',
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 3600000),
        instanceUrl: 'https://test.salesforce.com',
      },
      syncConfig: {
        direction: 'bidirectional',
        syncDonors: true,
        syncDonations: true,
        syncInteractions: true,
        syncFrequencyMinutes: 60,
        conflictResolution: 'newest_wins',
      },
    });
  });

  it('should correctly map Salesforce Contact to CRMDonor', async () => {
    const mockContact = {
      totalSize: 1,
      done: true,
      records: [
        {
          Id: 'sf_123',
          FirstName: 'John',
          LastName: 'Doe',
          Email: 'john@example.com',
          Phone: '555-1234',
          MailingStreet: '123 Main St',
          MailingCity: 'New York',
          MailingState: 'NY',
          MailingPostalCode: '10001',
          MailingCountry: 'USA',
          Title: 'CEO',
          Donor_Type__c: 'individual',
          Giving_Level__c: 'major',
          Total_Giving__c: 50000,
          Tags__c: 'board-member;major-donor',
          CreatedDate: '2024-01-01T00:00:00Z',
          LastModifiedDate: '2024-06-15T00:00:00Z',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockContact),
    });

    const result = await adapter.fetchDonors();
    const donor = result.donors[0];

    expect(donor.externalId).toBe('sf_123');
    expect(donor.firstName).toBe('John');
    expect(donor.lastName).toBe('Doe');
    expect(donor.name).toBe('John Doe');
    expect(donor.email).toBe('john@example.com');
    expect(donor.phone).toBe('555-1234');
    expect(donor.address?.street).toBe('123 Main St');
    expect(donor.address?.city).toBe('New York');
    expect(donor.title).toBe('CEO');
    expect(donor.donorType).toBe('individual');
    expect(donor.givingLevel).toBe('major');
    expect(donor.totalGiving).toBe(50000);
    expect(donor.tags).toContain('board-member');
    expect(donor.tags).toContain('major-donor');
    expect(donor.source).toBe('salesforce');
  });
});
