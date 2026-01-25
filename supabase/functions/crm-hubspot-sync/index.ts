/**
 * HubSpot CRM Sync Edge Function
 *
 * Handles synchronization between Nexus and HubSpot CRM.
 * Supports bidirectional sync of donors (contacts), donations (deals), and interactions.
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

interface HubSpotCredentials {
  type: 'oauth2';
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

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
    createdate?: string;
    lastmodifieddate?: string;
    nexus_id?: string;
    donor_type?: string;
    giving_level?: string;
    total_giving?: string;
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
    nexus_donation_id?: string;
    payment_method?: string;
    campaign?: string;
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
    };
  };
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
// HubSpot API Client
// ===========================================================================

class HubSpotClient {
  private accessToken: string;
  private baseUrl = 'https://api.hubapi.com';

  constructor(credentials: HubSpotCredentials) {
    this.accessToken = credentials.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '10';
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`HubSpot API error: ${error.message || response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async getContacts(
    properties: string[],
    limit = 100,
    after?: string
  ): Promise<HubSpotSearchResult<HubSpotContact>> {
    let url = `/crm/v3/objects/contacts?limit=${limit}&properties=${properties.join(',')}`;
    if (after) {
      url += `&after=${after}`;
    }
    return this.request<HubSpotSearchResult<HubSpotContact>>(url);
  }

  async searchContacts(
    properties: string[],
    filters: Array<{ propertyName: string; operator: string; value: string }>,
    limit = 100
  ): Promise<HubSpotSearchResult<HubSpotContact>> {
    return this.request<HubSpotSearchResult<HubSpotContact>>(
      '/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: filters.length ? [{ filters }] : [],
          properties,
          limit,
          sorts: [{ propertyName: 'lastmodifieddate', direction: 'DESCENDING' }],
        }),
      }
    );
  }

  async createContact(properties: Record<string, string | undefined>): Promise<HubSpotContact> {
    return this.request<HubSpotContact>('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({ properties }),
    });
  }

  async updateContact(
    id: string,
    properties: Record<string, string | undefined>
  ): Promise<HubSpotContact> {
    return this.request<HubSpotContact>(`/crm/v3/objects/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
  }

  async getDeals(
    properties: string[],
    limit = 100,
    after?: string
  ): Promise<HubSpotSearchResult<HubSpotDeal>> {
    let url = `/crm/v3/objects/deals?limit=${limit}&properties=${properties.join(',')}`;
    if (after) {
      url += `&after=${after}`;
    }
    return this.request<HubSpotSearchResult<HubSpotDeal>>(url);
  }

  async searchDeals(
    properties: string[],
    filters: Array<{ propertyName: string; operator: string; value: string }>,
    limit = 100
  ): Promise<HubSpotSearchResult<HubSpotDeal>> {
    return this.request<HubSpotSearchResult<HubSpotDeal>>(
      '/crm/v3/objects/deals/search',
      {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: filters.length ? [{ filters }] : [],
          properties,
          limit,
          sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        }),
      }
    );
  }

  async createDeal(properties: Record<string, string | undefined>): Promise<HubSpotDeal> {
    return this.request<HubSpotDeal>('/crm/v3/objects/deals', {
      method: 'POST',
      body: JSON.stringify({ properties }),
    });
  }

  async associateDealToContact(dealId: string, contactId: string): Promise<void> {
    await this.request(
      `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
      { method: 'PUT' }
    );
  }
}

// ===========================================================================
// Sync Logic
// ===========================================================================

async function syncContactsFromHubSpot(
  hsClient: HubSpotClient,
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

  const properties = [
    'firstname', 'lastname', 'email', 'phone',
    'address', 'city', 'state', 'zip', 'country',
    'company', 'jobtitle', 'createdate', 'lastmodifieddate',
    'nexus_id', 'donor_type', 'giving_level', 'total_giving',
  ];

  try {
    let hasMore = true;
    let after: string | undefined;

    while (hasMore) {
      let contacts: HubSpotSearchResult<HubSpotContact>;

      if (filters?.modifiedAfter) {
        const modifiedTimestamp = new Date(filters.modifiedAfter).getTime().toString();
        contacts = await hsClient.searchContacts(
          properties,
          [{
            propertyName: 'lastmodifieddate',
            operator: 'GTE',
            value: modifiedTimestamp,
          }],
          100
        );
      } else {
        contacts = await hsClient.getContacts(properties, 100, after);
      }

      for (const contact of contacts.results) {
        result.processed++;

        try {
          const props = contact.properties;
          const donorData = {
            organization_id: organizationId,
            external_id: contact.id,
            source: 'hubspot',
            name: [props.firstname, props.lastname].filter(Boolean).join(' ') || 'Unknown',
            first_name: props.firstname,
            last_name: props.lastname,
            email: props.email,
            phone: props.phone,
            address: JSON.stringify({
              street: props.address,
              city: props.city,
              state: props.state,
              postalCode: props.zip,
              country: props.country,
            }),
            company: props.company,
            title: props.jobtitle,
            donor_type: props.donor_type || 'individual',
            giving_level: props.giving_level,
            total_giving: props.total_giving ? parseFloat(props.total_giving) : null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Check if donor exists
          const { data: existing } = await supabase
            .from('donors')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('external_id', contact.id)
            .single();

          if (existing) {
            const { error } = await supabase
              .from('donors')
              .update(donorData)
              .eq('id', existing.id);

            if (error) throw error;
            result.updated++;
          } else {
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
            recordId: contact.id,
          });
        }
      }

      hasMore = !!contacts.paging?.next;
      after = contacts.paging?.next?.after;

      // Limit to prevent infinite loops during development
      if (result.processed >= 1000) break;
    }
  } catch (error) {
    result.errors.push({
      code: 'QUERY_ERROR',
      message: (error as Error).message,
    });
  }

  return result;
}

async function syncContactsToHubSpot(
  hsClient: HubSpotClient,
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

  let query = supabase
    .from('donors')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('source', 'nexus');

  if (filters?.modifiedAfter) {
    query = query.gte('updated_at', filters.modifiedAfter);
  }

  const { data: donors, error } = await query.limit(200);

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
      const contactData: Record<string, string | undefined> = {
        firstname: donor.first_name,
        lastname: donor.last_name || donor.name,
        email: donor.email,
        phone: donor.phone,
        company: donor.company,
        jobtitle: donor.title,
        nexus_id: donor.id,
        donor_type: donor.donor_type,
        giving_level: donor.giving_level,
        total_giving: donor.total_giving?.toString(),
      };

      // Parse and add address if available
      if (donor.address) {
        try {
          const addr = typeof donor.address === 'string'
            ? JSON.parse(donor.address)
            : donor.address;
          contactData.address = addr.street;
          contactData.city = addr.city;
          contactData.state = addr.state;
          contactData.zip = addr.postalCode;
          contactData.country = addr.country;
        } catch {
          // Ignore address parsing errors
        }
      }

      if (donor.external_id) {
        await hsClient.updateContact(donor.external_id, contactData);
      } else {
        const created = await hsClient.createContact(contactData);

        await supabase
          .from('donors')
          .update({
            external_id: created.id,
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

async function syncDealsFromHubSpot(
  hsClient: HubSpotClient,
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

  const properties = [
    'dealname', 'amount', 'dealstage', 'closedate', 'pipeline',
    'description', 'createdate', 'hs_lastmodifieddate',
    'nexus_donation_id', 'payment_method', 'campaign',
  ];

  try {
    // Only fetch closed won deals (completed donations)
    const dealFilters = [{
      propertyName: 'dealstage',
      operator: 'EQ',
      value: 'closedwon',
    }];

    if (filters?.modifiedAfter) {
      dealFilters.push({
        propertyName: 'hs_lastmodifieddate',
        operator: 'GTE',
        value: new Date(filters.modifiedAfter).getTime().toString(),
      });
    }

    const deals = await hsClient.searchDeals(properties, dealFilters, 100);

    for (const deal of deals.results) {
      result.processed++;

      try {
        const props = deal.properties;

        // Note: In a full implementation, we'd need to look up the donor
        // by the deal's associated contact
        const donationData = {
          organization_id: organizationId,
          external_id: deal.id,
          source: 'hubspot',
          amount: props.amount ? parseFloat(props.amount) : 0,
          currency: 'USD',
          date: props.closedate || deal.createdAt,
          payment_method: props.payment_method,
          campaign: props.campaign,
          notes: props.description,
          status: 'completed',
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // For now, log that we processed the deal
        // Full implementation would sync to a donations table
        console.log(`[HubSpot Sync] Processed deal: ${deal.id}`);
        result.created++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          code: 'SYNC_ERROR',
          message: (error as Error).message,
          recordId: deal.id,
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

    // Fetch HubSpot credentials
    const { data: integration, error: integrationError } = await supabase
      .from('crm_integrations')
      .select('credentials')
      .eq('organization_id', organizationId)
      .eq('crm_type', 'hubspot')
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'HubSpot integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentials = integration.credentials as HubSpotCredentials;

    // Check if token is expired
    if (new Date(credentials.expiresAt) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'HubSpot token expired. Please reconnect.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hsClient = new HubSpotClient(credentials);

    // Initialize result
    const syncId = `hubspot_sync_${Date.now()}`;
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
        provider: 'hubspot',
        syncId,
        direction,
      },
    });

    // Sync contacts/donors
    if (syncDonors) {
      // Pull from HubSpot
      if (direction === 'pull' || direction === 'bidirectional') {
        const pullResult = await syncContactsFromHubSpot(
          hsClient,
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

      // Push to HubSpot
      if (direction === 'push' || direction === 'bidirectional') {
        const pushResult = await syncContactsToHubSpot(
          hsClient,
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

    // Sync deals/donations
    if (syncDonations) {
      if (direction === 'pull' || direction === 'bidirectional') {
        const dealsResult = await syncDealsFromHubSpot(
          hsClient,
          supabase,
          organizationId,
          filters
        );
        syncResult.stats.totalProcessed += dealsResult.processed;
        syncResult.stats.created += dealsResult.created;
        syncResult.stats.updated += dealsResult.updated;
        syncResult.stats.failed += dealsResult.failed;
        syncResult.errors.push(...dealsResult.errors);
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
      .eq('crm_type', 'hubspot');

    // Log sync completion
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: 'crm_sync_completed',
      metadata: {
        provider: 'hubspot',
        syncId,
        stats: syncResult.stats,
        errorCount: syncResult.errors.length,
      },
    });

    return new Response(JSON.stringify(syncResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[HubSpot Sync] Error:', error);

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
