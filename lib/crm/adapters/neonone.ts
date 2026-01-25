/**
 * Neon One CRM Adapter
 *
 * Implements the ICRMAdapter interface for Neon One (Neon CRM) integration.
 * Neon One is a non-profit CRM with accounts, donations, and activities.
 * Uses API key authentication with organization ID.
 */

import { BaseCRMAdapter } from '../base-adapter';
import { storeCredentials } from '../oauth';
import type {
  CRMProvider,
  CRMAdapterConfig,
  CRMDonor,
  CRMDonation,
  CRMInteraction,
  CRMSyncConfig,
  CRMSyncResult,
  OAuth2Credentials,
  CRMCredentials,
  APIKeyCredentials,
} from '../types';
import {
  CRMAuthError,
  CRMRateLimitError,
  CRMAPIError,
} from '../types';

// ===========================================================================
// Neon One API Types
// ===========================================================================

interface NeonAccount {
  accountId: string;
  accountType: 'Individual' | 'Organization' | 'Household';
  primaryContact: {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    email1?: string;
    phone1?: string;
    phone1Type?: string;
    addresses?: Array<{
      addressId: string;
      addressType: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      stateProvince?: string;
      zipCode?: string;
      country?: string;
      isPrimary: boolean;
    }>;
  };
  companyName?: string;
  individualTypes?: string[];
  organizationTypes?: string[];
  donorType?: string;
  totalDonations?: number;
  totalDonationAmount?: number;
  firstDonationDate?: string;
  lastDonationDate?: string;
  lastActivityDate?: string;
  customFieldDataList?: Array<{
    fieldId: string;
    fieldValue: string;
  }>;
  timestamps: {
    createdDateTime: string;
    lastModifiedDateTime: string;
  };
}

interface NeonDonation {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  fund?: {
    id: string;
    name: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
  purpose?: string;
  tenderType?: string;
  donationStatus: 'Succeeded' | 'Pending' | 'Declined' | 'Refunded';
  isRecurring: boolean;
  acknowledgementStatus?: string;
  note?: string;
  timestamps: {
    createdDateTime: string;
    lastModifiedDateTime: string;
  };
}

interface NeonActivity {
  activityId: string;
  accountId: string;
  activityType: 'Email' | 'Phone' | 'Meeting' | 'Note' | 'Task' | 'Letter' | 'Other';
  subject: string;
  note?: string;
  activityDate: string;
  status: 'Completed' | 'Scheduled' | 'Cancelled';
  direction?: 'Inbound' | 'Outbound';
  assignedTo?: string;
  timestamps: {
    createdDateTime: string;
    lastModifiedDateTime: string;
  };
}

interface NeonSearchResponse<T> {
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalResults: number;
  };
  searchResults: T[];
}

interface NeonCustomField {
  id: string;
  name: string;
  dataType: string;
  component: string;
}

interface NeonErrorResponse {
  errorCode: string;
  errorMessage: string;
  details?: string[];
}

// ===========================================================================
// Neon One Adapter Implementation
// ===========================================================================

export class NeonOneAdapter extends BaseCRMAdapter {
  readonly provider: CRMProvider = 'neonone';

  private baseUrl: string = 'https://api.neoncrm.com/v2';
  private orgId: string = '';

  // ===========================================================================
  // Initialization
  // ===========================================================================

