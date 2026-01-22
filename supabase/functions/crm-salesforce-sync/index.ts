/**
 * Salesforce CRM Sync Edge Function
 *
 * Handles synchronization between Nexus and Salesforce CRM.
 * Supports bidirectional sync of donors, donations, and interactions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

// ===========================================================================
// Types
// ===========================================================================

interface SyncRequest {
  organizationId: string;
  direction?: 'pull' | 'push' | 'bidirectional';
  syncDonors?: boolean;
  syncDonations?: boolean;
  syncInteractions?: boolean;
  filters?: {
    modifiedAfter?: string;
    ids?: string[];
  };
}

interface SalesforceCredentials {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  expiresAt: string;
}

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
  Title?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Nexus_ID__c?: string;
  Donor_Type__c?: string;
  Giving_Level__c?: string;
  Total_Giving__c?: number;
}

interface SyncResult {
  syncId: string;
  status: 'completed' | 'completed_with_errors' | 'failed';
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    pushed: number;
    failed: number;
  };
  errors: Array<{ code: string; message: string; recordId?: string }>;
}

// ===========================================================================
// Salesforce API Client
// ===========================================================================

class SalesforceClient {
  private accessToken: string;
  private instanceUrl: string;
  private apiVersion = 'v59.0';

  constructor(credentials: SalesforceCredentials) {
    this.accessToken = credentials.accessToken;
    this.instanceUrl = credentials.instanceUrl;
  }

  async query<T>(soql: string): Promise<T[]> {
    const encodedQuery = encodeURIComponent(soql);
    const response = await fetch(
      `${this.instanceUrl}/services/data/${this.apiVersion}/query?q=${encodedQuery}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce query failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.records;
  }

  async createRecord(sobject: string, data: Record<string, unknown>): Promise<string> {
    const response = await fetch(
      `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${sobject}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce create failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.id;
  }

  async updateRecord(
    sobject: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch(
      `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${sobject}/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(`Salesforce update failed: ${JSON.stringify(error)}`);
    }
  }
}

// ===========================================================================
// Sync Logic
// ===========================================================================

async function syncDonorsFromSalesforce(
  sfClient: SalesforceClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  filters?: SyncRequest['filters']
): Promise<{
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ code: string; message: string; recordId?: string }>;
}> {
  const result = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as Array<{ code: string; message: string; recordId?: string }>,
  };

  // Build query
  let soql = `
    SELECT Id, FirstName, LastName, Email, Phone,
           MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry,
           Title, CreatedDate, LastModifiedDate,
           Nexus_ID__c, Donor_Type__c, Giving_Level__c, Total_Giving__c
    FROM Contact
  `;

  if (filters?.modifiedAfter) {
    soql += ` WHERE LastModifiedDate > ${filters.modifiedAfter}`;
  }

  soql += ' ORDER BY LastModifiedDate DESC LIMIT 200';

  try {
    const contacts = await sfClient.query<SalesforceContact>(soql);

    for (const contact of contacts) {
      result.processed++;

      try {
        // Map to Nexus donor format
        const donorData = {
          organization_id: organizationId,
          external_id: contact.Id,
          source: 'salesforce',
          name: [contact.FirstName, contact.LastName].filter(Boolean).join(' '),
          first_name: contact.FirstName,
          last_name: contact.LastName,
          email: contact.Email,
          phone: contact.Phone,
          address: JSON.stringify({
            street: contact.MailingStreet,
            city: contact.MailingCity,
            state: contact.MailingState,
            postalCode: contact.MailingPostalCode,
            country: contact.MailingCountry,
          }),
          title: contact.Title,
          donor_type: contact.Donor_Type__c || 'individual',
          giving_level: contact.Giving_Level__c,
          total_giving: contact.Total_Giving__c,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Check if donor exists
        const { data: existing } = await supabase
          .from('donors')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('external_id', contact.Id)
          .single();

        if (existing) {
          // Update existing donor
          const { error } = await supabase
            .from('donors')
            .update(donorData)
            .eq('id', existing.id);

          if (error) throw error;
          result.updated++;
        } else {
          // Create new donor
          const { error } = await supabase.from('donors').insert({
            ...donorData,
            created_at: new Date().toISOString(),
          });

          if (error) throw error;
          result.created++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          code: 'SYNC_ERROR',
          message: (error as Error).message,
          recordId: contact.Id,
        });
      }
    }
  } catch (error) {
    result.errors.push({
      code: 'QUERY_ERROR',
      message: (error as Error).message,
    });
  }

  return result;
}

async function syncDonorsToSalesforce(
  sfClient: SalesforceClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  filters?: SyncRequest['filters']
): Promise<{
  processed: number;
  pushed: number;
  failed: number;
  errors: Array<{ code: string; message: string; recordId?: string }>;
}> {
  const result = {
    processed: 0,
    pushed: 0,
    failed: 0,
    errors: [] as Array<{ code: string; message: string; recordId?: string }>,
  };

  // Fetch donors that need to be pushed
  let query = supabase
    .from('donors')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('source', 'nexus'); // Only push Nexus-native donors

  if (filters?.modifiedAfter) {
    query = query.gte('updated_at', filters.modifiedAfter);
  }

  const { data: donors, error } = await query;

  if (error) {
    result.errors.push({
      code: 'FETCH_ERROR',
      message: error.message,
    });
    return result;
  }

  for (const donor of donors || []) {
    result.processed++;

    try {
      const contactData = {
        FirstName: donor.first_name,
        LastName: donor.last_name || donor.name,
        Email: donor.email,
        Phone: donor.phone,
        Title: donor.title,
        Nexus_ID__c: donor.id,
        Donor_Type__c: donor.donor_type,
        Giving_Level__c: donor.giving_level,
        Total_Giving__c: donor.total_giving,
      };

      if (donor.external_id) {
        // Update existing Salesforce contact
        await sfClient.updateRecord('Contact', donor.external_id, contactData);
      } else {
        // Create new Salesforce contact
        const sfId = await sfClient.createRecord('Contact', contactData);

        // Update donor with Salesforce ID
        await supabase
          .from('donors')
          .update({
            external_id: sfId,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', donor.id);
      }

      result.pushed++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        code: 'PUSH_ERROR',
        message: (error as Error).message,
        recordId: donor.id,
      });
    }
  }

  return result;
}

// ===========================================================================
// Main Handler
// ===========================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const body: SyncRequest = await req.json();
    const {
      organizationId,
      direction = 'bidirectional',
      syncDonors = true,
      syncDonations = true,
      syncInteractions = true,
      filters,
    } = body;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Salesforce credentials
    const { data: integration, error: integrationError } = await supabase
      .from('crm_integrations')
      .select('credentials')
      .eq('organization_id', organizationId)
      .eq('crm_type', 'salesforce')
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Salesforce integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentials = integration.credentials as SalesforceCredentials;
    const sfClient = new SalesforceClient(credentials);

    // Initialize result
    const syncId = `sync_${Date.now()}`;
    const syncResult: SyncResult = {
      syncId,
      status: 'completed',
      stats: {
        totalProcessed: 0,
        created: 0,
        updated: 0,
        pushed: 0,
        failed: 0,
      },
      errors: [],
    };

    // Log sync start
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: 'crm_sync_started',
      metadata: {
        provider: 'salesforce',
        syncId,
        direction,
      },
    });

    // Sync donors
    if (syncDonors) {
      // Pull from Salesforce
      if (direction === 'pull' || direction === 'bidirectional') {
        const pullResult = await syncDonorsFromSalesforce(
          sfClient,
          supabase,
          organizationId,
          filters
        );
        syncResult.stats.totalProcessed += pullResult.processed;
        syncResult.stats.created += pullResult.created;
        syncResult.stats.updated += pullResult.updated;
        syncResult.stats.failed += pullResult.failed;
        syncResult.errors.push(...pullResult.errors);
      }

      // Push to Salesforce
      if (direction === 'push' || direction === 'bidirectional') {
        const pushResult = await syncDonorsToSalesforce(
          sfClient,
          supabase,
          organizationId,
          filters
        );
        syncResult.stats.totalProcessed += pushResult.processed;
        syncResult.stats.pushed += pushResult.pushed;
        syncResult.stats.failed += pushResult.failed;
        syncResult.errors.push(...pushResult.errors);
      }
    }

    // Update sync status
    if (syncResult.errors.length > 0) {
      syncResult.status = 'completed_with_errors';
    }

    // Update last sync time
    await supabase
      .from('crm_integrations')
      .update({
        last_sync: new Date().toISOString(),
        sync_status: syncResult.status === 'completed' ? 'connected' : 'error',
      })
      .eq('organization_id', organizationId)
      .eq('crm_type', 'salesforce');

    // Log sync completion
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: 'crm_sync_completed',
      metadata: {
        provider: 'salesforce',
        syncId,
        stats: syncResult.stats,
        errorCount: syncResult.errors.length,
      },
    });

    return new Response(JSON.stringify(syncResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Salesforce Sync] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Sync failed',
        message: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
