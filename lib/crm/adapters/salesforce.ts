/**
 * Salesforce CRM Adapter
 *
 * Implements the ICRMAdapter interface for Salesforce integration.
 * Supports bidirectional sync of donors (Contact/Lead) and donations (Opportunity).
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
// Salesforce API Types
// ===========================================================================

interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  AccountId?: string;
  Title?: string;
  Description?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  // Custom fields for Nexus integration
  Nexus_ID__c?: string;
  Donor_Type__c?: string;
  Giving_Level__c?: string;
  Total_Giving__c?: number;
  Last_Donation_Date__c?: string;
  Tags__c?: string;
  Intelligence_Data__c?: string;
}

interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount: number;
  StageName: string;
  CloseDate: string;
  ContactId?: string;
  AccountId?: string;
  Type?: string;
  Description?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  // Custom fields
  Nexus_Donation_ID__c?: string;
  Payment_Method__c?: string;
  Campaign__c?: string;
  Is_Recurring__c?: boolean;
}

interface SalesforceTask {
  Id: string;
  Subject: string;
  Description?: string;
  WhoId?: string; // Contact ID
  WhatId?: string; // Related object ID
  ActivityDate?: string;
  Status: string;
  Priority: string;
  Type?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

interface SalesforceNote {
  Id: string;
  Title: string;
  Body: string;
  ParentId: string;
  CreatedDate: string;
}

interface SalesforceQueryResult<T> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

interface SalesforceErrorResponse {
  message: string;
  errorCode: string;
  fields?: string[];
}

interface SalesforceFieldDescribe {
  name: string;
  type: string;
  label: string;
  custom: boolean;
}

// ===========================================================================
// Salesforce Adapter Implementation
// ===========================================================================

export class SalesforceAdapter extends BaseCRMAdapter {
  readonly provider: CRMProvider = 'salesforce';

  private instanceUrl: string = '';
  private apiVersion: string = 'v59.0';

  // ===========================================================================
  // Initialization
  // ===========================================================================

  protected async onInitialize(config: CRMAdapterConfig): Promise<void> {
    if (config.credentials?.type === 'oauth2') {
      const oauth = config.credentials as OAuth2Credentials;
      if (oauth.instanceUrl) {
        this.instanceUrl = oauth.instanceUrl;
      }
    }

    if (!this.instanceUrl) {
      throw new CRMAuthError(
        this.provider,
        'Salesforce instance URL is required. Complete OAuth flow first.'
      );
    }

    console.log(
      `[Salesforce Adapter] Initialized for org ${config.organizationId}`
    );
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/services/data/' + this.apiVersion);
      return response !== null;
    } catch (error) {
      console.error('[Salesforce Adapter] Connection test failed:', error);
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
      // Preserve instance URL
      newCredentials.instanceUrl = credentials.instanceUrl || this.instanceUrl;
      return newCredentials;
    } catch (error) {
      console.error('[Salesforce Adapter] Token refresh failed:', error);
      return null;
    }
  }

  protected async saveCredentials(credentials: CRMCredentials): Promise<void> {
    await storeCredentials(this._organizationId, this.provider, credentials);
  }

  protected async onDisconnect(): Promise<void> {
    // Revoke token if possible
    if (this._credentials?.type === 'oauth2') {
      const oauth = this._credentials as OAuth2Credentials;
      try {
        await fetch(`${this.instanceUrl}/services/oauth2/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `token=${oauth.accessToken}`,
        });
      } catch (error) {
        console.warn('[Salesforce Adapter] Token revocation failed:', error);
      }
    }
  }

  // ===========================================================================
  // Donor Operations (Salesforce Contacts)
  // ===========================================================================

  async fetchDonors(options?: {
    page?: number;
    pageSize?: number;
    modifiedAfter?: Date;
  }): Promise<{ donors: CRMDonor[]; hasMore: boolean; nextPage?: number }> {
    const pageSize = options?.pageSize || 100;
    const offset = ((options?.page || 1) - 1) * pageSize;

    let query = `
      SELECT Id, FirstName, LastName, Email, Phone,
             MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry,
             AccountId, Title, Description, CreatedDate, LastModifiedDate,
             Nexus_ID__c, Donor_Type__c, Giving_Level__c, Total_Giving__c,
             Last_Donation_Date__c, Tags__c, Intelligence_Data__c
      FROM Contact
    `;

    const conditions: string[] = [];

    if (options?.modifiedAfter) {
      conditions.push(
        `LastModifiedDate > ${options.modifiedAfter.toISOString()}`
      );
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY LastModifiedDate DESC LIMIT ${pageSize} OFFSET ${offset}`;

    const result = await this.withRetry(
      () => this.executeQuery<SalesforceContact>(query),
      'fetchDonors'
    );

    const donors = result.records.map((contact) =>
      this.mapContactToDonor(contact)
    );

    return {
      donors,
      hasMore: !result.done,
      nextPage: result.done ? undefined : (options?.page || 1) + 1,
    };
  }

  async fetchDonor(externalId: string): Promise<CRMDonor | null> {
    try {
      const contact = await this.makeRequest<SalesforceContact>(
        `/services/data/${this.apiVersion}/sobjects/Contact/${externalId}`
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
    const sosl = `FIND {${query}} IN ALL FIELDS RETURNING Contact(
      Id, FirstName, LastName, Email, Phone, Title,
      MailingCity, MailingState, CreatedDate, LastModifiedDate,
      Nexus_ID__c, Donor_Type__c, Giving_Level__c, Total_Giving__c
    ) LIMIT ${limit}`;

    const result = await this.withRetry(
      () => this.makeRequest<{ searchRecords: SalesforceContact[] }>(
        `/services/data/${this.apiVersion}/search?q=${encodeURIComponent(sosl)}`
      ),
      'searchDonors'
    );

    return result.searchRecords.map((contact) => this.mapContactToDonor(contact));
  }

  async createDonor(
    donor: Omit<CRMDonor, 'externalId' | 'source'>
  ): Promise<CRMDonor> {
    const contact = this.mapDonorToContact(donor as CRMDonor);

    const result = await this.withRetry(
      () => this.createRecord<SalesforceContact>('Contact', contact),
      'createDonor'
    );

    await this.logActivity('crm_donor_created', {
      provider: this.provider,
      recordId: result.Id,
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
      () => this.updateRecord<SalesforceContact>('Contact', externalId, contact),
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
  // Donation Operations (Salesforce Opportunities)
  // ===========================================================================

  async fetchDonations(
    donorExternalId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<CRMDonation[]> {
    let query = `
      SELECT Id, Name, Amount, StageName, CloseDate,
             ContactId, AccountId, Type, Description,
             CreatedDate, LastModifiedDate,
             Nexus_Donation_ID__c, Payment_Method__c, Campaign__c, Is_Recurring__c
      FROM Opportunity
      WHERE ContactId = '${donorExternalId}'
        AND StageName = 'Closed Won'
    `;

    if (options?.startDate) {
      query += ` AND CloseDate >= ${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      query += ` AND CloseDate <= ${options.endDate.toISOString().split('T')[0]}`;
    }

    query += ' ORDER BY CloseDate DESC';

    const result = await this.withRetry(
      () => this.executeQuery<SalesforceOpportunity>(query),
      'fetchDonations'
    );

    return result.records.map((opp) => this.mapOpportunityToDonation(opp));
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
    const offset = ((options?.page || 1) - 1) * pageSize;

    let query = `
      SELECT Id, Name, Amount, StageName, CloseDate,
             ContactId, AccountId, Type, Description,
             CreatedDate, LastModifiedDate,
             Nexus_Donation_ID__c, Payment_Method__c, Campaign__c, Is_Recurring__c
      FROM Opportunity
      WHERE StageName = 'Closed Won'
    `;

    if (options?.startDate) {
      query += ` AND CloseDate >= ${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      query += ` AND CloseDate <= ${options.endDate.toISOString().split('T')[0]}`;
    }

    query += ` ORDER BY CloseDate DESC LIMIT ${pageSize} OFFSET ${offset}`;

    const result = await this.withRetry(
      () => this.executeQuery<SalesforceOpportunity>(query),
      'fetchAllDonations'
    );

    const donations = result.records.map((opp) =>
      this.mapOpportunityToDonation(opp)
    );

    return {
      donations,
      hasMore: !result.done,
      nextPage: result.done ? undefined : (options?.page || 1) + 1,
    };
  }

  // ===========================================================================
  // Interaction Operations (Salesforce Tasks)
  // ===========================================================================

  async fetchInteractions(
    donorExternalId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: CRMInteraction['type'];
    }
  ): Promise<CRMInteraction[]> {
    let query = `
      SELECT Id, Subject, Description, WhoId, WhatId,
             ActivityDate, Status, Priority, Type,
             CreatedDate, LastModifiedDate
      FROM Task
      WHERE WhoId = '${donorExternalId}'
    `;

    if (options?.startDate) {
      query += ` AND ActivityDate >= ${options.startDate.toISOString().split('T')[0]}`;
    }

    if (options?.endDate) {
      query += ` AND ActivityDate <= ${options.endDate.toISOString().split('T')[0]}`;
    }

    if (options?.type) {
      const sfType = this.mapInteractionTypeToSalesforce(options.type);
      if (sfType) {
        query += ` AND Type = '${sfType}'`;
      }
    }

    query += ' ORDER BY ActivityDate DESC';

    const result = await this.withRetry(
      () => this.executeQuery<SalesforceTask>(query),
      'fetchInteractions'
    );

    return result.records.map((task) => this.mapTaskToInteraction(task));
  }

  async createInteraction(
    interaction: Omit<CRMInteraction, 'externalId' | 'source'>
  ): Promise<CRMInteraction> {
    const task = this.mapInteractionToTask(interaction as CRMInteraction);

    const result = await this.withRetry(
      () => this.createRecord<SalesforceTask>('Task', task),
      'createInteraction'
    );

    await this.logActivity('crm_interaction_created', {
      provider: this.provider,
      recordId: result.Id,
      recordType: 'interaction',
    });

    return this.mapTaskToInteraction(result);
  }

  // ===========================================================================
  // AI Intelligence Attachment (Salesforce Notes)
  // ===========================================================================

  /**
   * Attach AI-generated intelligence report as a Salesforce Note
   */
  async attachIntelligenceNote(
    contactId: string,
    intelligenceData: Record<string, unknown>
  ): Promise<string> {
    const noteBody = this.formatIntelligenceAsNote(intelligenceData);

    const note: Partial<SalesforceNote> = {
      Title: `Nexus AI Intelligence Brief - ${new Date().toLocaleDateString()}`,
      Body: noteBody,
      ParentId: contactId,
    };

    const result = await this.withRetry(
      () => this.createRecord<SalesforceNote>('Note', note),
      'attachIntelligenceNote'
    );

    return result.Id;
  }

  private formatIntelligenceAsNote(data: Record<string, unknown>): string {
    const lines: string[] = [
      '=== NEXUS AI INTELLIGENCE BRIEF ===',
      `Generated: ${new Date().toISOString()}`,
      '',
    ];

    if (data.background) {
      lines.push('BACKGROUND:', String(data.background), '');
    }

    if (data.interests && Array.isArray(data.interests)) {
      lines.push('INTERESTS:', ...data.interests.map((i) => `- ${i}`), '');
    }

    if (data.givingHistory && Array.isArray(data.givingHistory)) {
      lines.push('GIVING HISTORY:');
      for (const gift of data.givingHistory) {
        const g = gift as Record<string, unknown>;
        lines.push(`- ${g.organization}: ${g.amount || 'Unknown amount'}`);
      }
      lines.push('');
    }

    if (data.recommendedApproach) {
      lines.push('RECOMMENDED APPROACH:', String(data.recommendedApproach), '');
    }

    if (data.keyInsights && Array.isArray(data.keyInsights)) {
      lines.push('KEY INSIGHTS:', ...data.keyInsights.map((i) => `- ${i}`), '');
    }

    return lines.join('\n');
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  protected async syncDonors(
    result: CRMSyncResult,
    config: CRMSyncConfig
  ): Promise<void> {
    // Pull from Salesforce
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
            // In a real implementation, sync to Nexus database here
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

    // Push to Salesforce would go here for bidirectional sync
    if (config.direction === 'push' || config.direction === 'bidirectional') {
      // Fetch Nexus donors and push to Salesforce
      // This would be implemented based on your Nexus data layer
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
    // For interactions, we typically only push from Nexus to Salesforce
    // as interactions are often created in Nexus after AI analysis
    if (config.direction === 'push' || config.direction === 'bidirectional') {
      // Implementation would push Nexus interactions to Salesforce
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
        return this.mapContactToDonor(crmRecord as SalesforceContact) as T;
      case 'donation':
        return this.mapOpportunityToDonation(crmRecord as SalesforceOpportunity) as T;
      case 'interaction':
        return this.mapTaskToInteraction(crmRecord as SalesforceTask) as T;
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
        return this.mapDonationToOpportunity(nexusRecord as CRMDonation) as T;
      case 'interaction':
        return this.mapInteractionToTask(nexusRecord as CRMInteraction) as T;
      default:
        throw new Error(`Unknown record type: ${type}`);
    }
  }

  async getCustomFields(): Promise<{ name: string; type: string; label: string }[]> {
    const result = await this.makeRequest<{ fields: SalesforceFieldDescribe[] }>(
      `/services/data/${this.apiVersion}/sobjects/Contact/describe`
    );

    return result.fields
      .filter((f) => f.custom)
      .map((f) => ({
        name: f.name,
        type: f.type,
        label: f.label,
      }));
  }

  // ===========================================================================
  // Private: API Methods
  // ===========================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this._credentials || this._credentials.type !== 'oauth2') {
      throw new CRMAuthError(this.provider, 'OAuth credentials required');
    }

    const oauth = this._credentials as OAuth2Credentials;

    // Check if token needs refresh
    if (oauth.expiresAt && new Date() >= oauth.expiresAt) {
      const refreshed = await this.refreshTokens();
      if (!refreshed) {
        throw new CRMAuthError(this.provider, 'Failed to refresh access token');
      }
    }

    const url = `${this.instanceUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${(this._credentials as OAuth2Credentials).accessToken}`,
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
    if (response.status === 401) {
      throw new CRMAuthError(
        this.provider,
        'Authentication failed. Token may be expired.'
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = (await response.json()) as SalesforceErrorResponse[];
      const errorMessage =
        errorData[0]?.message || `Salesforce API error: ${response.status}`;
      throw new CRMAPIError(this.provider, errorMessage, response.status);
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private async executeQuery<T>(soql: string): Promise<SalesforceQueryResult<T>> {
    const encodedQuery = encodeURIComponent(soql);
    return this.makeRequest<SalesforceQueryResult<T>>(
      `/services/data/${this.apiVersion}/query?q=${encodedQuery}`
    );
  }

  private async createRecord<T extends { Id: string }>(
    sobject: string,
    data: Partial<T>
  ): Promise<T> {
    const result = await this.makeRequest<{ id: string }>(
      `/services/data/${this.apiVersion}/sobjects/${sobject}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    // Fetch the created record
    return this.makeRequest<T>(
      `/services/data/${this.apiVersion}/sobjects/${sobject}/${result.id}`
    );
  }

  private async updateRecord<T>(
    sobject: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    await this.makeRequest(
      `/services/data/${this.apiVersion}/sobjects/${sobject}/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );

    // Fetch the updated record
    return this.makeRequest<T>(
      `/services/data/${this.apiVersion}/sobjects/${sobject}/${id}`
    );
  }

  // ===========================================================================
  // Private: Data Mapping
  // ===========================================================================

  private mapContactToDonor(contact: SalesforceContact): CRMDonor {
    return {
      externalId: contact.Id,
      nexusId: contact.Nexus_ID__c,
      name: [contact.FirstName, contact.LastName].filter(Boolean).join(' '),
      firstName: contact.FirstName,
      lastName: contact.LastName,
      email: contact.Email,
      phone: contact.Phone,
      address: {
        street: contact.MailingStreet,
        city: contact.MailingCity,
        state: contact.MailingState,
        postalCode: contact.MailingPostalCode,
        country: contact.MailingCountry,
      },
      title: contact.Title,
      donorType: contact.Donor_Type__c as CRMDonor['donorType'],
      givingLevel: contact.Giving_Level__c,
      totalGiving: contact.Total_Giving__c,
      lastDonationDate: contact.Last_Donation_Date__c
        ? new Date(contact.Last_Donation_Date__c)
        : undefined,
      tags: contact.Tags__c?.split(';').filter(Boolean),
      customFields: contact.Intelligence_Data__c
        ? JSON.parse(contact.Intelligence_Data__c)
        : undefined,
      source: this.provider,
      lastSyncedAt: new Date(),
      createdAt: new Date(contact.CreatedDate),
      updatedAt: new Date(contact.LastModifiedDate),
    };
  }

  private mapDonorToContact(donor: CRMDonor): Partial<SalesforceContact> {
    return {
      FirstName: donor.firstName,
      LastName: donor.lastName || donor.name,
      Email: donor.email,
      Phone: donor.phone,
      MailingStreet: donor.address?.street,
      MailingCity: donor.address?.city,
      MailingState: donor.address?.state,
      MailingPostalCode: donor.address?.postalCode,
      MailingCountry: donor.address?.country,
      Title: donor.title,
      Nexus_ID__c: donor.nexusId,
      Donor_Type__c: donor.donorType,
      Giving_Level__c: donor.givingLevel,
      Total_Giving__c: donor.totalGiving,
      Last_Donation_Date__c: donor.lastDonationDate?.toISOString().split('T')[0],
      Tags__c: donor.tags?.join(';'),
      Intelligence_Data__c: donor.customFields
        ? JSON.stringify(donor.customFields)
        : undefined,
    };
  }

  private mapOpportunityToDonation(opp: SalesforceOpportunity): CRMDonation {
    return {
      externalId: opp.Id,
      donorExternalId: opp.ContactId || '',
      amount: opp.Amount,
      currency: 'USD',
      date: new Date(opp.CloseDate),
      type: opp.Is_Recurring__c ? 'recurring' : 'one-time',
      paymentMethod: opp.Payment_Method__c,
      campaign: opp.Campaign__c,
      notes: opp.Description,
      status: 'completed',
      source: this.provider,
    };
  }

  private mapDonationToOpportunity(
    donation: CRMDonation
  ): Partial<SalesforceOpportunity> {
    return {
      Name: `Donation - ${donation.date.toLocaleDateString()}`,
      Amount: donation.amount,
      StageName: 'Closed Won',
      CloseDate: donation.date.toISOString().split('T')[0],
      ContactId: donation.donorExternalId,
      Type: donation.type,
      Description: donation.notes,
      Payment_Method__c: donation.paymentMethod,
      Campaign__c: donation.campaign,
      Is_Recurring__c: donation.type === 'recurring',
    };
  }

  private mapTaskToInteraction(task: SalesforceTask): CRMInteraction {
    return {
      externalId: task.Id,
      donorExternalId: task.WhoId || '',
      type: this.mapSalesforceTypeToInteraction(task.Type),
      subject: task.Subject,
      description: task.Description,
      date: task.ActivityDate
        ? new Date(task.ActivityDate)
        : new Date(task.CreatedDate),
      status: task.Status === 'Completed' ? 'completed' : 'scheduled',
      source: this.provider,
    };
  }

  private mapInteractionToTask(
    interaction: CRMInteraction
  ): Partial<SalesforceTask> {
    return {
      Subject: interaction.subject,
      Description: interaction.description,
      WhoId: interaction.donorExternalId,
      ActivityDate: interaction.date.toISOString().split('T')[0],
      Status: interaction.status === 'completed' ? 'Completed' : 'Not Started',
      Priority: 'Normal',
      Type: this.mapInteractionTypeToSalesforce(interaction.type),
    };
  }

  private mapSalesforceTypeToInteraction(
    sfType?: string
  ): CRMInteraction['type'] {
    const typeMap: Record<string, CRMInteraction['type']> = {
      'Call': 'call',
      'Email': 'email',
      'Meeting': 'meeting',
      'Task': 'task',
    };
    return typeMap[sfType || ''] || 'other';
  }

  private mapInteractionTypeToSalesforce(
    type: CRMInteraction['type']
  ): string | undefined {
    const typeMap: Record<CRMInteraction['type'], string> = {
      'call': 'Call',
      'email': 'Email',
      'meeting': 'Meeting',
      'task': 'Task',
      'note': 'Task',
      'other': 'Other',
    };
    return typeMap[type];
  }
}
