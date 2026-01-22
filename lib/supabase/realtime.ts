/**
 * Supabase Real-Time Subscription Manager
 *
 * Manages real-time database subscriptions for live UI updates.
 * Handles subscription lifecycle, reconnection, and cleanup.
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './client';
import type { Database } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

type TableName = keyof Database['public']['Tables'];

/**
 * Realtime event types
 */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Subscription callback type
 */
export type SubscriptionCallback<T extends Record<string, unknown> = Record<string, unknown>> = (
  payload: RealtimePostgresChangesPayload<T>
) => void;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /**
   * Event types to subscribe to
   */
  event?: RealtimeEvent;

  /**
   * Filter by organization ID (for multi-tenant isolation)
   */
  organizationId?: string;

  /**
   * Additional filter column
   */
  filterColumn?: string;

  /**
   * Additional filter value
   */
  filterValue?: string;

  /**
   * Enable reconnection on disconnect
   */
  enableReconnect?: boolean;

  /**
   * Reconnection delay in milliseconds
   */
  reconnectDelayMs?: number;

  /**
   * Maximum reconnection attempts
   */
  maxReconnectAttempts?: number;
}

/**
 * Active subscription info
 */
export interface ActiveSubscription {
  id: string;
  channel: RealtimeChannel;
  table: TableName;
  event: RealtimeEvent;
  organizationId?: string;
  createdAt: Date;
  reconnectAttempts: number;
  status: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
}

// ============================================================================
// Subscription Manager Class
// ============================================================================

/**
 * Manages Supabase real-time subscriptions
 */
class RealtimeSubscriptionManager {
  private subscriptions: Map<string, ActiveSubscription> = new Map();
  private callbacks: Map<string, SubscriptionCallback[]> = new Map();
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  /**
   * Subscribe to a table for real-time updates
   */
  subscribe<T extends TableName>(
    table: T,
    callback: SubscriptionCallback<Database['public']['Tables'][T]['Row']>,
    options: SubscriptionOptions = {}
  ): string {
    const subscriptionId = this.generateSubscriptionId(table, options);

    // Check if subscription already exists
    const existing = this.subscriptions.get(subscriptionId);
    if (existing) {
      // Add callback to existing subscription
      const callbacks = this.callbacks.get(subscriptionId) || [];
      callbacks.push(callback as SubscriptionCallback);
      this.callbacks.set(subscriptionId, callbacks);
      return subscriptionId;
    }

    // Create new subscription
    const channelName = `realtime:${table}:${subscriptionId}`;
    const channel = supabase.channel(channelName);

    // Build filter
    let filter: string | undefined;
    if (options.organizationId) {
      filter = `organization_id=eq.${options.organizationId}`;
    } else if (options.filterColumn && options.filterValue) {
      filter = `${options.filterColumn}=eq.${options.filterValue}`;
    }

    // Configure channel - use type assertion to work with Supabase's specific types
    const channelConfig: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: options.event || '*',
      schema: 'public',
      table: table as string,
      filter,
    };