  protected async onInitialize(config: CRMAdapterConfig): Promise<void> {
    if (config.credentials?.type !== 'api_key') {
      throw new CRMAuthError(
        this.provider,
        'Neon One requires API key authentication'
      );
    }

    // Neon One requires organization ID as apiSecret
    const credentials = config.credentials as APIKeyCredentials;
    if (!credentials.apiSecret) {
      throw new CRMAuthError(
        this.provider,
        'Neon One requires organization ID (store in apiSecret)'
      );
    }

    this.orgId = credentials.apiSecret;

    console.log(
      `[Neon One Adapter] Initialized for org ${config.organizationId}`
    );
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/accounts?pageSize=1');
      return response !== null;
    } catch (error) {
      console.error('[Neon One Adapter] Connection test failed:', error);
      return false;
    }
  }

  protected async performTokenRefresh(
    credentials: OAuth2Credentials
  ): Promise<OAuth2Credentials | null> {
    // Neon One uses API keys, no refresh needed
    return null;
  }

  protected async saveCredentials(credentials: CRMCredentials): Promise<void> {
    await storeCredentials(this._organizationId, this.provider, credentials);
  }

  protected async onDisconnect(): Promise<void> {
    // API key doesn't need revocation
  }

  // ===========================================================================
  // Donor Operations (Neon One Accounts)
  // ===========================================================================

  async fetchDonors(options?: {
    page?: number;
    pageSize?: number;
    modifiedAfter?: Date;
  }): Promise<{ donors: CRMDonor[]; hasMore: boolean; nextPage?: number }> {
    const page = options?.page || 0;
    const pageSize = options?.pageSize || 50;

    const searchFields: Array<{ field: string; operator: string; value: string }> = [];

    if (options?.modifiedAfter) {
      searchFields.push({
        field: 'Last Modified Date/Time',
        operator: 'GREATER_THAN',
        value: options.modifiedAfter.toISOString(),
      });
    }

    const searchBody = {
      outputFields: [
        'Account ID', 'Account Type', 'First Name', 'Last Name',
        'Email 1', 'Phone 1', 'Company Name', 'Total Donations',
        'Total Donation Amount', 'First Donation Date', 'Last Donation Date',
      ],
      pagination: {
        currentPage: page,
        pageSize,
      },
      searchFields: searchFields.length > 0 ? searchFields : undefined,
    };

    const result = await this.withRetry(
      () => this.makeRequest<NeonSearchResponse<NeonAccount>>(
        '/accounts/search',
        {
          method: 'POST',
          body: JSON.stringify(searchBody),
        }
      ),
      'fetchDonors'
    );

    const donors = result.searchResults.map((account) =>
      this.mapAccountToDonor(account)
    );

    const hasMore = result.pagination.currentPage < result.pagination.totalPages - 1;

    return {
      donors,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };
  }

  async fetchDonor(externalId: string): Promise<CRMDonor | null> {
    try {
      const account = await this.makeRequest<NeonAccount>(
        `/accounts/${externalId}`
      );
      return this.mapAccountToDonor(account);
    } catch (error) {
      if (error instanceof CRMAPIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async searchDonors(query: string, limit: number = 20): Promise<CRMDonor[]> {
    const searchBody = {
      outputFields: [
        'Account ID', 'Account Type', 'First Name', 'Last Name',
        'Email 1', 'Phone 1', 'Company Name', 'Total Donation Amount',
      ],
      pagination: {
        currentPage: 0,
        pageSize: limit,
      },
      searchFields: [
        {
          field: 'Full Name (F)',
          operator: 'CONTAIN',
          value: query,
        },
      ],
    };

    const result = await this.withRetry(
      () => this.makeRequest<NeonSearchResponse<NeonAccount>>(
        '/accounts/search',
        {
          method: 'POST',
          body: JSON.stringify(searchBody),
        }
      ),
      'searchDonors'
    );

    return result.searchResults.map((account) => this.mapAccountToDonor(account));
  }

  async createDonor(
    donor: Omit<CRMDonor, 'externalId' | 'source'>
  ): Promise<CRMDonor> {
    const account = this.mapDonorToAccount(donor as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<NeonAccount>(
        '/accounts',
        {
          method: 'POST',
          body: JSON.stringify(account),
        }
      ),
      'createDonor'
    );

    await this.logActivity('crm_donor_created', {
      provider: this.provider,
      recordId: result.accountId,
      recordType: 'donor',
    });

    return this.mapAccountToDonor(result);
  }

  async updateDonor(
    externalId: string,
    updates: Partial<CRMDonor>
  ): Promise<CRMDonor> {
    const account = this.mapDonorToAccount(updates as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<NeonAccount>(
        `/accounts/${externalId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(account),
        }
      ),
      'updateDonor'
    );

    await this.logActivity('crm_donor_updated', {
      provider: this.provider,
      recordId: externalId,
      recordType: 'donor',
    });

    return this.mapAccountToDonor(result);
  }

  // ===========================================================================
  // Donation Operations (Neon One Donations)
  // ===========================================================================

  async fetchDonations(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<CRMDonation[]> {
    const searchFields: Array<{ field: string; operator: string; value: string }> = [
      {
        field: 'Account ID',
        operator: 'EQUAL',
        value: donorExternalId,
      },
    ];

    if (options?.startDate) {
      searchFields.push({
        field: 'Donation Date',
        operator: 'GREATER_THAN',
        value: options.startDate.toISOString().split('T')[0],
      });
    }

    if (options?.endDate) {
      searchFields.push({
        field: 'Donation Date',
        operator: 'LESS_THAN',
        value: options.endDate.toISOString().split('T')[0],
      });
    }

    const searchBody = {
      outputFields: [
        'Donation ID', 'Account ID', 'Amount', 'Donation Date',
        'Fund Name', 'Campaign Name', 'Tender Type', 'Donation Status',
      ],
      pagination: {
        currentPage: 0,
        pageSize: 100,
      },
      searchFields,
    };

    const result = await this.withRetry(
      () => this.makeRequest<NeonSearchResponse<NeonDonation>>(
        '/donations/search',
        {
          method: 'POST',
          body: JSON.stringify(searchBody),
        }
      ),
      'fetchDonations'
    );

    return result.searchResults.map((donation) =>
      this.mapNeonDonationToNexus(donation)
    );
  }

  async fetchAllDonations(options?: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    donations: CRMDonation[];
    hasMore: boolean;
    nextPage?: number;
  }> {
    const page = options?.page || 0;
    const pageSize = options?.pageSize || 50;

    const searchFields: Array<{ field: string; operator: string; value: string }> = [
      {
        field: 'Donation Status',
        operator: 'EQUAL',
        value: 'Succeeded',
      },
    ];

    if (options?.startDate) {
      searchFields.push({
        field: 'Donation Date',
        operator: 'GREATER_THAN',
        value: options.startDate.toISOString().split('T')[0],
      });
    }

    if (options?.endDate) {
      searchFields.push({
        field: 'Donation Date',
        operator: 'LESS_THAN',
        value: options.endDate.toISOString().split('T')[0],
      });
    }

    const searchBody = {
      outputFields: [
        'Donation ID', 'Account ID', 'Amount', 'Donation Date',
        'Fund Name', 'Campaign Name', 'Tender Type', 'Donation Status',
      ],
      pagination: {
        currentPage: page,
        pageSize,
      },
      searchFields,
    };

    const result = await this.withRetry(
      () => this.makeRequest<NeonSearchResponse<NeonDonation>>(
        '/donations/search',
        {
          method: 'POST',
          body: JSON.stringify(searchBody),
        }
      ),
      'fetchAllDonations'
    );

    const donations = result.searchResults.map((donation) =>
      this.mapNeonDonationToNexus(donation)
    );

    const hasMore = result.pagination.currentPage < result.pagination.totalPages - 1;

    return {
      donations,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };
  }

  // ===========================================================================
  // Interaction Operations (Neon One Activities)
  // ===========================================================================

  async fetchInteractions(
    donorExternalId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: CRMInteraction['type'];
    }
  ): Promise<CRMInteraction[]> {
    let url = `/accounts/${donorExternalId}/activities?pageSize=100`;

    if (options?.startDate) {
      url += `&activityDateFrom=${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      url += `&activityDateTo=${options.endDate.toISOString().split('T')[0]}`;
    }

    if (options?.type) {
      const neonType = this.mapInteractionTypeToNeon(options.type);
      url += `&activityType=${neonType}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<{ activities: NeonActivity[] }>(url),
      'fetchInteractions'
    );

    return (result.activities || []).map((activity) =>
      this.mapActivityToInteraction(activity)
    );
  }

  async createInteraction(
    interaction: Omit<CRMInteraction, 'externalId' | 'source'>
  ): Promise<CRMInteraction> {
    const activity = this.mapInteractionToActivity(interaction as CRMInteraction);

    const result = await this.withRetry(
      () => this.makeRequest<NeonActivity>(
        `/accounts/${interaction.donorExternalId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify(activity),
        }
      ),
      'createInteraction'
    );

    await this.logActivity('crm_interaction_created', {
      provider: this.provider,
      recordId: result.activityId,
      recordType: 'interaction',
    });

    return this.mapActivityToInteraction(result);
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  protected async syncDonors(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void> {
    if (config.direction === 'pull' || config.direction === 'bidirectional') {
      let hasMore = true;
      let page = 0;

      while (hasMore) {
        const { donors, hasMore: more, nextPage } = await this.fetchDonors({
          page,
          pageSize: 50,
          modifiedAfter: config.filters?.modifiedAfter,
        });

        for (const donor of donors) {
          try {
            result.stats.totalProcessed++;
            result.stats.updated++;

            await this.logActivity('crm_donor_synced', {
              provider: this.provider,
              recordId: donor.externalId,
              recordType: 'donor',
            });
          } catch (error) {
            this.addSyncError(result, {
              recordId: donor.externalId,
              recordType: 'donor',
              code: 'DONOR_SYNC_FAILED',
              message: (error as Error).message,
              retryable: true,
            });
          }
        }

        hasMore = more;
        page = nextPage ?? page + 1;
      }
    }
  }

  protected async syncDonations(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void> {
    if (config.direction === 'pull' || config.direction === 'bidirectional') {
      let hasMore = true;
      let page = 0;

      while (hasMore) {
        const { donations, hasMore: more, nextPage } = await this.fetchAllDonations({
          page,
          pageSize: 50,
          startDate: config.filters?.modifiedAfter,
        });

        for (const donation of donations) {
          try {
            result.stats.totalProcessed++;
            result.stats.updated++;

            await this.logActivity('crm_donation_synced', {
              provider: this.provider,
              recordId: donation.externalId,
              recordType: 'donation',
            });
          } catch (error) {
            this.addSyncError(result, {
              recordId: donation.externalId,
              recordType: 'donation',
              code: 'DONATION_SYNC_FAILED',
              message: (error as Error).message,
              retryable: true,
            });
          }
        }

        hasMore = more;
        page = nextPage ?? page + 1;
      }
    }
  }

  protected async syncInteractions(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void> {
    // Interactions are typically pushed from Nexus
    if (config.direction === 'push' || config.direction === 'bidirectional') {
      // Implementation would push Nexus interactions to Neon One
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  mapToNexus<T>(
    crmRecord: unknown,
    type: 'donor' | 'donation' | 'interaction'
  ): T {
    switch (type) {
      case 'donor':
        return this.mapAccountToDonor(crmRecord as NeonAccount) as T;
      case 'donation':
        return this.mapNeonDonationToNexus(crmRecord as NeonDonation) as T;
      case 'interaction':
        return this.mapActivityToInteraction(crmRecord as NeonActivity) as T;
      default:
        throw new Error(`Unknown record type: ${type}`);
    }
  }

  mapFromNexus<T>(
    nexusRecord: unknown,
    type: 'donor' | 'donation' | 'interaction'
  ): T {
    switch (type) {
      case 'donor':
        return this.mapDonorToAccount(nexusRecord as CRMDonor) as T;
      case 'donation':
        return this.mapNexusDonationToNeon(nexusRecord as CRMDonation) as T;
      case 'interaction':
        return this.mapInteractionToActivity(nexusRecord as CRMInteraction) as T;
      default:
        throw new Error(`Unknown record type: ${type}`);
    }
  }

  async getCustomFields(): Promise<{ name: string; type: string; label: string }[]> {
    const result = await this.makeRequest<{ customFields: NeonCustomField[] }>(
      '/customFields'
    );

    return (result.customFields || []).map((f) => ({
      name: f.id,
      type: f.dataType,
      label: f.name,
    }));
  }

  // ===========================================================================
  // Private: API Methods
  // ===========================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this._credentials || this._credentials.type !== 'api_key') {
      throw new CRMAuthError(this.provider, 'API key credentials required');
    }

    const apiKey = (this._credentials as APIKeyCredentials).apiKey;

    // Neon One uses Basic Auth with orgId:apiKey
    const authString = Buffer.from(`${this.orgId}:${apiKey}`).toString('base64');

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      throw new CRMRateLimitError(this.provider, retryMs);
    }

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      throw new CRMAuthError(
        this.provider,
        'Authentication failed. API key or org ID may be invalid.'
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = (await response.json()) as NeonErrorResponse;
      throw new CRMAPIError(
        this.provider,
        errorData.errorMessage || `Neon One API error: ${response.status}`,
        response.status
      );
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ===========================================================================
  // Private: Data Mapping
  // ===========================================================================

  private mapAccountToDonor(account: NeonAccount): CRMDonor {
    const contact = account.primaryContact || {};
    const primaryAddress = contact.addresses?.find((a) => a.isPrimary) || contact.addresses?.[0];

    return {
      externalId: account.accountId,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
            account.companyName || 'Unknown',
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email1,
      phone: contact.phone1,
      address: primaryAddress
        ? {
            street: primaryAddress.addressLine1,
            street2: primaryAddress.addressLine2,
            city: primaryAddress.city,
            state: primaryAddress.stateProvince,
            postalCode: primaryAddress.zipCode,
            country: primaryAddress.country,
          }
        : undefined,
      company: account.companyName,
      donorType: account.accountType === 'Organization' ? 'organization' : 'individual',
      givingLevel: account.donorType,
      totalGiving: account.totalDonationAmount,
      lastDonationDate: account.lastDonationDate
        ? new Date(account.lastDonationDate)
        : undefined,
      source: this.provider,
      lastSyncedAt: new Date(),
      createdAt: new Date(account.timestamps.createdDateTime),
      updatedAt: new Date(account.timestamps.lastModifiedDateTime),
    };
  }

  private mapDonorToAccount(donor: CRMDonor): Partial<NeonAccount> {
    return {
      accountType: donor.donorType === 'organization' ? 'Organization' : 'Individual',
      primaryContact: {
        firstName: donor.firstName,
        lastName: donor.lastName || donor.name,
        email1: donor.email,
        phone1: donor.phone,
        addresses: donor.address
          ? [{
              addressId: '',
              addressType: 'Home',
              addressLine1: donor.address.street,
              addressLine2: donor.address.street2,
              city: donor.address.city,
              stateProvince: donor.address.state,
              zipCode: donor.address.postalCode,
              country: donor.address.country,
              isPrimary: true,
            }]
          : undefined,
      },
      companyName: donor.company,
      donorType: donor.givingLevel,
    };
  }

  private mapNeonDonationToNexus(donation: NeonDonation): CRMDonation {
    return {
      externalId: donation.id,
      donorExternalId: donation.accountId,
      amount: donation.amount,
      currency: 'USD',
      date: new Date(donation.date),
      type: donation.isRecurring ? 'recurring' : 'one-time',
      paymentMethod: donation.tenderType?.toLowerCase(),
      campaign: donation.campaign?.name,
      notes: donation.note,
      status: this.mapNeonDonationStatus(donation.donationStatus),
      source: this.provider,
    };
  }

  private mapNexusDonationToNeon(donation: CRMDonation): Partial<NeonDonation> {
    return {
      accountId: donation.donorExternalId,
      amount: donation.amount,
      date: donation.date.toISOString().split('T')[0],
      isRecurring: donation.type === 'recurring',
      tenderType: donation.paymentMethod,
      note: donation.notes,
    };
  }

  private mapNeonDonationStatus(
    status: NeonDonation['donationStatus']
  ): CRMDonation['status'] {
    const statusMap: Record<NeonDonation['donationStatus'], CRMDonation['status']> = {
      'Succeeded': 'completed',
      'Pending': 'pending',
      'Declined': 'failed',
      'Refunded': 'refunded',
    };
    return statusMap[status] || 'pending';
  }

  private mapActivityToInteraction(activity: NeonActivity): CRMInteraction {
    return {
      externalId: activity.activityId,
      donorExternalId: activity.accountId,
      type: this.mapNeonActivityTypeToNexus(activity.activityType),
      subject: activity.subject,
      description: activity.note,
      date: new Date(activity.activityDate),
      direction: activity.direction === 'Inbound' ? 'inbound' : 'outbound',
      status: activity.status === 'Completed' ? 'completed' :
              activity.status === 'Cancelled' ? 'cancelled' : 'scheduled',
      assignedTo: activity.assignedTo,
      source: this.provider,
    };
  }

  private mapInteractionToActivity(interaction: CRMInteraction): Partial<NeonActivity> {
    return {
      accountId: interaction.donorExternalId,
      activityType: this.mapInteractionTypeToNeon(interaction.type),
      subject: interaction.subject,
      note: interaction.description,
      activityDate: interaction.date.toISOString().split('T')[0],
      status: interaction.status === 'completed' ? 'Completed' : 'Scheduled',
      direction: interaction.direction === 'inbound' ? 'Inbound' : 'Outbound',
      assignedTo: interaction.assignedTo,
    };
  }

  private mapNeonActivityTypeToNexus(
    activityType: NeonActivity['activityType']
  ): CRMInteraction['type'] {
    const typeMap: Record<NeonActivity['activityType'], CRMInteraction['type']> = {
      'Email': 'email',
      'Phone': 'call',
      'Meeting': 'meeting',
      'Note': 'note',
      'Task': 'task',
      'Letter': 'email',
      'Other': 'other',
    };
    return typeMap[activityType] || 'other';
  }

  private mapInteractionTypeToNeon(
    type: CRMInteraction['type']
  ): NeonActivity['activityType'] {
    const typeMap: Record<CRMInteraction['type'], NeonActivity['activityType']> = {
      'email': 'Email',
      'call': 'Phone',
      'meeting': 'Meeting',
      'note': 'Note',
      'task': 'Task',
      'other': 'Other',
    };
    return typeMap[type] || 'Other';
  }
}
