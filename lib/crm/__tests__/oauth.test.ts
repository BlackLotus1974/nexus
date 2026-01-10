/**
 * Tests for OAuth Token Management
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

import {
  generateOAuthState,
  validateOAuthState,
  OAUTH_CONFIGS,
} from '../oauth';

// Mock the environment
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    SALESFORCE_CLIENT_ID: 'test_salesforce_client_id',
    SALESFORCE_CLIENT_SECRET: 'test_salesforce_client_secret',
    HUBSPOT_CLIENT_ID: 'test_hubspot_client_id',
    HUBSPOT_CLIENT_SECRET: 'test_hubspot_client_secret',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('OAuth State Management', () => {
  describe('generateOAuthState', () => {
    it('should generate a base64url encoded state', () => {
      const state = generateOAuthState('org_123', 'salesforce');

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      // Should be base64url (no + / =)
      expect(state).not.toMatch(/[+/=]/);
    });

    it('should encode organization ID and provider', () => {
      const state = generateOAuthState('org_123', 'hubspot');
      const decoded = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8')
      );

      expect(decoded.organizationId).toBe('org_123');
      expect(decoded.provider).toBe('hubspot');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const state = generateOAuthState('org_123', 'salesforce');
      const after = Date.now();

      const decoded = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8')
      );

      expect(decoded.timestamp).toBeGreaterThanOrEqual(before);
      expect(decoded.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include nonce for uniqueness', () => {
      const state1 = generateOAuthState('org_123', 'salesforce');
      const state2 = generateOAuthState('org_123', 'salesforce');

      // States should be different due to nonce
      expect(state1).not.toBe(state2);
    });
  });

  describe('validateOAuthState', () => {
    it('should validate a valid state', () => {
      const state = generateOAuthState('org_123', 'salesforce');
      const result = validateOAuthState(state);

      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe('org_123');
      expect(result?.provider).toBe('salesforce');
    });

    it('should reject invalid base64', () => {
      const result = validateOAuthState('not-valid-base64!@#');

      expect(result).toBeNull();
    });

    it('should reject invalid JSON', () => {
      const invalidState = Buffer.from('not json').toString('base64url');
      const result = validateOAuthState(invalidState);

      expect(result).toBeNull();
    });

    it('should reject expired state (older than 5 minutes)', () => {
      // Create a state with old timestamp
      const oldStateData = {
        organizationId: 'org_123',
        provider: 'salesforce',
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
        nonce: 'test',
      };
      const oldState = Buffer.from(JSON.stringify(oldStateData)).toString(
        'base64url'
      );

      const result = validateOAuthState(oldState);

      expect(result).toBeNull();
    });

    it('should accept state within 5 minutes', () => {
      // Create a state with recent timestamp
      const recentStateData = {
        organizationId: 'org_123',
        provider: 'hubspot',
        timestamp: Date.now() - 4 * 60 * 1000, // 4 minutes ago
        nonce: 'test',
      };
      const recentState = Buffer.from(JSON.stringify(recentStateData)).toString(
        'base64url'
      );

      const result = validateOAuthState(recentState);

      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe('org_123');
      expect(result?.provider).toBe('hubspot');
    });
  });
});

describe('OAuth Configurations', () => {
  describe('Salesforce config', () => {
    it('should have correct authorization URL', () => {
      expect(OAUTH_CONFIGS.salesforce.authorizationUrl).toBe(
        'https://login.salesforce.com/services/oauth2/authorize'
      );
    });

    it('should have correct token URL', () => {
      expect(OAUTH_CONFIGS.salesforce.tokenUrl).toBe(
        'https://login.salesforce.com/services/oauth2/token'
      );
    });

    it('should have required scopes', () => {
      expect(OAUTH_CONFIGS.salesforce.scopes).toContain('api');
      expect(OAUTH_CONFIGS.salesforce.scopes).toContain('refresh_token');
    });
  });

  describe('HubSpot config', () => {
    it('should have correct authorization URL', () => {
      expect(OAUTH_CONFIGS.hubspot.authorizationUrl).toBe(
        'https://app.hubspot.com/oauth/authorize'
      );
    });

    it('should have correct token URL', () => {
      expect(OAUTH_CONFIGS.hubspot.tokenUrl).toBe(
        'https://api.hubapi.com/oauth/v1/token'
      );
    });

    it('should have contact read/write scopes', () => {
      expect(OAUTH_CONFIGS.hubspot.scopes).toContain(
        'crm.objects.contacts.read'
      );
      expect(OAUTH_CONFIGS.hubspot.scopes).toContain(
        'crm.objects.contacts.write'
      );
    });
  });

  describe('Bloomerang config', () => {
    it('should have empty OAuth URLs (uses API key)', () => {
      expect(OAUTH_CONFIGS.bloomerang.authorizationUrl).toBe('');
      expect(OAUTH_CONFIGS.bloomerang.tokenUrl).toBe('');
    });
  });

  describe('Kindful config', () => {
    it('should have authorization URL', () => {
      expect(OAUTH_CONFIGS.kindful.authorizationUrl).toBe(
        'https://app.kindful.com/oauth/authorize'
      );
    });
  });

  describe('Neon One config', () => {
    it('should have empty OAuth URLs (uses API key)', () => {
      expect(OAUTH_CONFIGS.neonone.authorizationUrl).toBe('');
      expect(OAUTH_CONFIGS.neonone.tokenUrl).toBe('');
    });
  });
});
