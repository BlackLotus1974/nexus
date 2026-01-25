/**
 * useRealtime Hook
 *
 * Provides real-time subscription capabilities for Supabase tables.
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T> {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  schema?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
}

interface UseRealtimeReturn<T> {
  data: T | null;
  event: RealtimeEvent | null;
  isConnected: boolean;
  error: Error | null;
}

/**
 * Hook for subscribing to Supabase real-time updates
 */
export function useRealtime<T extends Record<string, unknown>>(
  options: UseRealtimeOptions<T>
): UseRealtimeReturn<T> {
  const { table, event = '*', filter, schema = 'public', onInsert, onUpdate, onDelete } = options;

  const [data, setData] = useState<T | null>(null);
  const [currentEvent, setCurrentEvent] = useState<RealtimeEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const handleChange = (payload: RealtimePostgresChangesPayload<T>) => {
      const newData = payload.new as T;
      const oldData = payload.old as T;

      setData(payload.eventType === 'DELETE' ? oldData : newData);
      setCurrentEvent(payload.eventType as RealtimeEvent);

      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(newData);
          break;
        case 'UPDATE':
          onUpdate?.(newData);
          break;
        case 'DELETE':
          onDelete?.(oldData);
          break;
      }
    };

    // Create channel subscription
    const channelConfig: Parameters<typeof supabase.channel>[1] = {
      config: {
        broadcast: { self: true },
      },
    };

    const channel = supabase.channel(`realtime:${table}`, channelConfig);

    // Build filter config
    const filterConfig = {
      event: event === '*' ? '*' : event.toLowerCase() as 'INSERT' | 'UPDATE' | 'DELETE' | '*',
      schema,
      table,
      ...(filter ? { filter } : {}),
    };

    channel
      .on(
        'postgres_changes' as never,
        filterConfig as never,
        handleChange as never
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError(new Error(`Failed to subscribe to ${table}`));
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, event, filter, schema, onInsert, onUpdate, onDelete]);

  return { data, event: currentEvent, isConnected, error };
}

/**
 * Hook for subscribing to multiple real-time events on a table
 */
export function useRealtimeMultiple<T extends Record<string, unknown>>(
  table: string,
  callbacks: {
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: T) => void;
    onDelete?: (payload: T) => void;
  },
  options: { filter?: string; schema?: string } = {}
): { isConnected: boolean; error: Error | null } {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { filter, schema = 'public' } = options;
    const { onInsert, onUpdate, onDelete } = callbacks;

    const handleChange = (payload: RealtimePostgresChangesPayload<T>) => {
      const newData = payload.new as T;
      const oldData = payload.old as T;

      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(newData);
          break;
        case 'UPDATE':
          onUpdate?.(newData);
          break;
        case 'DELETE':
          onDelete?.(oldData);
          break;
      }
    };

    const channel = supabase.channel(`realtime:${table}:all`);

    const filterConfig = {
      event: '*',
      schema,
      table,
      ...(filter ? { filter } : {}),
    };

    channel
      .on(
        'postgres_changes' as never,
        filterConfig as never,
        handleChange as never
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError(new Error(`Failed to subscribe to ${table}`));
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, callbacks, options]);

  return { isConnected, error };
}
