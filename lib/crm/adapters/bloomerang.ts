/**
 * Bloomerang CRM Adapter
 *
 * Implements the ICRMAdapter interface for Bloomerang CRM integration.
 * Bloomerang is a non-profit focused CRM with constituents, transactions, and interactions.
 * Uses API key authentication.
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
// Bloomerang API Types
// ===========================================================================

interface BloomerangConstituent {
  Id: number;
  Type: 'Individual' | 'Organization';
  Status: 'Active' | 'Inactive' | 'Deceased';
  FirstName?: string;
  LastName?: string;
  FullName: string;
  InformalName?: string;
  FormalName?: string;
  PrimaryEmail?: {
    Id: number;
    Type: string;
    Value: string;
    IsPrimary: boolean;
  };
  PrimaryPhone?: {
    Id: number;
    Type: string;
    Number: string;
    IsPrimary: boolean;
  };
  PrimaryAddress?: {
    Id: number;
    Type: string;
    Street: string;
    City: string;
    State: string;
    PostalCode: string;
    Country: string;
    IsPrimary: boolean;
  };
  Employer?: string;
  JobTitle?: string;
  GivingLevel?: string;
  TotalDonations?: number;
  TotalDonationAmount?: number;
  FirstDonationDate?: string;
  LastDonationDate?: string;
  CustomFields?: Array<{
    FieldId: number;
    Value: string;
  }>;
  CreatedDate: string;
  ModifiedDate: string;
}

interface BloomerangTransaction {
  Id: number;
  TransactionId: number;
  AccountId: number;
  Amount: number;
  Method?: 'Cash' | 'Check' | 'CreditCard' | 'ACH' | 'Other';
  Date: string;
  IsRecurring: boolean;
  Fund?: {
    Id: number;
    Name: string;
  };
  Campaign?: {
    Id: number;
    Name: string;
  };
  Appeal?: {
    Id: number;
    Name: string;
  };
  AcknowledgementStatus: 'Yes' | 'No' | 'DoNotAcknowledge';
  Designations?: Array<{
    Id: number;
    Amount: number;
    Fund: { Id: number; Name: string };
  }>;
  Note?: string;
  CreatedDate: string;
  ModifiedDate: string;
}

interface BloomerangInteraction {
  Id: number;
  AccountId: number;
  Date: string;
  Channel: 'InPerson' | 'Phone' | 'Email' | 'Mail' | 'TextMessage' | 'Website' | 'Other';
  Purpose: 'Acknowledgement' | 'Ask' | 'Cultivation' | 'Inquiry' | 'Stewardship' | 'Other';
  Subject: string;
  Note?: string;
  IsInbound: boolean;
  CreatedDate: string;
  ModifiedDate: string;
}

interface BloomerangPaginatedResponse<T> {
  Total: number;
  Start: number;
  ResultCount: number;
  Results: T[];
}

interface BloomerangCustomField {
  Id: number;
  Name: string;
  DataType: string;
  Category: string;
}

interface BloomerangErrorResponse {
  Message: string;
  ExceptionMessage?: string;
  ExceptionType?: string;
}

// ===========================================================================
// Bloomerang Adapter Implementation
// ===========================================================================

export class BloomerangAdapter extends BaseCRMAdapter {
  readonly provider: CRMProvider = 'bloomerang';

  private baseUrl: string = 'https://api.bloomerang.co/v2';

  // ===========================================================================
  // Initialization
  // ===========================================================================

  protected async onInitialize(config: CRMAdapterConfig): Promise<void> {
    if (config.credentials?.type !== 'api_key') {
      throw new CRMAuthError(
        this.provider,
        'Bloomerang requires API key authentication'
      );
    }
    console.log(
      `[Bloomerang Adapter] Initialized for org ${config.organizationId}`
    );
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/constituents?take=1');
      return response !== null;
    } catch (error) {
      console.error('[Bloomerang Adapter] Connection test failed:', error);
      return false;
    }
  }

  protected async performTokenRefresh(
    credentials: OAuth2Credentials
  ): Promise<OAuth2Credentials | null> {
    // Bloomerang uses API keys, no token refresh needed
    return null;
  }

  protected async saveCredentials(credentials: CRMCredentials): Promise<void> {
    await storeCredentials(this._organizationId, this.provider, credentials);
  }

  protected async onDisconnect(): Promise<void> {
    // API key doesn't need revocation
  }

  // ===========================================================================
  // Donor Operations (Bloomerang Constituents)
  // ===========================================================================

  async fetchDonors(options?: {
    page?: number;
    pageSize?: number;
    modifiedAfter?: Date;
  }): Promise<{ donors: CRMDonor[]; hasMore: boolean; nextPage?: number }> {
    const pageSize = options?.pageSize || 50;
    const skip = ((options?.page || 1) - 1) * pageSize;

    let url = `/constituents?take=${pageSize}&skip=${skip}`;

    if (options?.modifiedAfter) {
      url += `&lastModified=${options.modifiedAfter.toISOString().split('T')[0]}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<BloomerangPaginatedResponse<BloomerangConstituent>>(url),
      'fetchDonors'
    );

    const donors = result.Results.map((constituent) =>
      this.mapConstituentToDonor(constituent)
    );

    const hasMore = skip + result.ResultCount < result.Total;

    return {
      donors,
      hasMore,
      nextPage: hasMore ? (options?.page || 1) + 1 : undefined,
    };
  }

  async fetchDonor(externalId: string): Promise<CRMDonor | null> {
    try {
      const constituent = await this.makeRequest<BloomerangConstituent>(
        `/constituents/${externalId}`
      );
      return this.mapConstituentToDonor(constituent);
    } catch (error) {
      if (error instanceof CRMAPIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async searchDonors(query: string, limit: number = 20): Promise<CRMDonor[]> {
    const result = await this.withRetry(
      () => this.makeRequest<BloomerangPaginatedResponse<BloomerangConstituent>>(
        `/constituents?search=${encodeURIComponent(query)}&take=${limit}`
      ),
      'searchDonors'
    );

    return result.Results.map((constituent) =>
      this.mapConstituentToDonor(constituent)
    );
  }

  async createDonor(
    donor: Omit<CRMDonor, 'externalId' | 'source'>
  ): Promise<CRMDonor> {
    const constituent = this.mapDonorToConstituent(donor as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<BloomerangConstituent>(
        '/constituents',
        {
          method: 'POST',
          body: JSON.stringify(constituent),
        }
      ),
      'createDonor'
    );

    await this.logActivity('crm_donor_created', {
      provider: this.provider,
      recordId: result.Id.toString(),
      recordType: 'donor',
    });

    return this.mapConstituentToDonor(result);
  }

  async updateDonor(
    externalId: string,
    updates: Partial<CRMDonor>
  ): Promise<CRMDonor> {
    const constituent = this.mapDonorToConstituent(updates as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<BloomerangConstituent>(
        `/constituents/${externalId}`,
        {
          method: 'PUT',
          body: JSON.stringify(constituent),
        }
      ),
      'updateDonor'
    );

    await this.logActivity('crm_donor_updated', {
      provider: this.provider,
      recordId: externalId,
      recordType: 'donor',
    });

    return this.mapConstituentToDonor(result);
  }

  // ===========================================================================
  // Donation Operations (Bloomerang Transactions)
  // ===========================================================================

  async fetchDonations(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<CRMDonation[]> {
    let url = `/constituents/${donorExternalId}/transactions?take=100`;

    if (options?.startDate) {
      url += `&minDate=${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      url += `&maxDate=${options.endDate.toISOString().split('T')[0]}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<BloomerangPaginatedResponse<BloomerangTransaction>>(url),
      'fetchDonations'
    );

    return result.Results.map((transaction) =>
      this.mapTransactionToDonation(transaction, donorExternalId)
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
    const pageSize = options?.pageSize || 50;
    const skip = ((options?.page || 1) - 1) * pageSize;

    let url = `/transactions?take=${pageSize}&skip=${skip}`;

    if (options?.startDate) {
      url += `&minDate=${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      url += `&maxDate=${options.endDate.toISOString().split('T')[0]}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<BloomerangPaginatedResponse<BloomerangTransaction>>(url),
      'fetchAllDonations'
    );

    const donations = result.Results.map((transaction) =>
      this.mapTransactionToDonation(transaction, transaction.AccountId.toString())
    );

    const hasMore = skip + result.ResultCount < result.Total;

    return {
      donations,
      hasMore,
      nextPage: hasMore ? (options?.page || 1) + 1 : undefined,
    };
  }

  // ===========================================================================
  // Interaction Operations (Bloomerang Interactions)
  // ===========================================================================

  async fetchInteractions(
    donorExternalId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: CRMInteraction['type'];
    }
  ): Promise<CRMInteraction[]> {
    let url = `/constituents/${donorExternalId}/interactions?take=100`;

    if (options?.startDate) {
      url += `&minDate=${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      url += `&maxDate=${options.endDate.toISOString().split('T')[0]}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<BloomerangPaginatedResponse<BloomerangInteraction>>(url),
      'fetchInteractions'
    );

    let interactions = result.Results.map((interaction) =>
      this.mapBloomerangInteractionToNexus(interaction)
    );

    if (options?.type) {
      interactions = interactions.filter((i) => i.type === options.type);
    }

    return interactions;
  }

  async createInteraction(
    interaction: Omit<CRMInteraction, 'externalId' | 'source'>
  ): Promise<CRMInteraction> {
    const bloomerangInteraction = this.mapNexusInteractionToBloomerang(
      interaction as CRMInteraction
    );

    const result = await this.withRetry(
      () => this.makeRequest<BloomerangInteraction>(
        '/interactions',
        {
          method: 'POST',
          body: JSON.stringify(bloomerangInteraction),
        }
      ),
      'createInteraction'
    );

    await this.logActivity('crm_interaction_created', {
      provider: this.provider,
      recordId: result.Id.toString(),
      recordType: 'interaction',
    });

    return this.mapBloomerangInteractionToNexus(result);
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
      let page = 1;

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
        page = nextPage || page + 1;
      }
    }
  }

  protected async syncDonations(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void> {
    if (config.direction === 'pull' || config.direction === 'bidirectional') {
      let hasMore = true;
      let page = 1;

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
        page = nextPage || page + 1;
      }
    }
  }

  protected async syncInteractions(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void> {
    // Interactions are typically pushed from Nexus
    if (config.direction === 'push' || config.direction === 'bidirectional') {
      // Implementation would push Nexus interactions to Bloomerang
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
        return this.mapConstituentToDonor(crmRecord as BloomerangConstituent) as T;
      case 'donation':
        return this.mapTransactionToDonation(crmRecord as BloomerangTransaction, '') as T;
      case 'interaction':
        return this.mapBloomerangInteractionToNexus(crmRecord as BloomerangInteraction) as T;
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
        return this.mapDonorToConstituent(nexusRecord as CRMDonor) as T;
      case 'donation':
        return this.mapDonationToTransaction(nexusRecord as CRMDonation) as T;
      case 'interaction':
        return this.mapNexusInteractionToBloomerang(nexusRecord as CRMInteraction) as T;
      default:
        throw new Error(`Unknown record type: ${type}`);
    }
  }

  async getCustomFields(): Promise<{ name: string; type: string; label: string }[]> {
    const result = await this.makeRequest<BloomerangCustomField[]>(
      '/customfields'
    );

    return result.map((f) => ({
      name: f.Name,
      type: f.DataType,
      label: f.Name,
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

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': apiKey,
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
        'Authentication failed. API key may be invalid.'
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = (await response.json()) as BloomerangErrorResponse;
      throw new CRMAPIError(
        this.provider,
        errorData.Message || `Bloomerang API error: ${response.status}`,
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

  private mapConstituentToDonor(constituent: BloomerangConstituent): CRMDonor {
    return {
      externalId: constituent.Id.toString(),
      name: constituent.FullName,
      firstName: constituent.FirstName,
      lastName: constituent.LastName,
      email: constituent.PrimaryEmail?.Value,
      phone: constituent.PrimaryPhone?.Number,
      address: constituent.PrimaryAddress
        ? {
            street: constituent.PrimaryAddress.Street,
            city: constituent.PrimaryAddress.City,
            state: constituent.PrimaryAddress.State,
            postalCode: constituent.PrimaryAddress.PostalCode,
            country: constituent.PrimaryAddress.Country,
          }
        : undefined,
      company: constituent.Employer,
      title: constituent.JobTitle,
      donorType: constituent.Type === 'Organization' ? 'organization' : 'individual',
      givingLevel: constituent.GivingLevel,
      totalGiving: constituent.TotalDonationAmount,
      lastDonationDate: constituent.LastDonationDate
        ? new Date(constituent.LastDonationDate)
        : undefined,
      source: this.provider,
      lastSyncedAt: new Date(),
      createdAt: new Date(constituent.CreatedDate),
      updatedAt: new Date(constituent.ModifiedDate),
    };
  }

  private mapDonorToConstituent(donor: CRMDonor): Partial<BloomerangConstituent> {
    return {
      Type: donor.donorType === 'organization' ? 'Organization' : 'Individual',
      FirstName: donor.firstName,
      LastName: donor.lastName || donor.name,
      PrimaryEmail: donor.email
        ? {
            Id: 0,
            Type: 'Home',
            Value: donor.email,
            IsPrimary: true,
          }
        : undefined,
      PrimaryPhone: donor.phone
        ? {
            Id: 0,
            Type: 'Home',
            Number: donor.phone,
            IsPrimary: true,
          }
        : undefined,
      PrimaryAddress: donor.address
        ? {
            Id: 0,
            Type: 'Home',
            Street: donor.address.street || '',
            City: donor.address.city || '',
            State: donor.address.state || '',
            PostalCode: donor.address.postalCode || '',
            Country: donor.address.country || 'US',
            IsPrimary: true,
          }
        : undefined,
      Employer: donor.company,
      JobTitle: donor.title,
      GivingLevel: donor.givingLevel,
    };
  }

  private mapTransactionToDonation(
    transaction: BloomerangTransaction,
    donorExternalId: string
  ): CRMDonation {
    return {
      externalId: transaction.Id.toString(),
      donorExternalId: donorExternalId || transaction.AccountId.toString(),
      amount: transaction.Amount,
      currency: 'USD',
      date: new Date(transaction.Date),
      type: transaction.IsRecurring ? 'recurring' : 'one-time',
      paymentMethod: transaction.Method?.toLowerCase(),
      campaign: transaction.Campaign?.Name,
      notes: transaction.Note,
      status: 'completed',
      source: this.provider,
    };
  }

  private mapDonationToTransaction(
    donation: CRMDonation
  ): Partial<BloomerangTransaction> {
    return {
      AccountId: parseInt(donation.donorExternalId),
      Amount: donation.amount,
      Date: donation.date.toISOString().split('T')[0],
      IsRecurring: donation.type === 'recurring',
      Method: this.mapPaymentMethod(donation.paymentMethod),
      Note: donation.notes,
    };
  }

  private mapPaymentMethod(
    method?: string
  ): BloomerangTransaction['Method'] {
    if (!method) return 'Other';
    const methodMap: Record<string, BloomerangTransaction['Method']> = {
      cash: 'Cash',
      check: 'Check',
      credit: 'CreditCard',
      creditcard: 'CreditCard',
      ach: 'ACH',
      bank: 'ACH',
    };
    return methodMap[method.toLowerCase()] || 'Other';
  }

  private mapBloomerangInteractionToNexus(
    interaction: BloomerangInteraction
  ): CRMInteraction {
    return {
      externalId: interaction.Id.toString(),
      donorExternalId: interaction.AccountId.toString(),
      type: this.mapChannelToInteractionType(interaction.Channel),
      subject: interaction.Subject,
      description: interaction.Note,
      date: new Date(interaction.Date),
      direction: interaction.IsInbound ? 'inbound' : 'outbound',
      status: 'completed',
      source: this.provider,
    };
  }

  private mapNexusInteractionToBloomerang(
    interaction: CRMInteraction
  ): Partial<BloomerangInteraction> {
    return {
      AccountId: parseInt(interaction.donorExternalId),
      Date: interaction.date.toISOString().split('T')[0],
      Channel: this.mapInteractionTypeToChannel(interaction.type),
      Purpose: 'Cultivation',
      Subject: interaction.subject,
      Note: interaction.description,
      IsInbound: interaction.direction === 'inbound',
    };
  }

  private mapChannelToInteractionType(
    channel: BloomerangInteraction['Channel']
  ): CRMInteraction['type'] {
    const channelMap: Record<BloomerangInteraction['Channel'], CRMInteraction['type']> = {
      InPerson: 'meeting',
      Phone: 'call',
      Email: 'email',
      Mail: 'email',
      TextMessage: 'other',
      Website: 'other',
      Other: 'other',
    };
    return channelMap[channel] || 'other';
  }

  private mapInteractionTypeToChannel(
    type: CRMInteraction['type']
  ): BloomerangInteraction['Channel'] {
    const typeMap: Record<CRMInteraction['type'], BloomerangInteraction['Channel']> = {
      email: 'Email',
      call: 'Phone',
      meeting: 'InPerson',
      note: 'Other',
      task: 'Other',
      other: 'Other',
    };
    return typeMap[type] || 'Other';
  }
}