    (channel as unknown as {
      on: (
        type: string,
        config: typeof channelConfig,
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
      ) => typeof channel;
    }).on(
      'postgres_changes',
      channelConfig,
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        this.handlePayload(subscriptionId, payload);
      }
    );

    channel.subscribe((status) => {
      this.handleChannelStatus(subscriptionId, status);
    });

    // Store subscription
    const subscription: ActiveSubscription = {
      id: subscriptionId,
      channel,
      table,
      event: options.event || '*',
      organizationId: options.organizationId,
      createdAt: new Date(),
      reconnectAttempts: 0,
      status: 'CONNECTING',
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.callbacks.set(subscriptionId, [callback as SubscriptionCallback]);

    // Store options for reconnection
    (subscription as unknown as { options: SubscriptionOptions }).options = options;

    return subscriptionId;
  }

  /**
   * Unsubscribe from a table
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    await supabase.removeChannel(subscription.channel);
    this.subscriptions.delete(subscriptionId);
    this.callbacks.delete(subscriptionId);
  }

  /**
   * Unsubscribe all
   */
  async unsubscribeAll(): Promise<void> {
    const promises = Array.from(this.subscriptions.keys()).map((id) =>
      this.unsubscribe(id)
    );
    await Promise.all(promises);
  }

  /**
   * Get subscription status
   */
  getSubscription(subscriptionId: string): ActiveSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all active subscriptions
   */
  getAllSubscriptions(): ActiveSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    return this.connectionStatus;
  }

  /**
   * Force reconnect a subscription
   */
  async reconnect(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const options = (subscription as unknown as { options: SubscriptionOptions }).options;
    const callbacks = this.callbacks.get(subscriptionId) || [];

    await this.unsubscribe(subscriptionId);

    // Re-subscribe with same callbacks
    for (const callback of callbacks) {
      this.subscribe(subscription.table, callback, options);
    }
  }

  // Private methods

  private generateSubscriptionId(table: TableName, options: SubscriptionOptions): string {
    const parts: string[] = [table];
    if (options.organizationId) parts.push(`org:${options.organizationId}`);
    if (options.event && options.event !== '*') parts.push(`event:${options.event}`);
    if (options.filterColumn) parts.push(`filter:${options.filterColumn}:${options.filterValue}`);
    return parts.join(':');
  }

  private handlePayload(
    subscriptionId: string,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): void {
    const callbacks = this.callbacks.get(subscriptionId) || [];
    for (const callback of callbacks) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[Realtime] Error in subscription callback:`, error);
      }
    }
  }

  private handleChannelStatus(
    subscriptionId: string,
    status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT'
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    switch (status) {
      case 'SUBSCRIBED':
        subscription.status = 'SUBSCRIBED';
        subscription.reconnectAttempts = 0;
        this.connectionStatus = 'connected';
        console.log(`[Realtime] Subscribed to ${subscription.table}`);
        break;

      case 'CLOSED':
        subscription.status = 'DISCONNECTED';
        this.connectionStatus = 'disconnected';
        console.log(`[Realtime] Disconnected from ${subscription.table}`);
        this.attemptReconnect(subscriptionId);
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        subscription.status = 'ERROR';
        this.connectionStatus = 'disconnected';
        console.error(`[Realtime] Error on ${subscription.table}: ${status}`);
        this.attemptReconnect(subscriptionId);
        break;
    }
  }

  private async attemptReconnect(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const options = (subscription as unknown as { options: SubscriptionOptions }).options;
    if (!options?.enableReconnect) return;

    const maxAttempts = options.maxReconnectAttempts || 5;
    if (subscription.reconnectAttempts >= maxAttempts) {
      console.error(`[Realtime] Max reconnection attempts reached for ${subscription.table}`);
      return;
    }

    subscription.reconnectAttempts++;
    const delay = (options.reconnectDelayMs || 1000) * subscription.reconnectAttempts;

    console.log(`[Realtime] Attempting reconnect (${subscription.reconnectAttempts}/${maxAttempts}) in ${delay}ms`);

    setTimeout(() => {
      this.reconnect(subscriptionId);
    }, delay);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: RealtimeSubscriptionManager | null = null;

/**
 * Get the subscription manager instance
 */
export function getRealtimeManager(): RealtimeSubscriptionManager {
  if (!managerInstance) {
    managerInstance = new RealtimeSubscriptionManager();
  }
  return managerInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Subscribe to donor updates for an organization
 */
export function subscribeToDonors(
  organizationId: string,
  callback: SubscriptionCallback<Database['public']['Tables']['donors']['Row']>,
  options?: Omit<SubscriptionOptions, 'organizationId'>
): string {
  return getRealtimeManager().subscribe('donors', callback, {
    ...options,
    organizationId,
    enableReconnect: true,
  });
}

/**
 * Subscribe to activity log for an organization
 */
export function subscribeToActivityLog(
  organizationId: string,
  callback: SubscriptionCallback<Database['public']['Tables']['activity_log']['Row']>,
  options?: Omit<SubscriptionOptions, 'organizationId'>
): string {
  return getRealtimeManager().subscribe('activity_log', callback, {
    ...options,
    organizationId,
    enableReconnect: true,
  });
}

/**
 * Subscribe to project updates for an organization
 */
export function subscribeToProjects(
  organizationId: string,
  callback: SubscriptionCallback<Database['public']['Tables']['projects']['Row']>,
  options?: Omit<SubscriptionOptions, 'organizationId'>
): string {
  return getRealtimeManager().subscribe('projects', callback, {
    ...options,
    organizationId,
    enableReconnect: true,
  });
}

/**
 * Subscribe to relationship updates for an organization
 */
export function subscribeToRelationships(
  organizationId: string,
  callback: SubscriptionCallback<Database['public']['Tables']['relationships']['Row']>,
  options?: Omit<SubscriptionOptions, 'organizationId'>
): string {
  return getRealtimeManager().subscribe('relationships', callback, {
    ...options,
    organizationId,
    enableReconnect: true,
  });
}

/**
 * Subscribe to CRM integration updates
 */
export function subscribeToCRMIntegrations(
  organizationId: string,
  callback: SubscriptionCallback<Database['public']['Tables']['crm_integrations']['Row']>,
  options?: Omit<SubscriptionOptions, 'organizationId'>
): string {
  return getRealtimeManager().subscribe('crm_integrations', callback, {
    ...options,
    organizationId,
    enableReconnect: true,
  });
}

/**
 * Subscribe to alignment updates
 */
export function subscribeToAlignments(
  organizationId: string,
  callback: SubscriptionCallback<Database['public']['Tables']['donor_project_alignments']['Row']>,
  options?: Omit<SubscriptionOptions, 'organizationId'>
): string {
  return getRealtimeManager().subscribe('donor_project_alignments', callback, {
    ...options,
    organizationId,
    enableReconnect: true,
  });
}

/**
 * Unsubscribe from a subscription
 */
export function unsubscribe(subscriptionId: string): Promise<void> {
  return getRealtimeManager().unsubscribe(subscriptionId);
}

/**
 * Unsubscribe from all subscriptions
 */
export function unsubscribeAll(): Promise<void> {
  return getRealtimeManager().unsubscribeAll();
}

// ============================================================================
// Export Manager
// ============================================================================

export const realtimeManager = {
  subscribe: <T extends TableName>(
    table: T,
    callback: SubscriptionCallback<Database['public']['Tables'][T]['Row']>,
    options?: SubscriptionOptions
  ) => getRealtimeManager().subscribe(table, callback, options),
  unsubscribe,
  unsubscribeAll,
  getSubscription: (id: string) => getRealtimeManager().getSubscription(id),
  getAllSubscriptions: () => getRealtimeManager().getAllSubscriptions(),
  getConnectionStatus: () => getRealtimeManager().getConnectionStatus(),
  reconnect: (id: string) => getRealtimeManager().reconnect(id),

  // Table-specific helpers
  donors: subscribeToDonors,
  activityLog: subscribeToActivityLog,
  projects: subscribeToProjects,
  relationships: subscribeToRelationships,
  crmIntegrations: subscribeToCRMIntegrations,
  alignments: subscribeToAlignments,
};
