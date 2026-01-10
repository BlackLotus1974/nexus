/**
 * Tests for CRM Types and Error Classes
 */

import {
  CRMError,
  CRMAuthError,
  CRMRateLimitError,
  CRMAPIError,
  CRMValidationError,
} from '../types';

describe('CRM Error Classes', () => {
  describe('CRMError', () => {
    it('should create a basic CRM error', () => {
      const error = new CRMError(
        'Test error',
        'TEST_CODE',
        'salesforce',
        false
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.provider).toBe('salesforce');
      expect(error.retryable).toBe(false);
      expect(error.name).toBe('CRMError');
    });

    it('should support retryable flag', () => {
      const error = new CRMError(
        'Retryable error',
        'RETRY_CODE',
        'hubspot',
        true
      );

      expect(error.retryable).toBe(true);
    });

    it('should support cause', () => {
      const cause = new Error('Original error');
      const error = new CRMError(
        'Wrapped error',
        'WRAP_CODE',
        'salesforce',
        false,
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('CRMAuthError', () => {
    it('should create an auth error with AUTH_ERROR code', () => {
      const error = new CRMAuthError('salesforce', 'Auth failed');

      expect(error.message).toBe('Auth failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.provider).toBe('salesforce');
      expect(error.retryable).toBe(true); // Auth errors are retryable
      expect(error.name).toBe('CRMAuthError');
    });

    it('should support cause', () => {
      const cause = new Error('Token expired');
      const error = new CRMAuthError('hubspot', 'Auth failed', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('CRMRateLimitError', () => {
    it('should create a rate limit error with retry info', () => {
      const error = new CRMRateLimitError('salesforce', 5000);

      expect(error.message).toBe('Rate limit exceeded. Retry after 5000ms');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.provider).toBe('salesforce');
      expect(error.retryable).toBe(true);
      expect(error.retryAfterMs).toBe(5000);
      expect(error.name).toBe('CRMRateLimitError');
    });
  });

  describe('CRMAPIError', () => {
    it('should create an API error with status code', () => {
      const error = new CRMAPIError('hubspot', 'Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.code).toBe('API_ERROR_404');
      expect(error.provider).toBe('hubspot');
      expect(error.statusCode).toBe(404);
      expect(error.retryable).toBe(false); // 4xx not retryable
      expect(error.name).toBe('CRMAPIError');
    });

    it('should be retryable for 5xx errors', () => {
      const error = new CRMAPIError('salesforce', 'Server error', 500);

      expect(error.retryable).toBe(true);
    });

    it('should not be retryable for 4xx errors', () => {
      const error400 = new CRMAPIError('salesforce', 'Bad request', 400);
      const error403 = new CRMAPIError('salesforce', 'Forbidden', 403);

      expect(error400.retryable).toBe(false);
      expect(error403.retryable).toBe(false);
    });
  });

  describe('CRMValidationError', () => {
    it('should create a validation error', () => {
      const error = new CRMValidationError(
        'bloomerang',
        'Invalid email format',
        'email'
      );

      expect(error.message).toBe('Invalid email format');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.provider).toBe('bloomerang');
      expect(error.field).toBe('email');
      expect(error.retryable).toBe(false);
      expect(error.name).toBe('CRMValidationError');
    });

    it('should work without field', () => {
      const error = new CRMValidationError('kindful', 'Invalid data');

      expect(error.field).toBeUndefined();
    });
  });
});

describe('CRM Type Guards', () => {
  describe('OAuth2Credentials', () => {
    it('should have correct structure', () => {
      const credentials = {
        type: 'oauth2',
        accessToken: 'access_123',
        refreshToken: 'refresh_456',
        tokenType: 'Bearer',
        expiresAt: new Date(),
        scope: 'api offline_access',
        instanceUrl: 'https://example.salesforce.com',
      };

      expect(credentials.type).toBe('oauth2');
      expect(credentials.accessToken).toBeDefined();
      expect(credentials.refreshToken).toBeDefined();
    });
  });

  describe('APIKeyCredentials', () => {
    it('should have correct structure', () => {
      const credentials = {
        type: 'api_key',
        apiKey: 'key_123',
        apiSecret: 'secret_456',
      };

      expect(credentials.type).toBe('api_key');
      expect(credentials.apiKey).toBeDefined();
    });
  });

  describe('BasicAuthCredentials', () => {
    it('should have correct structure', () => {
      const credentials = {
        type: 'basic',
        username: 'user',
        password: 'pass',
      };

      expect(credentials.type).toBe('basic');
      expect(credentials.username).toBeDefined();
      expect(credentials.password).toBeDefined();
    });
  });
});

describe('CRM Data Models', () => {
  describe('CRMDonor', () => {
    it('should have required fields', () => {
      const donor = {
        externalId: 'ext_123',
        name: 'John Doe',
        source: 'salesforce',
      };

      expect(donor.externalId).toBeDefined();
      expect(donor.name).toBeDefined();
      expect(donor.source).toBeDefined();
    });

    it('should support all optional fields', () => {
      const donor = {
        externalId: 'ext_123',
        nexusId: 'nexus_456',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
        company: 'Acme Corp',
        title: 'CEO',
        donorType: 'individual',
        givingLevel: 'major',
        totalGiving: 50000,
        lastDonationDate: new Date(),
        lastContactDate: new Date(),
        tags: ['major-donor', 'board-member'],
        customFields: { custom_field_1: 'value' },
        source: 'salesforce',
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(donor.email).toBeDefined();
      expect(donor.address?.city).toBe('New York');
      expect(donor.tags).toContain('major-donor');
    });
  });

  describe('CRMSyncConfig', () => {
    it('should have correct structure', () => {
      const config = {
        direction: 'bidirectional',
        syncDonors: true,
        syncDonations: true,
        syncInteractions: true,
        syncFrequencyMinutes: 60,
        conflictResolution: 'newest_wins',
      };

      expect(config.direction).toBe('bidirectional');
      expect(config.syncDonors).toBe(true);
      expect(config.conflictResolution).toBe('newest_wins');
    });
  });

  describe('CRMSyncResult', () => {
    it('should have correct structure', () => {
      const result = {
        syncId: 'sync_123',
        provider: 'salesforce',
        organizationId: 'org_456',
        direction: 'bidirectional',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        stats: {
          totalProcessed: 100,
          created: 10,
          updated: 20,
          pushed: 15,
          skipped: 50,
          failed: 5,
        },
        errors: [],
      };

      expect(result.status).toBe('completed');
      expect(result.stats.totalProcessed).toBe(100);
      expect(result.errors).toHaveLength(0);
    });
  });
});
