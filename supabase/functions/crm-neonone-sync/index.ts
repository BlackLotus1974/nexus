/**
 * Neon One CRM Sync Edge Function
 *
 * Handles bidirectional synchronization between Nexus and Neon One (Neon CRM):
 * - Syncs accounts (donors) between systems
 * - Syncs donations
 * - Syncs activities (interactions)
 *
 * Neon One API Reference: https://developer.neoncrm.com/api-v2/
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =============================================================================
// Configuration
// =============================================================================

const NEONONE_API_BASE = 'https://api.neoncrm.com/v2';
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

interface NeonAccount {
  accountId: string;
  accountType: string;
  primaryContact?: {
    firstName?: string;
    lastName?: string;
    email1?: string;
    phone1?: string;
    addresses?: Array<{
      addressLine1?: string;
      city?: string;
      stateProvince?: string;
      zipCode?: string;
      country?: string;
      isPrimary: boolean;
    }>;
  };
  companyName?: string;
  totalDonationAmount?: number;
  lastDonationDate?: string;
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
  fund?: { id: string; name: string };
  campaign?: { id: string; name: string };
  tenderType?: string;
  donationStatus: string;
  isRecurring: boolean;
  note?: string;
  timestamps: {
    createdDateTime: string;
    lastModifiedDateTime: string;
  };
}

interface NeonActivity {
  activityId: string;
  accountId: string;
  activityType: string;
  subject: string;
  note?: string;
  activityDate: string;
  status: string;
  direction?: string;
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

// =============================================================================
// Neon One API Client
// =============================================================================

class NeonOneClient {
  private apiKey: string;
  private orgId: string;

  constructor(apiKey: string, orgId: string) {
    this.apiKey = apiKey;
    this.orgId = orgId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${NEONONE_API_BASE}${endpoint}`;

    // Neon One uses Basic Auth with orgId:apiKey
    const authString = btoa(`${this.orgId}:${this.apiKey}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon One API error: ${response.status} - ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Accounts (Donors)
  async searchAccounts(
    page: number = 0,
    pageSize: number = MAX_PAGE_SIZE
  ): Promise<NeonSearchResponse<NeonAccount>> {
    return this.request('/accounts/search', {
      method: 'POST',
      body: JSON.stringify({
        outputFields: [
          'Account ID', 'Account Type', 'First Name', 'Last Name',
          'Email 1', 'Phone 1', 'Company Name', 'Total Donation Amount',
          'Last Donation Date',
        ],
        pagination: {
          currentPage: page,
          pageSize,
        },
      }),
    });
  }

  async getAccount(id: string): Promise<NeonAccount> {
    return this.request(`/accounts/${id}`);
  }

  async createAccount(data: Partial<NeonAccount>): Promise<NeonAccount> {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(
    id: string,
    data: Partial<NeonAccount>
  ): Promise<NeonAccount> {
    return this.request(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Donations
  async searchDonations(
    page: number = 0,
    pageSize: number = MAX_PAGE_SIZE
  ): Promise<NeonSearchResponse<NeonDonation>> {
    return this.request('/donations/search', {
      method: 'POST',
      body: JSON.stringify({
        outputFields: [
          'Donation ID', 'Account ID', 'Amount', 'Donation Date',
          'Fund Name', 'Campaign Name', 'Tender Type', 'Donation Status',
        ],
        pagination: {
          currentPage: page,
          pageSize,
        },
        searchFields: [
          {
            field: 'Donation Status',
            operator: 'EQUAL',
            value: 'Succeeded',
          },
        ],
      }),
    });
  }

  // Activities (Interactions)
  async getAccountActivities(
    accountId: string,
    pageSize: number = 100
  ): Promise<{ activities: NeonActivity[] }> {
    return this.request(`/accounts/${accountId}/activities?pageSize=${pageSize}`);
  }

  async createActivity(
    accountId: string,
    data: {
      activityType: string;
      subject: string;
      activityDate: string;
      note?: string;
      status?: string;
      direction?: string;
    }
  ): Promise<NeonActivity> {
    return this.request(`/accounts/${accountId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// =============================================================================
// Sync Operations
// =============================================================================

async function syncDonors(
  client: NeonOneClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Neon One
    if (direction === 'pull' || direction === 'bidirectional') {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.searchAccounts(page, MAX_PAGE_SIZE);

        for (const account of response.searchResults) {
          try {
            const nexusDonor = mapAccountToDonor(account, organizationId);

            // Check if donor exists by external ID
            const { data: existing } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', account.accountId)
              .eq('crm_source', 'neonone')
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
            console.error(`Error syncing account ${account.accountId}:`, error);
            stats.errors++;
          }
        }

        page++;
        hasMore = response.pagination.currentPage < response.pagination.totalPages - 1;
      }
    }

    // Push to Neon One
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
          const account = mapDonorToAccount(donor);
          const created = await client.createAccount(account);

          // Update donor with CRM external ID
          await supabase
            .from('donors')
            .update({
              crm_external_id: created.accountId,
              crm_source: 'neonone',
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
  client: NeonOneClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Neon One
    if (direction === 'pull' || direction === 'bidirectional') {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.searchDonations(page, MAX_PAGE_SIZE);

        for (const donation of response.searchResults) {
          try {
            // Find the corresponding donor
            const { data: donor } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', donation.accountId)
              .eq('crm_source', 'neonone')
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
              donation_date: donation.date,
              payment_method: mapPaymentMethod(donation.tenderType),
              notes: donation.note,
              crm_external_id: donation.id,
              crm_source: 'neonone',
              campaign: donation.campaign?.name,
              fund: donation.fund?.name,
              is_recurring: donation.isRecurring,
            };

            // Check if donation exists
            const { data: existing } = await supabase
              .from('donations')
              .select('id')
              .eq('crm_external_id', donation.id)
              .eq('crm_source', 'neonone')
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
        hasMore = response.pagination.currentPage < response.pagination.totalPages - 1;
      }
    }
  } catch (error) {
    console.error('Error in syncDonations:', error);
    stats.errors++;
  }

  return stats;
}

async function syncInteractions(
  client: NeonOneClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Neon One - need to iterate through donors and get their activities
    if (direction === 'pull' || direction === 'bidirectional') {
      // Get all donors synced from Neon One
      const { data: donors, error } = await supabase
        .from('donors')
        .select('id, crm_external_id')
        .eq('organization_id', organizationId)
        .eq('crm_source', 'neonone')
        .not('crm_external_id', 'is', null);

      if (error) throw error;

      for (const donor of donors || []) {
        try {
          await delay(RATE_LIMIT_DELAY);
          const response = await client.getAccountActivities(donor.crm_external_id!);

          for (const activity of response.activities || []) {
            try {
              // Map activity to interaction
              const nexusInteraction = {
                organization_id: organizationId,
                donor_id: donor.id,
                activity_type: mapActivityType(activity.activityType),
                subject: activity.subject,
                notes: activity.note,
                activity_date: activity.activityDate,
                status: mapActivityStatus(activity.status),
                direction: activity.direction?.toLowerCase() || 'outbound',
                crm_external_id: activity.activityId,
                crm_source: 'neonone',
              };

              // Check if interaction exists
              const { data: existing } = await supabase
                .from('donor_interactions')
                .select('id')
                .eq('crm_external_id', activity.activityId)
                .eq('crm_source', 'neonone')
                .single();

              if (existing) {
                const { error: updateError } = await supabase
                  .from('donor_interactions')
                  .update({
                    ...nexusInteraction,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);

                if (updateError) throw updateError;
                stats.updated++;
              } else {
                const { error: insertError } = await supabase
                  .from('donor_interactions')
                  .insert(nexusInteraction);

                if (insertError) throw insertError;
                stats.created++;
              }
            } catch (activityError) {
              console.error(`Error syncing activity ${activity.activityId}:`, activityError);
              stats.errors++;
            }
          }
        } catch (donorError) {
          console.error(`Error fetching activities for donor ${donor.id}:`, donorError);
        }
      }
    }

    // Push to Neon One
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

          if (!donorExternalId || donorCrmSource !== 'neonone') {
            continue;
          }

          await delay(RATE_LIMIT_DELAY);
          const neonActivity = {
            activityType: mapActivityTypeToNeon(interaction.activity_type),
            subject: interaction.subject || 'Activity',
            activityDate: interaction.activity_date,
            note: interaction.notes,
            status: interaction.status === 'completed' ? 'Completed' : 'Scheduled',
            direction: interaction.direction === 'inbound' ? 'Inbound' : 'Outbound',
          };

          const created = await client.createActivity(donorExternalId, neonActivity);

          // Update interaction with CRM external ID
          await supabase
            .from('donor_interactions')
            .update({
              crm_external_id: created.activityId,
              crm_source: 'neonone',
              updated_at: new Date().toISOString(),
            })
            .eq('id', interaction.id);

          stats.created++;
        } catch (pushError) {
          console.error(`Error pushing interaction ${interaction.id}:`, pushError);
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

function mapAccountToDonor(
  account: NeonAccount,
  organizationId: string
): Record<string, unknown> {
  const contact = account.primaryContact || {};
  const primaryAddress = contact.addresses?.find((a) => a.isPrimary) || contact.addresses?.[0];

  return {
    organization_id: organizationId,
    first_name: contact.firstName || '',
    last_name: contact.lastName || '',
    email: contact.email1 || null,
    phone: contact.phone1 || null,
    address: primaryAddress?.addressLine1 || null,
    city: primaryAddress?.city || null,
    state: primaryAddress?.stateProvince || null,
    postal_code: primaryAddress?.zipCode || null,
    country: primaryAddress?.country || null,
    company: account.companyName || null,
    donor_type: account.accountType === 'Organization' ? 'organization' : 'individual',
    total_donated: account.totalDonationAmount || 0,
    last_donation_date: account.lastDonationDate || null,
    crm_external_id: account.accountId,
    crm_source: 'neonone',
    crm_sync_metadata: {
      lastSyncedAt: new Date().toISOString(),
      neonAccountType: account.accountType,
    },
  };
}

function mapDonorToAccount(
  donor: Record<string, unknown>
): Partial<NeonAccount> {
  return {
    accountType: donor.donor_type === 'organization' ? 'Organization' : 'Individual',
    primaryContact: {
      firstName: donor.first_name as string || '',
      lastName: donor.last_name as string || '',
      email1: donor.email as string || undefined,
      phone1: donor.phone as string || undefined,
      addresses: donor.address
        ? [{
            addressLine1: donor.address as string,
            city: donor.city as string || undefined,
            stateProvince: donor.state as string || undefined,
            zipCode: donor.postal_code as string || undefined,
            country: donor.country as string || undefined,
            isPrimary: true,
          }]
        : undefined,
    },
    companyName: donor.company as string || undefined,
  };
}

function mapPaymentMethod(method?: string): string {
  if (!method) return 'other';
  const lowerMethod = method.toLowerCase();
  if (lowerMethod.includes('credit') || lowerMethod.includes('card')) return 'credit_card';
  if (lowerMethod.includes('check')) return 'check';
  if (lowerMethod.includes('cash')) return 'cash';
  if (lowerMethod.includes('ach')) return 'ach';
  return 'other';
}

function mapActivityType(activityType: string): string {
  const typeMap: Record<string, string> = {
    'Email': 'email',
    'Phone': 'phone',
    'Meeting': 'meeting',
    'Note': 'note',
    'Task': 'task',
    'Letter': 'mail',
    'Other': 'other',
  };
  return typeMap[activityType] || 'other';
}

function mapActivityTypeToNeon(activityType: string): string {
  const typeMap: Record<string, string> = {
    'email': 'Email',
    'phone': 'Phone',
    'meeting': 'Meeting',
    'note': 'Note',
    'task': 'Task',
    'mail': 'Letter',
    'other': 'Other',
  };
  return typeMap[activityType] || 'Other';
}

function mapActivityStatus(status: string): string {
  if (status === 'Completed') return 'completed';
  if (status === 'Cancelled') return 'cancelled';
  return 'scheduled';
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

    // Get Neon One credentials
    const { data: integration, error: credError } = await supabase
      .from('crm_integrations')
      .select('credentials')
      .eq('organization_id', organizationId)
      .eq('crm_type', 'neonone')
      .single();

    if (credError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Neon One integration not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const credentials = integration.credentials as {
      type: string;
      apiKey?: string;
      apiSecret?: string;
    };
    if (credentials.type !== 'api_key' || !credentials.apiKey || !credentials.apiSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid Neon One credentials' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Neon One client
    const client = new NeonOneClient(credentials.apiKey, credentials.apiSecret);

    // Update sync status to syncing
    await supabase
      .from('crm_integrations')
      .update({ sync_status: 'syncing', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('crm_type', 'neonone');

    // Log sync start
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: 'crm_sync_started',
      metadata: { provider: 'neonone', direction },
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
      .eq('crm_type', 'neonone');

    // Log sync completion
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: result.success ? 'crm_sync_completed' : 'crm_sync_failed',
      metadata: {
        provider: 'neonone',
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
    console.error('[Neon One Sync] Error:', error);

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
