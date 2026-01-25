/**
 * HubSpot CRM Adapter
 *
 * Implements the ICRMAdapter interface for HubSpot CRM integration.
 * Uses HubSpot API v3 for contacts, deals, and engagements.
 */

import { BaseCRMAdapter } from '../base-adapter';
import { refreshOAuthTokens, storeCredentials } from '../oauth';
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
} from '../types';
import {
  CRMAuthError,
  CRMRateLimitError,
  CRMAPIError,
} from '../types';

// ===========================================================================
// HubSpot API Types
// ===========================================================================

interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    company?: string;
    jobtitle?: string;
    hs_lead_status?: string;
    lifecyclestage?: string;
    createdate?: string;
    lastmodifieddate?: string;
    // Custom properties for Nexus
    nexus_id?: string;
    donor_type?: string;
    giving_level?: string;
    total_giving?: string;
    last_donation_date?: string;
    tags?: string;
    intelligence_data?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    pipeline?: string;
    description?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    // Custom properties
    nexus_donation_id?: string;
    payment_method?: string;
    campaign?: string;
    is_recurring?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface HubSpotEngagement {
  id: string;
  properties: {
    hs_timestamp?: string;
    hs_engagement_type?: string;
    hs_activity_type?: string;
    hs_body_preview?: string;
    hs_email_subject?: string;
    hs_meeting_title?: string;
    hs_call_title?: string;
    hs_note_body?: string;
    hs_task_subject?: string;
    hs_task_status?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface HubSpotSearchResult<T> {
  total: number;
  results: T[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

interface HubSpotProperty {
  name: string;
  type: string;
  label: string;
  groupName: string;
}

interface HubSpotErrorResponse {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

// ===========================================================================
// HubSpot Adapter Implementation
// ===========================================================================

export class HubSpotAdapter extends BaseCRMAdapter {
  readonly provider: CRMProvider = 'hubspot';

  private baseUrl: string = 'https://api.hubapi.com';

  // ===========================================================================
  // Initialization
  // ===========================================================================

  protected async onInitialize(config: CRMAdapterConfig): Promise<void> {
    console.log(
      `[HubSpot Adapter] Initialized for org ${config.organizationId}`
    );
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/crm/v3/objects/contacts?limit=1');
      return response !== null;
    } catch (error) {
      console.error('[HubSpot Adapter] Connection test failed:', error);
      return false;
    }
  }

  protected async performTokenRefresh(
    credentials: OAuth2Credentials
  ): Promise<OAuth2Credentials | null> {
    try {
      const newCredentials = await refreshOAuthTokens(
        this.provider,
        credentials.refreshToken
      );
      return newCredentials;
    } catch (error) {
      console.error('[HubSpot Adapter] Token refresh failed:', error);
      return null;
    }
  }

  protected async saveCredentials(credentials: CRMCredentials): Promise<void> {
    await storeCredentials(this._organizationId, this.provider, credentials);
  }

  protected async onDisconnect(): Promise<void> {
    // HubSpot OAuth tokens can be revoked via the access token
    if (this._credentials?.type === 'oauth2') {
      const oauth = this._credentials as OAuth2Credentials;
      try {
        await fetch('https://api.hubapi.com/oauth/v1/refresh-tokens/' + oauth.refreshToken, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn('[HubSpot Adapter] Token revocation failed:', error);
      }
    }
  }

  // ===========================================================================
  // Donor Operations (HubSpot Contacts)
  // ===========================================================================

  async fetchDonors(options?: {
    page?: number;
    pageSize?: number;
    modifiedAfter?: Date;
  }): Promise<{ donors: CRMDonor[]; hasMore: boolean; nextPage?: number }> {
    const pageSize = options?.pageSize || 100;

    const properties = [
      'firstname', 'lastname', 'email', 'phone',
      'address', 'city', 'state', 'zip', 'country',
      'company', 'jobtitle', 'createdate', 'lastmodifieddate',
      'nexus_id', 'donor_type', 'giving_level', 'total_giving',
      'last_donation_date', 'tags', 'intelligence_data',
    ];

    let url = `/crm/v3/objects/contacts?limit=${pageSize}&properties=${properties.join(',')}`;

    if (options?.modifiedAfter) {
      // Use search endpoint for filtering by modified date
      const searchBody = {
        filterGroups: [{
          filters: [{
            propertyName: 'lastmodifieddate',
            operator: 'GTE',
            value: options.modifiedAfter.getTime().toString(),
          }],
        }],
        sorts: [{ propertyName: 'lastmodifieddate', direction: 'DESCENDING' }],
        properties,
        limit: pageSize,
      };

      const result = await this.withRetry(
        () => this.makeRequest<HubSpotSearchResult<HubSpotContact>>(
          '/crm/v3/objects/contacts/search',
          {
            method: 'POST',
            body: JSON.stringify(searchBody),
          }
        ),
        'fetchDonors'
      );

      const donors = result.results.map((contact) => this.mapContactToDonor(contact));

      return {
        donors,
        hasMore: !!result.paging?.next,
        nextPage: result.paging?.next ? (options?.page || 1) + 1 : undefined,
      };
    }

    const result = await this.withRetry(
      () => this.makeRequest<HubSpotSearchResult<HubSpotContact>>(url),
      'fetchDonors'
    );

    const donors = result.results.map((contact) => this.mapContactToDonor(contact));

    return {
      donors,
      hasMore: !!result.paging?.next,
      nextPage: result.paging?.next ? (options?.page || 1) + 1 : undefined,
    };
  }

  async fetchDonor(externalId: string): Promise<CRMDonor | null> {
    try {
      const properties = [
        'firstname', 'lastname', 'email', 'phone',
        'address', 'city', 'state', 'zip', 'country',
        'company', 'jobtitle', 'createdate', 'lastmodifieddate',
        'nexus_id', 'donor_type', 'giving_level', 'total_giving',
        'last_donation_date', 'tags', 'intelligence_data',
      ];

      const contact = await this.makeRequest<HubSpotContact>(
        `/crm/v3/objects/contacts/${externalId}?properties=${properties.join(',')}`
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
    const properties = [
      'firstname', 'lastname', 'email', 'phone',
      'company', 'jobtitle', 'createdate', 'lastmodifieddate',
      'nexus_id', 'donor_type', 'giving_level', 'total_giving',
    ];

    const searchBody = {
      query,
      properties,
      limit,
    };

    const result = await this.withRetry(
      () => this.makeRequest<HubSpotSearchResult<HubSpotContact>>(
        '/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          body: JSON.stringify(searchBody),
        }
      ),
      'searchDonors'
    );

    return result.results.map((contact) => this.mapContactToDonor(contact));
  }

  async createDonor(
    donor: Omit<CRMDonor, 'externalId' | 'source'>
  ): Promise<CRMDonor> {
    const properties = this.mapDonorToContact(donor as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<HubSpotContact>(
        '/crm/v3/objects/contacts',
        {
          method: 'POST',
          body: JSON.stringify({ properties }),
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
    const properties = this.mapDonorToContact(updates as CRMDonor);

    const result = await this.withRetry(
      () => this.makeRequest<HubSpotContact>(
        `/crm/v3/objects/contacts/${externalId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ properties }),
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
  // Donation Operations (HubSpot Deals)
  // ===========================================================================

  async fetchDonations(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<CRMDonation[]> {
    // First get associated deals for this contact
    const associations = await this.makeRequest<{ results: { id: string }[] }>(
      `/crm/v3/objects/contacts/${donorExternalId}/associations/deals`
    );

    if (!associations.results.length) {
      return [];
    }

    const dealIds = associations.results.map((a) => a.id);
    const properties = [
      'dealname', 'amount', 'dealstage', 'closedate', 'pipeline',
      'description', 'createdate', 'hs_lastmodifieddate',
      'nexus_donation_id', 'payment_method', 'campaign', 'is_recurring',
    ];

    // Batch fetch deals
    const result = await this.makeRequest<{ results: HubSpotDeal[] }>(
      '/crm/v3/objects/deals/batch/read',
      {
        method: 'POST',
        body: JSON.stringify({
          inputs: dealIds.map((id) => ({ id })),
          properties,
        }),
      }
    );

    let donations = result.results.map((deal) =>
      this.mapDealToDonation(deal, donorExternalId)
    );

    // Filter by date if specified
    if (options?.startDate) {
      donations = donations.filter((d) => d.date >= options.startDate!);
    }
    if (options?.endDate) {
      donations = donations.filter((d) => d.date <= options.endDate!);
    }

    return donations;
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
    const pageSize = options?.pageSize || 100;
    const properties = [
      'dealname', 'amount', 'dealstage', 'closedate', 'pipeline',
      'description', 'createdate', 'hs_lastmodifieddate',
      'nexus_donation_id', 'payment_method', 'campaign', 'is_recurring',
    ];

    const filters: Array<{ propertyName: string; operator: string; value: string }> = [];

    if (options?.startDate) {
      filters.push({
        propertyName: 'closedate',
        operator: 'GTE',
        value: options.startDate.getTime().toString(),
      });
    }

    if (options?.endDate) {
      filters.push({
        propertyName: 'closedate',
        operator: 'LTE',
        value: options.endDate.getTime().toString(),
      });
    }

    // Only fetch closed won deals
    filters.push({
      propertyName: 'dealstage',
      operator: 'EQ',
      value: 'closedwon',
    });

    const searchBody = {
      filterGroups: filters.length ? [{ filters }] : [],
      sorts: [{ propertyName: 'closedate', direction: 'DESCENDING' }],
      properties,
      limit: pageSize,
    };

    const result = await this.withRetry(
      () => this.makeRequest<HubSpotSearchResult<HubSpotDeal>>(
        '/crm/v3/objects/deals/search',
        {
          method: 'POST',
          body: JSON.stringify(searchBody),
        }
      ),
      'fetchAllDonations'
    );

    const donations = result.results.map((deal) =>
      this.mapDealToDonation(deal, '')
    );

    return {
      donations,
      hasMore: !!result.paging?.next,
      nextPage: result.paging?.next ? (options?.page || 1) + 1 : undefined,
    };
  }

  // ===========================================================================
  // Interaction Operations (HubSpot Engagements)
  // ===========================================================================

  async fetchInteractions(
    donorExternalId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: CRMInteraction['type'];
    }
  ): Promise<CRMInteraction[]> {
    const engagementTypes = ['emails', 'calls', 'meetings', 'notes', 'tasks'];
    const interactions: CRMInteraction[] = [];

    for (const engagementType of engagementTypes) {
      if (options?.type && !this.matchesInteractionType(engagementType, options.type)) {
        continue;
      }

      try {
        const associations = await this.makeRequest<{ results: { id: string }[] }>(
          `/crm/v3/objects/contacts/${donorExternalId}/associations/${engagementType}`
        );

        if (associations.results.length) {
          const result = await this.makeRequest<{ results: HubSpotEngagement[] }>(
            `/crm/v3/objects/${engagementType}/batch/read`,
            {
              method: 'POST',
              body: JSON.stringify({
                inputs: associations.results.map((a) => ({ id: a.id })),
                properties: [
                  'hs_timestamp', 'hs_engagement_type', 'hs_activity_type',
                  'hs_body_preview', 'hs_email_subject', 'hs_meeting_title',
                  'hs_call_title', 'hs_note_body', 'hs_task_subject',
                  'hs_task_status', 'createdate', 'hs_lastmodifieddate',
                ],
              }),
            }
          );

          for (const engagement of result.results) {
            const interaction = this.mapEngagementToInteraction(engagement, donorExternalId, engagementType);

            if (options?.startDate && interaction.date < options.startDate) continue;
            if (options?.endDate && interaction.date > options.endDate) continue;

            interactions.push(interaction);
          }
        }
      } catch (error) {
        console.warn(`[HubSpot Adapter] Failed to fetch ${engagementType}:`, error);
      }
    }

    return interactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async createInteraction(
    interaction: Omit<CRMInteraction, 'externalId' | 'source'>
  ): Promise<CRMInteraction> {
    const objectType = this.mapInteractionTypeToHubSpotObject(interaction.type);
    const properties = this.mapInteractionToEngagement(interaction as CRMInteraction);

    const result = await this.withRetry(
      () => this.makeRequest<HubSpotEngagement>(
        `/crm/v3/objects/${objectType}`,
        {
          method: 'POST',
          body: JSON.stringify({ properties }),
        }
      ),
      'createInteraction'
    );

    // Associate with contact
    await this.makeRequest(
      `/crm/v3/objects/${objectType}/${result.id}/associations/contacts/${interaction.donorExternalId}/engagement_to_contact`,
      { method: 'PUT' }
    );

    await this.logActivity('crm_interaction_created', {
      provider: this.provider,
      recordId: result.id,
      recordType: 'interaction',
    });

    return this.mapEngagementToInteraction(result, interaction.donorExternalId, objectType);
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
          pageSize: 100,
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
          pageSize: 100,
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
    // HubSpot interactions are typically pushed from Nexus
    if (config.direction === 'push' || config.direction === 'bidirectional') {
      // Implementation would push Nexus interactions to HubSpot
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
        return this.mapContactToDonor(crmRecord as HubSpotContact) as T;
      case 'donation':
        return this.mapDealToDonation(crmRecord as HubSpotDeal, '') as T;
      case 'interaction':
        return this.mapEngagementToInteraction(crmRecord as HubSpotEngagement, '', 'notes') as T;
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
        return this.mapDonationToDeal(nexusRecord as CRMDonation) as T;
      case 'interaction':
        return this.mapInteractionToEngagement(nexusRecord as CRMInteraction) as T;
      default:
        throw new Error(`Unknown record type: ${type}`);
    }
  }

  async getCustomFields(): Promise<{ name: string; type: string; label: string }[]> {
    const result = await this.makeRequest<{ results: HubSpotProperty[] }>(
      '/crm/v3/properties/contacts'
    );

    return result.results
      .filter((p) => !p.name.startsWith('hs_'))
      .map((p) => ({
        name: p.name,
        type: p.type,
        label: p.label,
      }));
  }

  // ===========================================================================
  // Private: API Methods
  // ===========================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = this.getAuthHeader();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
      throw new CRMRateLimitError(this.provider, retryMs);
    }

    // Handle auth errors
    if (response.status === 401) {
      throw new CRMAuthError(
        this.provider,
        'Authentication failed. Token may be expired.'
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = (await response.json()) as HubSpotErrorResponse;
      throw new CRMAPIError(this.provider, errorData.message, response.status);
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

  private mapContactToDonor(contact: HubSpotContact): CRMDonor {
    const props = contact.properties;
    return {
      externalId: contact.id,
      nexusId: props.nexus_id,
      name: [props.firstname, props.lastname].filter(Boolean).join(' ') || 'Unknown',
      firstName: props.firstname,
      lastName: props.lastname,
      email: props.email,
      phone: props.phone,
      address: {
        street: props.address,
        city: props.city,
        state: props.state,
        postalCode: props.zip,
        country: props.country,
      },
      company: props.company,
      title: props.jobtitle,
      donorType: props.donor_type as CRMDonor['donorType'],
      givingLevel: props.giving_level,
      totalGiving: props.total_giving ? parseFloat(props.total_giving) : undefined,
      lastDonationDate: props.last_donation_date
        ? new Date(props.last_donation_date)
        : undefined,
      tags: props.tags?.split(';').filter(Boolean),
      customFields: props.intelligence_data
        ? JSON.parse(props.intelligence_data)
        : undefined,
      source: this.provider,
      lastSyncedAt: new Date(),
      createdAt: new Date(contact.createdAt),
      updatedAt: new Date(contact.updatedAt),
    };
  }

  private mapDonorToContact(donor: CRMDonor): Record<string, string | undefined> {
    return {
      firstname: donor.firstName,
      lastname: donor.lastName || donor.name,
      email: donor.email,
      phone: donor.phone,
      address: donor.address?.street,
      city: donor.address?.city,
      state: donor.address?.state,
      zip: donor.address?.postalCode,
      country: donor.address?.country,
      company: donor.company,
      jobtitle: donor.title,
      nexus_id: donor.nexusId,
      donor_type: donor.donorType,
      giving_level: donor.givingLevel,
      total_giving: donor.totalGiving?.toString(),
      last_donation_date: donor.lastDonationDate?.toISOString(),
      tags: donor.tags?.join(';'),
      intelligence_data: donor.customFields
        ? JSON.stringify(donor.customFields)
        : undefined,
    };
  }

  private mapDealToDonation(deal: HubSpotDeal, donorExternalId: string): CRMDonation {
    const props = deal.properties;
    return {
      externalId: deal.id,
      donorExternalId,
      amount: props.amount ? parseFloat(props.amount) : 0,
      currency: 'USD',
      date: props.closedate ? new Date(props.closedate) : new Date(deal.createdAt),
      type: props.is_recurring === 'true' ? 'recurring' : 'one-time',
      paymentMethod: props.payment_method,
      campaign: props.campaign,
      notes: props.description,
      status: props.dealstage === 'closedwon' ? 'completed' : 'pending',
      source: this.provider,
    };
  }

  private mapDonationToDeal(donation: CRMDonation): Record<string, string | undefined> {
    return {
      dealname: `Donation - ${donation.date.toLocaleDateString()}`,
      amount: donation.amount.toString(),
      dealstage: 'closedwon',
      closedate: donation.date.toISOString().split('T')[0],
      description: donation.notes,
      nexus_donation_id: donation.externalId,
      payment_method: donation.paymentMethod,
      campaign: donation.campaign,
      is_recurring: (donation.type === 'recurring').toString(),
    };
  }

  private mapEngagementToInteraction(
    engagement: HubSpotEngagement,
    donorExternalId: string,
    objectType: string
  ): CRMInteraction {
    const props = engagement.properties;

    let subject = '';
    let description = '';

    switch (objectType) {
      case 'emails':
        subject = props.hs_email_subject || 'Email';
        description = props.hs_body_preview;
        break;
      case 'calls':
        subject = props.hs_call_title || 'Call';
        description = props.hs_body_preview;
        break;
      case 'meetings':
        subject = props.hs_meeting_title || 'Meeting';
        description = props.hs_body_preview;
        break;
      case 'notes':
        subject = 'Note';
        description = props.hs_note_body;
        break;
      case 'tasks':
        subject = props.hs_task_subject || 'Task';
        break;
    }

    return {
      externalId: engagement.id,
      donorExternalId,
      type: this.mapHubSpotObjectToInteractionType(objectType),
      subject,
      description,
      date: props.hs_timestamp
        ? new Date(parseInt(props.hs_timestamp))
        : new Date(engagement.createdAt),
      status: props.hs_task_status === 'COMPLETED' ? 'completed' : 'scheduled',
      source: this.provider,
    };
  }

  private mapInteractionToEngagement(
    interaction: CRMInteraction
  ): Record<string, string | undefined> {
    return {
      hs_timestamp: interaction.date.getTime().toString(),
      hs_email_subject: interaction.type === 'email' ? interaction.subject : undefined,
      hs_call_title: interaction.type === 'call' ? interaction.subject : undefined,
      hs_meeting_title: interaction.type === 'meeting' ? interaction.subject : undefined,
      hs_note_body: interaction.type === 'note' ? interaction.description : undefined,
      hs_task_subject: interaction.type === 'task' ? interaction.subject : undefined,
      hs_body_preview: interaction.description,
    };
  }

  private mapInteractionTypeToHubSpotObject(type: CRMInteraction['type']): string {
    const typeMap: Record<CRMInteraction['type'], string> = {
      email: 'emails',
      call: 'calls',
      meeting: 'meetings',
      note: 'notes',
      task: 'tasks',
      other: 'notes',
    };
    return typeMap[type];
  }

  private mapHubSpotObjectToInteractionType(objectType: string): CRMInteraction['type'] {
    const typeMap: Record<string, CRMInteraction['type']> = {
      emails: 'email',
      calls: 'call',
      meetings: 'meeting',
      notes: 'note',
      tasks: 'task',
    };
    return typeMap[objectType] || 'other';
  }

  private matchesInteractionType(objectType: string, type: CRMInteraction['type']): boolean {
    return this.mapHubSpotObjectToInteractionType(objectType) === type;
  }
}
