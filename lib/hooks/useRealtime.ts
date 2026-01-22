/**
 * React Hooks for Real-Time Database Subscriptions
 *
 * Provides hooks for subscribing to Supabase real-time updates
 * with automatic cleanup on component unmount.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  realtimeManager,
  RealtimeEvent,
  SubscriptionOptions,
  ActiveSubscription,
} from '@/lib/supabase/realtime';
import type { Database } from '@/types/database';

type TableName = keyof Database['public']['Tables'];

// ============================================================================
// Core Hook
// ============================================================================

/**
 * Subscribe to real-time updates for a table
 */
export function useRealtimeSubscription<T extends TableName>(
  table: T,
  callback: (payload: RealtimePostgresChangesPayload<Database['public']['Tables'][T]['Row']>) => void,
  options: SubscriptionOptions = {},
  enabled = true
): {
  subscriptionId: string | null;
  status: ActiveSubscription['status'] | 'UNSUBSCRIBED';
  reconnect: () => void;
} {
  const subscriptionIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<ActiveSubscription['status'] | 'UNSUBSCRIBED'>('UNSUBSCRIBED');

  useEffect(() => {
    if (!enabled) return;

    // Subscribe
    const id = realtimeManager.subscribe(table, callback, options);
    subscriptionIdRef.current = id;
    setStatus('CONNECTING');

    // Poll for status updates
    const statusInterval = setInterval(() => {
      if (subscriptionIdRef.current) {
        const subscription = realtimeManager.getSubscription(subscriptionIdRef.current);
        if (subscription) {
          setStatus(subscription.status);
        }
      }
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(statusInterval);
      if (subscriptionIdRef.current) {
        realtimeManager.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
        setStatus('UNSUBSCRIBED');
      }
    };
  }, [table, enabled, JSON.stringify(options)]);

  const reconnect = useCallback(() => {
    if (subscriptionIdRef.current) {
      realtimeManager.reconnect(subscriptionIdRef.current);
    }
  }, []);

  return {
    subscriptionId: subscriptionIdRef.current,
    status,
    reconnect,
  };
}

// ============================================================================
// Query Invalidation Hooks
// ============================================================================

/**
 * Subscribe to real-time updates and automatically invalidate React Query cache
 */
export function useRealtimeQueryInvalidation<T extends TableName>(
  table: T,
  queryKey: unknown[],
  options: SubscriptionOptions & {
    event?: RealtimeEvent;
    onUpdate?: (payload: RealtimePostgresChangesPayload<Database['public']['Tables'][T]['Row']>) => void;
  } = {},
  enabled = true
) {
  const queryClient = useQueryClient();

  const callback = useCallback(
    (payload: RealtimePostgresChangesPayload<Database['public']['Tables'][T]['Row']>) => {
      // Invalidate the query cache
      queryClient.invalidateQueries({ queryKey });

      // Call optional callback
      if (options.onUpdate) {
        options.onUpdate(payload);
      }
    },
    [queryClient, queryKey, options.onUpdate]
  );

  return useRealtimeSubscription(table, callback, options, enabled);
}

// ============================================================================
// Table-Specific Hooks
// ============================================================================

/**
 * Subscribe to donor updates with React Query invalidation
 */
export function useRealtimeDonors(
  organizationId: string,
  options?: {
    onInsert?: (donor: Database['public']['Tables']['donors']['Row']) => void;
    onUpdate?: (donor: Database['public']['Tables']['donors']['Row']) => void;
    onDelete?: (donor: { id: string }) => void;
  },
  enabled = true
) {
  const queryClient = useQueryClient();

  const callback = useCallback(
    (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['donors']['Row']>) => {
      // Invalidate donors query
      queryClient.invalidateQueries({ queryKey: ['donors', organizationId] });

      // Call specific callbacks
      switch (payload.eventType) {
        case 'INSERT':
          if (options?.onInsert && payload.new) {
            options.onInsert(payload.new);
          }
          break;
        case 'UPDATE':
          if (options?.onUpdate && payload.new) {
            options.onUpdate(payload.new);
            // Also invalidate specific donor query
            queryClient.invalidateQueries({
              queryKey: ['donors', organizationId, payload.new.id],
            });
          }
          break;
        case 'DELETE':
          if (options?.onDelete && payload.old) {
            options.onDelete({ id: (payload.old as Record<string, unknown>).id as string });
          }
          break;
      }
    },
    [queryClient, organizationId, options]
  );

  return useRealtimeSubscription(
    'donors',
    callback,
    { organizationId, enableReconnect: true },
    enabled && !!organizationId
  );
}

/**
 * Subscribe to project updates with React Query invalidation
 */
export function useRealtimeProjects(
  organizationId: string,
  options?: {
    onInsert?: (project: Database['public']['Tables']['projects']['Row']) => void;
    onUpdate?: (project: Database['public']['Tables']['projects']['Row']) => void;
    onDelete?: (project: { id: string }) => void;
  },
  enabled = true
) {
  const queryClient = useQueryClient();

  const callback = useCallback(
    (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['projects']['Row']>) => {
      // Invalidate projects query
      queryClient.invalidateQueries({ queryKey: ['projects', organizationId] });

      // Call specific callbacks
      switch (payload.eventType) {
        case 'INSERT':
          if (options?.onInsert && payload.new) {
            options.onInsert(payload.new);
          }
          break;
        case 'UPDATE':
          if (options?.onUpdate && payload.new) {
            options.onUpdate(payload.new);
            queryClient.invalidateQueries({
              queryKey: ['projects', organizationId, payload.new.id],
            });
          }
          break;
        case 'DELETE':
          if (options?.onDelete && payload.old) {
            options.onDelete({ id: (payload.old as Record<string, unknown>).id as string });
          }
          break;
      }
    },
    [queryClient, organizationId, options]
  );

  return useRealtimeSubscription(
    'projects',
    callback,
    { organizationId, enableReconnect: true },
    enabled && !!organizationId
  );
}

/**
 * Subscribe to activity log updates
 */
export function useRealtimeActivityLog(
  organizationId: string,
  options?: {
    onNewActivity?: (activity: Database['public']['Tables']['activity_log']['Row']) => void;
  },
  enabled = true
) {
  const queryClient = useQueryClient();

  const callback = useCallback(
    (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['activity_log']['Row']>) => {
      // Invalidate activity log query
      queryClient.invalidateQueries({ queryKey: ['activityLog', organizationId] });

      // Call callback for new activities
      if (payload.eventType === 'INSERT' && options?.onNewActivity && payload.new) {
        options.onNewActivity(payload.new);
      }
    },
    [queryClient, organizationId, options]
  );

  return useRealtimeSubscription(
    'activity_log',
    callback,
    { organizationId, event: 'INSERT', enableReconnect: true },
    enabled && !!organizationId
  );
}

/**
 * Subscribe to relationship updates
 */
export function useRealtimeRelationships(
  organizationId: string,
  options?: {
    onUpdate?: (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['relationships']['Row']>) => void;
  },
  enabled = true
) {
  const queryClient = useQueryClient();

  const callback = useCallback(
    (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['relationships']['Row']>) => {
      // Invalidate relationships queries
      queryClient.invalidateQueries({ queryKey: ['relationships', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['relationshipStats', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['warmPaths', organizationId] });

      if (options?.onUpdate) {
        options.onUpdate(payload);
      }
    },
    [queryClient, organizationId, options]
  );

  return useRealtimeSubscription(
    'relationships',
    callback,
    { organizationId, enableReconnect: true },
    enabled && !!organizationId
  );
}

/**
 * Subscribe to alignment updates
 */
export function useRealtimeAlignments(
  organizationId: string,
  options?: {
    onUpdate?: (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['donor_project_alignments']['Row']>) => void;
  },
  enabled = true
) {
  const queryClient = useQueryClient();

  const callback = useCallback(
    (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['donor_project_alignments']['Row']>) => {
      // Invalidate alignment queries
      queryClient.invalidateQueries({ queryKey: ['alignmentStats', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['projectAlignments'] });
      queryClient.invalidateQueries({ queryKey: ['donorAlignments'] });

      if (options?.onUpdate) {
        options.onUpdate(payload);
      }
    },
    [queryClient, organizationId, options]
  );

  return useRealtimeSubscription(
    'donor_project_alignments',
    callback,
    { organizationId, enableReconnect: true },
    enabled && !!organizationId
  );
}

/**
 * Subscribe to CRM integration updates
 */
export function useRealtimeCRMIntegrations(
  organizationId: string,
  options?: {
    onSyncStatusChange?: (integration: Database['public']['Tables']['crm_integrations']['Row']) => void;
  },
  enabled = true
) {
  const queryClient = useQueryClient();

  const callback = useCallback(
    (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['crm_integrations']['Row']>) => {
      // Invalidate CRM queries
      queryClient.invalidateQueries({ queryKey: ['crmIntegrations', organizationId] });

      if (payload.eventType === 'UPDATE' && options?.onSyncStatusChange && payload.new) {
        options.onSyncStatusChange(payload.new);
      }
    },
    [queryClient, organizationId, options]
  );

  return useRealtimeSubscription(
    'crm_integrations',
    callback,
    { organizationId, enableReconnect: true },
    enabled && !!organizationId
  );
}

// ============================================================================
// Connection Status Hook
// ============================================================================

/**
 * Get the overall real-time connection status
 */
export function useRealtimeConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>(
    realtimeManager.getConnectionStatus()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(realtimeManager.getConnectionStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

/**
 * Get all active subscriptions
 */
export function useActiveSubscriptions(): ActiveSubscription[] {
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>(
    realtimeManager.getAllSubscriptions()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSubscriptions(realtimeManager.getAllSubscriptions());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return subscriptions;
}
