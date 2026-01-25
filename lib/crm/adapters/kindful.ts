/**
 * Kindful CRM Adapter
 *
 * Implements the ICRMAdapter interface for Kindful CRM integration.
 * Kindful is a non-profit CRM focusing on contacts, donations, and campaigns.
 * Uses API token authentication.
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
// Kindful API Types
// ===========================================================================

interface KindfulContact {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  title?: string;
  contact_type: 'individual' | 'company' | 'household';
  donor_status?: 'active' | 'lapsed' | 'new' | 'major' | 'recurring';
  total_donated?: number;
  first_donation_date?: string;
  last_donation_date?: string;
  tags?: string[];
  custom_fields?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface KindfulDonation {
  id: string;
  contact_id: string;
  amount: number;
  currency: string;
  transaction_date: string;
  payment_method?: 'credit_card' | 'check' | 'cash' | 'ach' | 'other';
  campaign_id?: string;
  campaign_name?: string;
  fund_id?: string;
  fund_name?: string;
  is_recurring: boolean;
  recurring_donation_id?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  note?: string;
  acknowledgment_status?: 'not_sent' | 'sent' | 'do_not_send';
  created_at: string;
  updated_at: string;
}

interface KindfulActivity {
  id: string;
  contact_id: string;
  activity_type: 'email' | 'phone_call' | 'meeting' | 'note' | 'task' | 'other';
  subject: string;
  description?: string;
  activity_date: string;
  completed: boolean;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

interface KindfulPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

interface KindfulCustomField {
  id: string;
  name: string;
  field_type: string;
  options?: string[];
}

interface KindfulErrorResponse {
  error: string;
  message: string;
  status: number;
}

// ===========================================================================
// Kindful Adapter Implementation
// ===========================================================================

export class KindfulAdapter extends BaseCRMAdapter {
  readonly provider: CRMProvider = 'kindful';

  private baseUrl: string = 'https://app.kindful.com/api/v1';

  // ===========================================================================
  // Initialization
  // ===========================================================================

  protected async onInitialize(config: CRMAdapterConfig): Promise<void> {
    if (config.credentials?.type !== 'api_key') {
      throw new CRMAuthError(
        this.provider,
        'Kindful requires API token authentication'
      );
    }
    console.log(
      `[Kindful Adapter] Initialized for org ${config.organizationId}`
    );
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/contacts?per_page=1');
      return response !== null;
    } catch (error) {
      console.error('[Kindful Adapter] Connection test failed:', error);
      return false;
    }
  }

  protected async performTokenRefresh(
    credentials: OAuth2Credentials
  ): Promise<OAuth2Credentials | null> {
    // Kindful uses API tokens, no refresh needed
    return null;
  }

  protected async saveCredentials(credentials: CRMCredentials): Promise<void> {
    await storeCredentials(this._organizationId, this.provider, credentials);
  }

  protected async onDisconnect(): Promise<void> {
    // API token doesn't need revocation
  }

  // ===========================================================================
  // Donor Operations (Kindful Contacts)
  // ===========================================================================

  async fetchDonors(options?: {
    page?: number;
    pageSize?: number;
    modifiedAfter?: Date;
  }): Promise<{ donors: CRMDonor[]; hasMore: boolean; nextPage?: number }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;

    let url = `/contacts?page=${page}&per_page=${pageSize}`;

    if (options?.modifiedAfter) {
      url += `&updated_after=${options.modifiedAfter.toISOString()}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<KindfulPaginatedResponse<KindfulContact>>(url),
      'fetchDonors'
    );

    const donors = result.data.map((contact) =>
      this.mapContactToDonor(contact)
    );

    const hasMore = result.meta.current_page < result.meta.total_pages;

    return {
      donors,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };
  }

  async fetchDonor(externalId: string): Promise<CRMDonor | null> {
    try {
      const contact = await this.makeRequest<KindfulContact>(
        `/contacts/${externalId}`
      );
      return this.mapContactToDonor(contact);
    } catch (error) {
      if (error instanceof CRMAPIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async searchDonors(query: string, limit: number = 20): Promise<CRMDonor[]> {
    const result = await this.withRetry(
      () => this.makeRequest<KindfulPaginatedResponse<KindfulContact>>(
        `/contacts?search=${encodeURIComponent(query)}&per_page=${limit}`
      ),
      'searchDonors'
    );

    return result.data.map((contact) => this.mapContactToDonor(contact));
  }

  async createDonor(
    donor: Omit<CRMDonor, 'externalId' | 'source'>
  ): Promise<CRMDonor> {
    const contact = this.mapDonorToContact(donor as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<KindfulContact>(
        '/contacts',
        {
          method: 'POST',
          body: JSON.stringify({ contact }),
        }
      ),
      'createDonor'
    );

    await this.logActivity('crm_donor_created', {
      provider: this.provider,
      recordId: result.id,
      recordType: 'donor',
    });

    return this.mapContactToDonor(result);
  }

  async updateDonor(
    externalId: string,
    updates: Partial<CRMDonor>
  ): Promise<CRMDonor> {
    const contact = this.mapDonorToContact(updates as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<KindfulContact>(
        `/contacts/${externalId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ contact }),
        }
      ),
      'updateDonor'
    );

    await this.logActivity('crm_donor_updated', {
      provider: this.provider,
      recordId: externalId,
      recordType: 'donor',
    });

    return this.mapContactToDonor(result);
  }

  // ===========================================================================
  // Donation Operations (Kindful Donations)
  // ===========================================================================

  async fetchDonations(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<CRMDonation[]> {
    let url = `/contacts/${donorExternalId}/donations?per_page=100`;

    if (options?.startDate) {
      url += `&transaction_date_after=${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      url += `&transaction_date_before=${options.endDate.toISOString().split('T')[0]}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<KindfulPaginatedResponse<KindfulDonation>>(url),
      'fetchDonations'
    );

    return result.data.map((donation) =>
      this.mapKindfulDonationToNexus(donation)
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
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;

    let url = `/donations?page=${page}&per_page=${pageSize}&status=completed`;

    if (options?.startDate) {
      url += `&transaction_date_after=${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      url += `&transaction_date_before=${options.endDate.toISOString().split('T')[0]}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<KindfulPaginatedResponse<KindfulDonation>>(url),
      'fetchAllDonations'
    );

    const donations = result.data.map((donation) =>
      this.mapKindfulDonationToNexus(donation)
    );

    const hasMore = result.meta.current_page < result.meta.total_pages;

    return {
      donations,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };
  }

  // ===========================================================================
  // Interaction Operations (Kindful Activities)
  // ===========================================================================

  async fetchInteractions(
    donorExternalId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: CRMInteraction['type'];
    }
  ): Promise<CRMInteraction[]> {
    let url = `/contacts/${donorExternalId}/activities?per_page=100`;

    if (options?.startDate) {
      url += `&activity_date_after=${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      url += `&activity_date_before=${options.endDate.toISOString().split('T')[0]}`;
    }

    if (options?.type) {
      const kindfulType = this.mapInteractionTypeToKindful(options.type);
      url += `&activity_type=${kindfulType}`;
    }

    const result = await this.withRetry(
      () => this.makeRequest<KindfulPaginatedResponse<KindfulActivity>>(url),
      'fetchInteractions'
    );

    return result.data.map((activity) =>
      this.mapActivityToInteraction(activity)
    );
  }

  async createInteraction(
    interaction: Omit<CRMInteraction, 'externalId' | 'source'>
  ): Promise<CRMInteraction> {
    const activity = this.mapInteractionToActivity(interaction as CRMInteraction);

    const result = await this.withRetry(
      () => this.makeRequest<KindfulActivity>(
        '/activities',
        {
          method: 'POST',
          body: JSON.stringify({ activity }),
        }
      ),
      'createInteraction'
    );

    await this.logActivity('crm_interaction_created', {
      provider: this.provider,
      recordId: result.id,
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
      // Implementation would push Nexus interactions to Kindful
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
        return this.mapContactToDonor(crmRecord as KindfulContact) as T;
      case 'donation':
        return this.mapKindfulDonationToNexus(crmRecord as KindfulDonation) as T;
      case 'interaction':
        return this.mapActivityToInteraction(crmRecord as KindfulActivity) as T;
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
        return this.mapDonorToContact(nexusRecord as CRMDonor) as T;
      case 'donation':
        return this.mapNexusDonationToKindful(nexusRecord as CRMDonation) as T;
      case 'interaction':
        return this.mapInteractionToActivity(nexusRecord as CRMInteraction) as T;
      default:
        throw new Error(`Unknown record type: ${type}`);
    }
  }

  async getCustomFields(): Promise<{ name: string; type: string; label: string }[]> {
    const result = await this.makeRequest<KindfulCustomField[]>(
      '/custom_fields'
    );

    return result.map((f) => ({
      name: f.id,
      type: f.field_type,
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
      throw new CRMAuthError(this.provider, 'API token credentials required');
    }

    const apiToken = (this._credentials as APIKeyCredentials).apiKey;

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Token token=${apiToken}`,
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
        'Authentication failed. API token may be invalid.'
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = (await response.json()) as KindfulErrorResponse;
      throw new CRMAPIError(
        this.provider,
        errorData.message || `Kindful API error: ${response.status}`,
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

  private mapContactToDonor(contact: KindfulContact): CRMDonor {
    return {
      externalId: contact.id,
      name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown',
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      address: {
        street: contact.address_line_1,
        street2: contact.address_line_2,
        city: contact.city,
        state: contact.state,
        postalCode: contact.postal_code,
        country: contact.country,
      },
      company: contact.company,
      title: contact.title,
      donorType: contact.contact_type === 'company' ? 'organization' : 'individual',
      givingLevel: contact.donor_status,
      totalGiving: contact.total_donated,
      lastDonationDate: contact.last_donation_date
        ? new Date(contact.last_donation_date)
        : undefined,
      tags: contact.tags,
      customFields: contact.custom_fields,
      source: this.provider,
      lastSyncedAt: new Date(),
      createdAt: new Date(contact.created_at),
      updatedAt: new Date(contact.updated_at),
    };
  }

  private mapDonorToContact(donor: CRMDonor): Partial<KindfulContact> {
    return {
      first_name: donor.firstName,
      last_name: donor.lastName || donor.name,
      email: donor.email,
      phone: donor.phone,
      address_line_1: donor.address?.street,
      address_line_2: donor.address?.street2,
      city: donor.address?.city,
      state: donor.address?.state,
      postal_code: donor.address?.postalCode,
      country: donor.address?.country,
      company: donor.company,
      title: donor.title,
      contact_type: donor.donorType === 'organization' ? 'company' : 'individual',
      tags: donor.tags,
    };
  }

  private mapKindfulDonationToNexus(donation: KindfulDonation): CRMDonation {
    return {
      externalId: donation.id,
      donorExternalId: donation.contact_id,
      amount: donation.amount,
      currency: donation.currency || 'USD',
      date: new Date(donation.transaction_date),
      type: donation.is_recurring ? 'recurring' : 'one-time',
      paymentMethod: donation.payment_method,
      campaign: donation.campaign_name,
      notes: donation.note,
      status: donation.status,
      source: this.provider,
    };
  }

  private mapNexusDonationToKindful(donation: CRMDonation): Partial<KindfulDonation> {
    return {
      contact_id: donation.donorExternalId,
      amount: donation.amount,
      currency: donation.currency,
      transaction_date: donation.date.toISOString().split('T')[0],
      is_recurring: donation.type === 'recurring',
      payment_method: donation.paymentMethod as KindfulDonation['payment_method'],
      note: donation.notes,
    };
  }

  private mapActivityToInteraction(activity: KindfulActivity): CRMInteraction {
    return {
      externalId: activity.id,
      donorExternalId: activity.contact_id,
      type: this.mapKindfulActivityTypeToNexus(activity.activity_type),
      subject: activity.subject,
      description: activity.description,
      date: new Date(activity.activity_date),
      status: activity.completed ? 'completed' : 'scheduled',
      assignedTo: activity.assigned_to,
      source: this.provider,
    };
  }

  private mapInteractionToActivity(interaction: CRMInteraction): Partial<KindfulActivity> {
    return {
      contact_id: interaction.donorExternalId,
      activity_type: this.mapInteractionTypeToKindful(interaction.type),
      subject: interaction.subject,
      description: interaction.description,
      activity_date: interaction.date.toISOString().split('T')[0],
      completed: interaction.status === 'completed',
      assigned_to: interaction.assignedTo,
    };
  }

  private mapKindfulActivityTypeToNexus(
    activityType: KindfulActivity['activity_type']
  ): CRMInteraction['type'] {
    const typeMap: Record<KindfulActivity['activity_type'], CRMInteraction['type']> = {
      email: 'email',
      phone_call: 'call',
      meeting: 'meeting',
      note: 'note',
      task: 'task',
      other: 'other',
    };
    return typeMap[activityType] || 'other';
  }

  private mapInteractionTypeToKindful(
    type: CRMInteraction['type']
  ): KindfulActivity['activity_type'] {
    const typeMap: Record<CRMInteraction['type'], KindfulActivity['activity_type']> = {
      email: 'email',
      call: 'phone_call',
      meeting: 'meeting',
      note: 'note',
      task: 'task',
      other: 'other',
    };
    return typeMap[type] || 'other';
  }
}
