/**
 * Bloomerang CRM Sync Edge Function
 *
 * Handles bidirectional synchronization between Nexus and Bloomerang:
 * - Syncs constituents (donors) between systems
 * - Syncs transactions (donations)
 * - Syncs interactions (activities)
 *
 * Bloomerang API Reference: https://bloomerang.co/products/bloomerang-api/
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =============================================================================
// Configuration
// =============================================================================

const BLOOMERANG_API_BASE = 'https://api.bloomerang.co/v2';
const RATE_LIMIT_DELAY = 200; // ms between API calls
const MAX_PAGE_SIZE = 50; // Bloomerang's max page size

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

interface BloomerangConstituent {
  Id: number;
  Type: string;
  Status: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  PrimaryEmail?: { Value: string };
  PrimaryPhone?: { Number: string };
  PrimaryAddress?: {
    Street: string;
    City: string;
    State: string;
    PostalCode: string;
    Country: string;
  };
  CustomFields?: Array<{ FieldId: number; Value: unknown }>;
  CreatedDate: string;
  ModifiedDate: string;
}

interface BloomerangTransaction {
  Id: number;
  AccountId: number;
  Amount: number;
  Method: string;
  Date: string;
  Fund?: { Id: number; Name: string };
  Campaign?: { Id: number; Name: string };
  Appeal?: { Id: number; Name: string };
  Designation?: string;
  Note?: string;
  CreatedDate: string;
  ModifiedDate: string;
}

interface BloomerangInteraction {
  Id: number;
  AccountId: number;
  Channel: string;
  Purpose: string;
  Subject: string;
  Note?: string;
  Date: string;
  IsInbound: boolean;
  CreatedDate: string;
  ModifiedDate: string;
}

// =============================================================================
// Bloomerang API Client
// =============================================================================

class BloomerangClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BLOOMERANG_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bloomerang API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Constituents (Donors)
  async getConstituents(
    skip: number = 0,
    take: number = MAX_PAGE_SIZE
  ): Promise<{ Results: BloomerangConstituent[]; TotalCount: number }> {
    return this.request(`/constituents?skip=${skip}&take=${take}`);
  }

  async getConstituent(id: number): Promise<BloomerangConstituent> {
    return this.request(`/constituent/${id}`);
  }

  async createConstituent(data: Partial<BloomerangConstituent>): Promise<BloomerangConstituent> {
    return this.request('/constituent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConstituent(
    id: number,
    data: Partial<BloomerangConstituent>
  ): Promise<BloomerangConstituent> {
    return this.request(`/constituent/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Transactions (Donations)
  async getTransactions(
    skip: number = 0,
    take: number = MAX_PAGE_SIZE
  ): Promise<{ Results: BloomerangTransaction[]; TotalCount: number }> {
    return this.request(`/transactions?skip=${skip}&take=${take}`);
  }

  async getTransactionsByConstituent(
    constituentId: number,
    skip: number = 0,
    take: number = MAX_PAGE_SIZE
  ): Promise<{ Results: BloomerangTransaction[]; TotalCount: number }> {
    return this.request(
      `/transactions?accountId=${constituentId}&skip=${skip}&take=${take}`
    );
  }

  async createTransaction(data: {
    AccountId: number;
    Amount: number;
    Date: string;
    Method?: string;
    Note?: string;
  }): Promise<BloomerangTransaction> {
    return this.request('/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Interactions (Activities)
  async getInteractions(
    skip: number = 0,
    take: number = MAX_PAGE_SIZE
  ): Promise<{ Results: BloomerangInteraction[]; TotalCount: number }> {
    return this.request(`/interactions?skip=${skip}&take=${take}`);
  }

  async getInteractionsByConstituent(
    constituentId: number,
    skip: number = 0,
    take: number = MAX_PAGE_SIZE
  ): Promise<{ Results: BloomerangInteraction[]; TotalCount: number }> {
    return this.request(
      `/interactions?accountId=${constituentId}&skip=${skip}&take=${take}`
    );
  }

  async createInteraction(data: {
    AccountId: number;
    Channel: string;
    Purpose: string;
    Subject: string;
    Date: string;
    Note?: string;
    IsInbound?: boolean;
  }): Promise<BloomerangInteraction> {
    return this.request('/interaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// =============================================================================
// Sync Operations
// =============================================================================

async function syncDonors(
  client: BloomerangClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Bloomerang
    if (direction === 'pull' || direction === 'bidirectional') {
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.getConstituents(skip, MAX_PAGE_SIZE);

        for (const constituent of response.Results) {
          try {
            const nexusDonor = mapConstituentToDonor(constituent, organizationId);

            // Check if donor exists by external ID
            const { data: existing } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', constituent.Id.toString())
              .eq('crm_source', 'bloomerang')
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
            console.error(`Error syncing constituent ${constituent.Id}:`, error);
            stats.errors++;
          }
        }

        skip += MAX_PAGE_SIZE;
        hasMore = skip < response.TotalCount;
      }
    }

    // Push to Bloomerang
    if (direction === 'push' || direction === 'bidirectional') {
      // Get donors that haven't been synced or have been modified
      const { data: donors, error } = await supabase
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId)
        .is('crm_external_id', null);

      if (error) throw error;

      for (const donor of donors || []) {
        try {
          await delay(RATE_LIMIT_DELAY);
          const constituent = mapDonorToConstituent(donor);
          const created = await client.createConstituent(constituent);

          // Update donor with CRM external ID
          await supabase
            .from('donors')
            .update({
              crm_external_id: created.Id.toString(),
              crm_source: 'bloomerang',
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
  client: BloomerangClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Bloomerang
    if (direction === 'pull' || direction === 'bidirectional') {
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.getTransactions(skip, MAX_PAGE_SIZE);

        for (const transaction of response.Results) {
          try {
            // Find the corresponding donor
            const { data: donor } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', transaction.AccountId.toString())
              .eq('crm_source', 'bloomerang')
              .single();

            if (!donor) {
              // Skip if we don't have the donor
              continue;
            }

            // Map transaction to donation
            const donation = {
              organization_id: organizationId,
              donor_id: donor.id,
              amount: transaction.Amount,
              donation_date: transaction.Date,
              payment_method: mapPaymentMethod(transaction.Method),
              notes: transaction.Note,
              crm_external_id: transaction.Id.toString(),
              crm_source: 'bloomerang',
              campaign: transaction.Campaign?.Name,
              fund: transaction.Fund?.Name,
            };

            // Check if donation exists
            const { data: existing } = await supabase
              .from('donations')
              .select('id')
              .eq('crm_external_id', transaction.Id.toString())
              .eq('crm_source', 'bloomerang')
              .single();

            if (existing) {
              const { error } = await supabase
                .from('donations')
                .update({
                  ...donation,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) throw error;
              stats.updated++;
            } else {
              const { error } = await supabase.from('donations').insert(donation);

              if (error) throw error;
              stats.created++;
            }
          } catch (error) {
            console.error(`Error syncing transaction ${transaction.Id}:`, error);
            stats.errors++;
          }
        }

        skip += MAX_PAGE_SIZE;
        hasMore = skip < response.TotalCount;
      }
    }
  } catch (error) {
    console.error('Error in syncDonations:', error);
    stats.errors++;
  }

  return stats;
}

async function syncInteractions(
  client: BloomerangClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  try {
    // Pull from Bloomerang
    if (direction === 'pull' || direction === 'bidirectional') {
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        await delay(RATE_LIMIT_DELAY);
        const response = await client.getInteractions(skip, MAX_PAGE_SIZE);

        for (const interaction of response.Results) {
          try {
            // Find the corresponding donor
            const { data: donor } = await supabase
              .from('donors')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('crm_external_id', interaction.AccountId.toString())
              .eq('crm_source', 'bloomerang')
              .single();

            if (!donor) {
              continue;
            }

            // Map interaction to activity
            const activity = {
              organization_id: organizationId,
              donor_id: donor.id,
              activity_type: mapInteractionChannel(interaction.Channel),
              subject: interaction.Subject,
              notes: interaction.Note,
              activity_date: interaction.Date,
              direction: interaction.IsInbound ? 'inbound' : 'outbound',
              crm_external_id: interaction.Id.toString(),
              crm_source: 'bloomerang',
            };

            // Check if activity exists
            const { data: existing } = await supabase
              .from('donor_interactions')
              .select('id')
              .eq('crm_external_id', interaction.Id.toString())
              .eq('crm_source', 'bloomerang')
              .single();

            if (existing) {
              const { error } = await supabase
                .from('donor_interactions')
                .update({
                  ...activity,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) throw error;
              stats.updated++;
            } else {
              const { error } = await supabase
                .from('donor_interactions')
                .insert(activity);

              if (error) throw error;
              stats.created++;
            }
          } catch (error) {
            console.error(`Error syncing interaction ${interaction.Id}:`, error);
            stats.errors++;
          }
        }

        skip += MAX_PAGE_SIZE;
        hasMore = skip < response.TotalCount;
      }
    }

    // Push to Bloomerang
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

          if (!donorExternalId || donorCrmSource !== 'bloomerang') {
            continue;
          }

          await delay(RATE_LIMIT_DELAY);
          const bloomerangInteraction = {
            AccountId: parseInt(donorExternalId, 10),
            Channel: mapActivityToChannel(interaction.activity_type),
            Purpose: 'Stewardship',
            Subject: interaction.subject || 'Activity',
            Date: interaction.activity_date,
            Note: interaction.notes,
            IsInbound: interaction.direction === 'inbound',
          };

          const created = await client.createInteraction(bloomerangInteraction);

          // Update interaction with CRM external ID
          await supabase
            .from('donor_interactions')
            .update({
              crm_external_id: created.Id.toString(),
              crm_source: 'bloomerang',
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

function mapConstituentToDonor(
  constituent: BloomerangConstituent,
  organizationId: string
): Record<string, unknown> {
  // Parse name
  let firstName = constituent.FirstName || '';
  let lastName = constituent.LastName || '';

  if (!firstName && !lastName && constituent.FullName) {
    const parts = constituent.FullName.split(' ');
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  return {
    organization_id: organizationId,
    first_name: firstName,
    last_name: lastName,
    email: constituent.PrimaryEmail?.Value || null,
    phone: constituent.PrimaryPhone?.Number || null,
    address: constituent.PrimaryAddress
      ? formatAddress(constituent.PrimaryAddress)
      : null,
    city: constituent.PrimaryAddress?.City || null,
    state: constituent.PrimaryAddress?.State || null,
    postal_code: constituent.PrimaryAddress?.PostalCode || null,
    country: constituent.PrimaryAddress?.Country || null,
    donor_type: constituent.Type === 'Organization' ? 'organization' : 'individual',
    status: constituent.Status === 'Active' ? 'active' : 'inactive',
    crm_external_id: constituent.Id.toString(),
    crm_source: 'bloomerang',
    crm_sync_metadata: {
      lastSyncedAt: new Date().toISOString(),
      bloomerangType: constituent.Type,
      bloomerangStatus: constituent.Status,
    },
  };
}

function mapDonorToConstituent(
  donor: Record<string, unknown>
): Partial<BloomerangConstituent> {
  const constituent: Partial<BloomerangConstituent> = {
    Type: donor.donor_type === 'organization' ? 'Organization' : 'Individual',
    Status: donor.status === 'active' ? 'Active' : 'Inactive',
  };

  if (donor.donor_type === 'organization') {
    constituent.FullName = donor.organization_name as string || `${donor.first_name} ${donor.last_name}`;
  } else {
    constituent.FirstName = donor.first_name as string || '';
    constituent.LastName = donor.last_name as string || '';
  }

  if (donor.email) {
    constituent.PrimaryEmail = { Value: donor.email as string };
  }

  if (donor.phone) {
    constituent.PrimaryPhone = { Number: donor.phone as string };
  }

  if (donor.address || donor.city || donor.state || donor.postal_code) {
    constituent.PrimaryAddress = {
      Street: donor.address as string || '',
      City: donor.city as string || '',
      State: donor.state as string || '',
      PostalCode: donor.postal_code as string || '',
      Country: donor.country as string || 'US',
    };
  }

  return constituent;
}

function formatAddress(address: {
  Street: string;
  City: string;
  State: string;
  PostalCode: string;
  Country: string;
}): string {
  const parts = [
    address.Street,
    address.City,
    address.State,
    address.PostalCode,
    address.Country,
  ].filter(Boolean);
  return parts.join(', ');
}

function mapPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    Cash: 'cash',
    Check: 'check',
    CreditCard: 'credit_card',
    'Credit Card': 'credit_card',
    ACH: 'ach',
    EFT: 'eft',
    PayPal: 'paypal',
    Stock: 'stock',
    Wire: 'wire',
    Other: 'other',
  };
  return methodMap[method] || 'other';
}

function mapInteractionChannel(channel: string): string {
  const channelMap: Record<string, string> = {
    Email: 'email',
    Phone: 'phone',
    Mail: 'mail',
    InPerson: 'meeting',
    'In Person': 'meeting',
    Event: 'event',
    SocialMedia: 'social',
    'Social Media': 'social',
    Website: 'website',
    Other: 'other',
  };
  return channelMap[channel] || 'other';
}

function mapActivityToChannel(activityType: string): string {
  const typeMap: Record<string, string> = {
    email: 'Email',
    phone: 'Phone',
    mail: 'Mail',
    meeting: 'InPerson',
    event: 'Event',
    social: 'SocialMedia',
    website: 'Website',
    other: 'Other',
  };
  return typeMap[activityType] || 'Other';
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
    const { organizationId, direction, syncDonors, syncDonations, syncInteractions } = body;

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

    // Get Bloomerang credentials
    const { data: integration, error: credError } = await supabase
      .from('crm_integrations')
      .select('credentials')
      .eq('organization_id', organizationId)
      .eq('crm_type', 'bloomerang')
      .single();

    if (credError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Bloomerang integration not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const credentials = integration.credentials as { type: string; apiKey?: string };
    if (credentials.type !== 'api_key' || !credentials.apiKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid Bloomerang credentials' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Bloomerang client
    const client = new BloomerangClient(credentials.apiKey);

    // Update sync status to syncing
    await supabase
      .from('crm_integrations')
      .update({ sync_status: 'syncing', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('crm_type', 'bloomerang');

    // Log sync start
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: 'crm_sync_started',
      metadata: { provider: 'bloomerang', direction },
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

    if (syncDonors) {
      result.stats.donors = await syncDonorsOperation(
        client,
        supabase,
        organizationId,
        direction
      );
    }

    if (syncDonations) {
      result.stats.donations = await syncDonations(
        client,
        supabase,
        organizationId,
        direction
      );
    }

    if (syncInteractions) {
      result.stats.interactions = await syncInteractionsOperation(
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
      .eq('crm_type', 'bloomerang');

    // Log sync completion
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      activity_type: result.success ? 'crm_sync_completed' : 'crm_sync_failed',
      metadata: {
        provider: 'bloomerang',
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
    console.error('[Bloomerang Sync] Error:', error);

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

// Wrapper functions to avoid naming conflicts
async function syncDonorsOperation(
  client: BloomerangClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
) {
  return syncDonors(client, supabase, organizationId, direction);
}

async function syncInteractionsOperation(
  client: BloomerangClient,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  direction: string
) {
  return syncInteractions(client, supabase, organizationId, direction);
}
