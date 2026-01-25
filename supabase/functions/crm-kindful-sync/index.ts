/**
 * Kindful CRM Sync Edge Function
 *
 * Handles bidirectional synchronization between Nexus and Kindful:
 * - Syncs contacts (donors) between systems
 * - Syncs donations
 * - Syncs activities (interactions)
 *
 * Kindful API Reference: https://developer.kindful.com/
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =============================================================================
// Configuration
// =============================================================================

const KINDFUL_API_BASE = 'https://app.kindful.com/api/v1';
const RATE_LIMIT_DELAY = 200; // ms between API calls
const MAX_PAGE_SIZE = 50;

// =============================================================================
// Types
// =============================================================================

interface SyncRequest {
  organizationId: string;
  direction: 'push' | 'pull' | 'bidirectional';
  syncDonors: boolean;
  syncDonations: boolean;
  syncInteractions: boolean;
}

interface SyncResult {
  success: boolean;
  stats: {
    donors: { created: number; updated: number; errors: number };
    donations: { created: number; updated: number; errors: number };
    interactions: { created: number; updated: number; errors: number };
  };
  errors: string[];
}

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
  donor_status?: string;
  total_donated?: number;
  last_donation_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface KindfulDonation {
  id: string;
  contact_id: string;
  amount: number;
  currency: string;
  transaction_date: string;
  payment_method?: string;
  campaign_id?: string;
  campaign_name?: string;
  fund_id?: string;
  fund_name?: string;
  is_recurring: boolean;
  status: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

interface KindfulActivity {
  id: string;
  contact_id: string;
  activity_type: string;
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

// =============================================================================
// Kindful API Client
// =============================================================================

class KindfulClient {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${KINDFUL_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Token token=${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kindful API error: ${response.status} - ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Contacts (Donors)
  async getContacts(
    page: number = 1,
    perPage: number = MAX_PAGE_SIZE
  ): Promise<KindfulPaginatedResponse<KindfulContact>> {
    return this.request(`/contacts?page=${page}&per_page=${perPage}`);
  }

  async getContact(id: string): Promise<KindfulContact> {
    return this.request(`/contacts/${id}`);
  }

  async createContact(data: Partial<KindfulContact>): Promise<KindfulContact> {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify({ contact: data }),
    });
  }

  async updateContact(
    id: string,
    data: Partial<KindfulContact>
  ): Promise<KindfulContact> {
    return this.request(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ contact: data }),
    });
  }

  // Donations
  async getDonations(
    page: number = 1,
    perPage: number = MAX_PAGE_SIZE
  ): Promise<KindfulPaginatedResponse<KindfulDonation>> {
    return this.request(`/donations?page=${page}&per_page=${perPage}&status=completed`);
  }

  async getDonationsByContact(
    contactId: string,
    page: number = 1,
    perPage: number = MAX_PAGE_SIZE
  ): Promise<KindfulPaginatedResponse<KindfulDonation>> {
    return this.request(
      `/contacts/${contactId}/donations?page=${page}&per_page=${perPage}`
    );
  }

  // Activities (Interactions)
  async getActivities(
    page: number = 1,
    perPage: number = MAX_PAGE_SIZE
  ): Promise<KindfulPaginatedResponse<KindfulActivity>> {
    return this.request(`/activities?page=${page}&per_page=${perPage}`);
  }

  async getActivitiesByContact(
    contactId: string,
    page: number = 1,
    perPage: number = MAX_PAGE_SIZE
  ): Promise<KindfulPaginatedResponse<KindfulActivity>> {
    return this.request(
      `/contacts/${contactId}/activities?page=${page}&per_page=${perPage}`
    );
  }

  async createActivity(data: {
    contact_id: string;
    activity_type: string;
    subject: string;
    activity_date: string;
    description?: string;
    completed?: boolean;
  }): Promise<KindfulActivity> {
    return this.request('/activities', {
      method: 'POST',
      body: JSON.stringify({ activity: data }),
    });
  }
}

// =============================================================================
// Sync Operations
// =============================================================================

async function syncDonors(
  client: KindfulClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Kindful
    if (direction === 'pull' || direction === 'bidirectional') {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.getContacts(page, MAX_PAGE_SIZE);

        for (const contact of response.data) {
          try {
            const nexusDonor = mapContactToDonor(contact, organizationId);

            // Check if donor exists by external ID
            const { data: existing } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', contact.id)
              .eq('crm_source', 'kindful')
              .single();

            if (existing) {
              // Update existing donor
              const { error } = await supabase
                .from('donors')
                .update({
                  ...nexusDonor,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) throw error;
              stats.updated++;
            } else {
              // Create new donor
              const { error } = await supabase.from('donors').insert(nexusDonor);

              if (error) throw error;
              stats.created++;
            }
          } catch (error) {
            console.error(`Error syncing contact ${contact.id}:`, error);
            stats.errors++;
          }
        }

        page++;
        hasMore = response.meta.current_page < response.meta.total_pages;
      }
    }

    // Push to Kindful
    if (direction === 'push' || direction === 'bidirectional') {
      // Get donors that haven't been synced
      const { data: donors, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId)
        .is('crm_external_id', null);

      if (error) throw error;

      for (const donor of donors || []) {
        try {
          await delay(RATE_LIMIT_DELAY);
          const contact = mapDonorToContact(donor);
          const created = await client.createContact(contact);

          // Update donor with CRM external ID
          await supabase
            .from('donors')
            .update({
              crm_external_id: created.id,
              crm_source: 'kindful',
              updated_at: new Date().toISOString(),
            })
            .eq('id', donor.id);

          stats.created++;
        } catch (error) {
          console.error(`Error pushing donor ${donor.id}:`, error);
          stats.errors++;
        }
      }
    }
  } catch (error) {
    console.error('Error in syncDonors:', error);
    stats.errors++;
  }

  return stats;
}

async function syncDonations(
  client: KindfulClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Kindful
    if (direction === 'pull' || direction === 'bidirectional') {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.getDonations(page, MAX_PAGE_SIZE);

        for (const donation of response.data) {
          try {
            // Find the corresponding donor
            const { data: donor } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', donation.contact_id)
              .eq('crm_source', 'kindful')
              .single();

            if (!donor) {
              // Skip if we don't have the donor
              continue;
            }

            // Map donation
            const nexusDonation = {
              organization_id: organizationId,
              donor_id: donor.id,
              amount: donation.amount,
              donation_date: donation.transaction_date,
              payment_method: mapPaymentMethod(donation.payment_method),
              notes: donation.note,
              crm_external_id: donation.id,
              crm_source: 'kindful',
              campaign: donation.campaign_name,
              fund: donation.fund_name,
              is_recurring: donation.is_recurring,
            };

            // Check if donation exists
            const { data: existing } = await supabase
              .from('donations')
              .select('id')
              .eq('crm_external_id', donation.id)
              .eq('crm_source', 'kindful')
              .single();

            if (existing) {
              const { error } = await supabase
                .from('donations')
                .update({
                  ...nexusDonation,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) throw error;
              stats.updated++;
            } else {
              const { error } = await supabase.from('donations').insert(nexusDonation);

              if (error) throw error;
              stats.created++;
            }
          } catch (error) {
            console.error(`Error syncing donation ${donation.id}:`, error);
            stats.errors++;
          }
        }

        page++;
        hasMore = response.meta.current_page < response.meta.total_pages;
      }
    }
  } catch (error) {
    console.error('Error in syncDonations:', error);
    stats.errors++;
  }

  return stats;
}

async function syncInteractions(
  client: KindfulClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Kindful
    if (direction === 'pull' || direction === 'bidirectional') {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.getActivities(page, MAX_PAGE_SIZE);

        for (const activity of response.data) {
          try {
            // Find the corresponding donor
            const { data: donor } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', activity.contact_id)
              .eq('crm_source', 'kindful')
              .single();

            if (!donor) {
              continue;
            }

            // Map activity to interaction
            const nexusInteraction = {
              organization_id: organizationId,
              donor_id: donor.id,
              activity_type: mapActivityType(activity.activity_type),
              subject: activity.subject,
              notes: activity.description,
              activity_date: activity.activity_date,
              status: activity.completed ? 'completed' : 'scheduled',
              crm_external_id: activity.id,
              crm_source: 'kindful',
            };

            // Check if interaction exists
            const { data: existing } = await supabase
              .from('donor_interactions')
              .select('id')
              .eq('crm_external_id', activity.id)
              .eq('crm_source', 'kindful')
              .single();

            if (existing) {
              const { error } = await supabase
                .from('donor_interactions')
                .update({
                  ...nexusInteraction,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) throw error;
              stats.updated++;
            } else {
              const { error } = await supabase
                .from('donor_interactions')
                .insert(nexusInteraction);

              if (error) throw error;
              stats.created++;
            }
          } catch (error) {
            console.error(`Error syncing activity ${activity.id}:`, error);
            stats.errors++;
          }
        }

        page++;
        hasMore = response.meta.current_page < response.meta.total_pages;
      }
    }

    // Push to Kindful
    if (direction === 'push' || direction === 'bidirectional') {
      // Get interactions that haven't been synced
      const { data: interactions, error } = await supabase
        .from('donor_interactions')
        .select('*, donors!inner(crm_external_id, crm_source)')
        .eq('organization_id', organizationId)
        .is('crm_external_id', null);

      if (error) throw error;

      for (const interaction of interactions || []) {
        try {
          const donorExternalId = (interaction as unknown as { donors: { crm_external_id: string; crm_source: string } }).donors?.crm_external_id;
          const donorCrmSource = (interaction as unknown as { donors: { crm_external_id: string; crm_source: string } }).donors?.crm_source;

          if (!donorExternalId || donorCrmSource !== 'kindful') {
            continue;
          }

          await delay(RATE_LIMIT_DELAY);
          const kindfulActivity = {
            contact_id: donorExternalId,
            activity_type: mapActivityTypeToKindful(interaction.activity_type),
            subject: interaction.subject || 'Activity',
            activity_date: interaction.activity_date,
            description: interaction.notes,
            completed: interaction.status === 'completed',
          };

          const created = await client.createActivity(kindfulActivity);

          // Update interaction with CRM external ID
          await supabase
            .from('donor_interactions')
            .update({
              crm_external_id: created.id,
              crm_source: 'kindful',
              updated_at: new Date().toISOString(),
            })
            .eq('id', interaction.id);

          stats.created++;
        } catch (error) {
          console.error(`Error pushing interaction ${interaction.id}:`, error);
          stats.errors++;
        }
      }
    }
  } catch (error) {
    console.error('Error in syncInteractions:', error);
    stats.errors++;
  }

  return stats;
}

// =============================================================================
// Mapping Functions
// =============================================================================

function mapContactToDonor(
  contact: KindfulContact,
  organizationId: string
): Record<string, unknown> {
  return {
    organization_id: organizationId,
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || null,
    phone: contact.phone || null,
    address: contact.address_line_1 || null,
    city: contact.city || null,
    state: contact.state || null,
    postal_code: contact.postal_code || null,
    country: contact.country || null,
    company: contact.company || null,
    title: contact.title || null,
    donor_type: contact.contact_type === 'company' ? 'organization' : 'individual',
    status: contact.donor_status || 'active',
    total_donated: contact.total_donated || 0,
    last_donation_date: contact.last_donation_date || null,
    crm_external_id: contact.id,
    crm_source: 'kindful',
    crm_sync_metadata: {
      lastSyncedAt: new Date().toISOString(),
      kindfulTags: contact.tags,
    },
  };
}

function mapDonorToContact(
  donor: Record<string, unknown>
): Partial<KindfulContact> {
  return {
    first_name: donor.first_name as string || '',
    last_name: donor.last_name as string || '',
    email: donor.email as string || undefined,
    phone: donor.phone as string || undefined,
    address_line_1: donor.address as string || undefined,
    city: donor.city as string || undefined,
    state: donor.state as string || undefined,
    postal_code: donor.postal_code as string || undefined,
    country: donor.country as string || undefined,
    company: donor.company as string || undefined,
    title: donor.title as string || undefined,
    contact_type: donor.donor_type === 'organization' ? 'company' : 'individual',
  };
}

function mapPaymentMethod(method?: string): string {
  const methodMap: Record<string, string> = {
    credit_card: 'credit_card',
    check: 'check',
    cash: 'cash',
    ach: 'ach',
    other: 'other',
  };
  return methodMap[method || 'other'] || 'other';
}

function mapActivityType(activityType: string): string {
  const typeMap: Record<string, string> = {
    email: 'email',
    phone_call: 'phone',
    meeting: 'meeting',
    note: 'note',
    task: 'task',
    other: 'other',
  };
  return typeMap[activityType] || 'other';
}

function mapActivityTypeToKindful(activityType: string): string {
  const typeMap: Record<string, string> = {
    email: 'email',
    phone: 'phone_call',
    meeting: 'meeting',
    note: 'note',
    task: 'task',
    other: 'other',
  };
  return typeMap[activityType] || 'other';
}

// =============================================================================
// Utility Functions
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Parse request
    const body: SyncRequest = await req.json();
    const { organizationId, direction, syncDonors: doSyncDonors, syncDonations: doSyncDonations, syncInteractions: doSyncInteractions } = body;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Kindful credentials
    const { data: integration, error: credError } = await supabase
      .from('crm_integrations')
      .select('credentials')
      .eq('organization_id', organizationId)
      .eq('crm_type', 'kindful')
      .single();

    if (credError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Kindful integration not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const credentials = integration.credentials as { type: string; apiKey?: string };
    if (credentials.type !== 'api_key' || !credentials.apiKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid Kindful credentials' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Kindful client
    const client = new KindfulClient(credentials.apiKey);

    // Update sync status to syncing
    await supabase
      .from('crm_integrations')
      .update({ sync_status: 'syncing', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('crm_type', 'kindful');

    // Log sync start
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: 'crm_sync_started',
      metadata: { provider: 'kindful', direction },
    });

    // Perform sync operations
    const result: SyncResult = {
      success: true,
      stats: {
        donors: { created: 0, updated: 0, errors: 0 },
        donations: { created: 0, updated: 0, errors: 0 },
        interactions: { created: 0, updated: 0, errors: 0 },
      },
      errors: [],
    };

    if (doSyncDonors) {
      result.stats.donors = await syncDonors(
        client,
        supabase,
        organizationId,
        direction
      );
    }

    if (doSyncDonations) {
      result.stats.donations = await syncDonations(
        client,
        supabase,
        organizationId,
        direction
      );
    }

    if (doSyncInteractions) {
      result.stats.interactions = await syncInteractions(
        client,
        supabase,
        organizationId,
        direction
      );
    }

    // Check for errors
    const totalErrors =
      result.stats.donors.errors +
      result.stats.donations.errors +
      result.stats.interactions.errors;

    result.success = totalErrors === 0;

    // Update sync status
    await supabase
      .from('crm_integrations')
      .update({
        sync_status: result.success ? 'connected' : 'error',
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('crm_type', 'kindful');

    // Log sync completion
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: result.success ? 'crm_sync_completed' : 'crm_sync_failed',
      metadata: {
        provider: 'kindful',
        direction,
        stats: result.stats,
        errorCount: totalErrors,
      },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Kindful Sync] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
