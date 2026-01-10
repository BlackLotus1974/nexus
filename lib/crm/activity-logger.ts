/**
 * CRM Activity Logger
 *
 * Logs all CRM-related activities to the activity_log table for auditing,
 * debugging, and user visibility into sync operations.
 */

import { createClient } from '@/lib/supabase/client';
import type { CRMActivityType, CRMActivityMetadata } from './types';

/**
 * Log a CRM activity to the database
 */
export async function logCRMActivity(
  organizationId: string,
  activityType: CRMActivityType,
  metadata: CRMActivityMetadata,
  userId?: string,
  entityId?: string,
  entityType?: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('activity_log').insert({
    organization_id: organizationId,
    activity_type: activityType,
    metadata: metadata as Record<string, unknown>,
    user_id: userId,
    entity_id: entityId,
    entity_type: entityType || 'crm_integration',
    created_at: new Date().toISOString(),
  });

  if (error) {
    // Log to console but don't throw - activity logging should not break operations
    console.error('[CRM Activity Logger] Failed to log activity:', error);
  }
}

/**
 * Log CRM connection event
 */
export async function logCRMConnected(
  organizationId: string,
  provider: string,
  userId?: string
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_connected',
    { provider: provider as CRMActivityMetadata['provider'] },
    userId
  );
}

/**
 * Log CRM disconnection event
 */
export async function logCRMDisconnected(
  organizationId: string,
  provider: string,
  userId?: string
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_disconnected',
    { provider: provider as CRMActivityMetadata['provider'] },
    userId
  );
}

/**
 * Log sync started event
 */
export async function logSyncStarted(
  organizationId: string,
  provider: string,
  syncId: string
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_sync_started',
    {
      provider: provider as CRMActivityMetadata['provider'],
      syncId,
    }
  );
}

/**
 * Log sync completed event
 */
export async function logSyncCompleted(
  organizationId: string,
  provider: string,
  syncId: string,
  stats: CRMActivityMetadata['stats']
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_sync_completed',
    {
      provider: provider as CRMActivityMetadata['provider'],
      syncId,
      stats,
    }
  );
}

/**
 * Log sync failed event
 */
export async function logSyncFailed(
  organizationId: string,
  provider: string,
  syncId: string,
  error: { code: string; message: string }
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_sync_failed',
    {
      provider: provider as CRMActivityMetadata['provider'],
      syncId,
      error,
    }
  );
}

/**
 * Log donor synced event
 */
export async function logDonorSynced(
  organizationId: string,
  provider: string,
  donorId: string,
  action: 'created' | 'updated'
): Promise<void> {
  await logCRMActivity(
    organizationId,
    action === 'created' ? 'crm_donor_created' : 'crm_donor_updated',
    {
      provider: provider as CRMActivityMetadata['provider'],
      recordId: donorId,
      recordType: 'donor',
    },
    undefined,
    donorId,
    'donor'
  );
}

/**
 * Log donation synced event
 */
export async function logDonationSynced(
  organizationId: string,
  provider: string,
  donationId: string
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_donation_synced',
    {
      provider: provider as CRMActivityMetadata['provider'],
      recordId: donationId,
      recordType: 'donation',
    },
    undefined,
    donationId,
    'donation'
  );
}

/**
 * Log interaction created event
 */
export async function logInteractionCreated(
  organizationId: string,
  provider: string,
  interactionId: string
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_interaction_created',
    {
      provider: provider as CRMActivityMetadata['provider'],
      recordId: interactionId,
      recordType: 'interaction',
    },
    undefined,
    interactionId,
    'interaction'
  );
}

/**
 * Log token refreshed event
 */
export async function logTokenRefreshed(
  organizationId: string,
  provider: string
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_token_refreshed',
    { provider: provider as CRMActivityMetadata['provider'] }
  );
}

/**
 * Log CRM error event
 */
export async function logCRMError(
  organizationId: string,
  provider: string,
  error: { code: string; message: string }
): Promise<void> {
  await logCRMActivity(
    organizationId,
    'crm_error',
    {
      provider: provider as CRMActivityMetadata['provider'],
      error,
    }
  );
}

/**
 * Get recent CRM activities for an organization
 */
export async function getRecentCRMActivities(
  organizationId: string,
  limit: number = 50,
  provider?: string
): Promise<{
  id: string;
  activityType: string;
  metadata: CRMActivityMetadata;
  createdAt: Date;
}[]> {
  const supabase = createClient();

  let query = supabase
    .from('activity_log')
    .select('id, activity_type, metadata, created_at')
    .eq('organization_id', organizationId)
    .like('activity_type', 'crm_%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (provider) {
    query = query.eq('metadata->provider', provider);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[CRM Activity Logger] Failed to fetch activities:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    activityType: row.activity_type,
    metadata: row.metadata as CRMActivityMetadata,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Get sync history for a provider
 */
export async function getSyncHistory(
  organizationId: string,
  provider: string,
  limit: number = 20
): Promise<{
  syncId: string;
  status: 'started' | 'completed' | 'failed';
  stats?: CRMActivityMetadata['stats'];
  error?: { code: string; message: string };
  timestamp: Date;
}[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('activity_type, metadata, created_at')
    .eq('organization_id', organizationId)
    .in('activity_type', [
      'crm_sync_started',
      'crm_sync_completed',
      'crm_sync_failed',
    ])
    .eq('metadata->provider', provider)
    .order('created_at', { ascending: false })
    .limit(limit * 3); // Fetch more to group by syncId

  if (error) {
    console.error('[CRM Activity Logger] Failed to fetch sync history:', error);
    return [];
  }

  // Group by syncId and return latest status for each
  const syncMap = new Map<string, {
    syncId: string;
    status: 'started' | 'completed' | 'failed';
    stats?: CRMActivityMetadata['stats'];
    error?: { code: string; message: string };
    timestamp: Date;
  }>();

  for (const row of data || []) {
    const metadata = row.metadata as CRMActivityMetadata;
    const syncId = metadata.syncId;

    if (!syncId || syncMap.has(syncId)) continue;

    let status: 'started' | 'completed' | 'failed';
    if (row.activity_type === 'crm_sync_completed') {
      status = 'completed';
    } else if (row.activity_type === 'crm_sync_failed') {
      status = 'failed';
    } else {
      status = 'started';
    }

    syncMap.set(syncId, {
      syncId,
      status,
      stats: metadata.stats,
      error: metadata.error,
      timestamp: new Date(row.created_at),
    });
  }

  return Array.from(syncMap.values()).slice(0, limit);
}
