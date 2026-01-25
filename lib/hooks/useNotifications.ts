/**
 * useNotifications Hook
 *
 * Manages notification data with real-time updates and CRUD operations.
 * Note: Uses type assertions since notifications table may not be in generated types.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from './useRealtime';
import type { NotificationData } from '@/components/notifications/NotificationList';

interface UseNotificationsOptions {
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing user notifications with real-time updates
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { limit = 50 } = options;

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to real-time notification updates
  const { data: newNotification } = useRealtime<NotificationData>({
    table: 'notifications',
    event: 'INSERT',
  });

  // Add new notification when received
  useEffect(() => {
    if (newNotification) {
      setNotifications((prev) => {
        // Check if notification already exists
        if (prev.some((n) => n.id === newNotification.id)) {
          return prev;
        }
        return [newNotification, ...prev].slice(0, limit);
      });
    }
  }, [newNotification, limit]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        return;
      }

      // Use type assertion for table that may not be in generated types
      const { data, error: fetchError } = await (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (column: string, value: string) => {
              order: (column: string, options: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: NotificationData[] | null; error: Error | null }>;
              };
            };
          };
        };
      }).from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setNotifications((data || []) as NotificationData[]);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const supabase = createClient();

      const { error: updateError } = await (supabase as unknown as {
        from: (table: string) => {
          update: (data: Record<string, unknown>) => {
            eq: (column: string, value: string) => Promise<{ error: Error | null }>;
          };
        };
      }).from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error: updateError } = await (supabase as unknown as {
        from: (table: string) => {
          update: (data: Record<string, unknown>) => {
            eq: (column: string, value: string) => {
              is: (column: string, value: null) => Promise<{ error: Error | null }>;
            };
          };
        };
      }).from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (updateError) throw updateError;

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}

/**
 * Create a notification
 */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await (supabase as unknown as {
    from: (table: string) => {
      insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }>;
    };
  }).from('notifications').insert({
    user_id: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    metadata: data.metadata,
  });

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await (supabase as unknown as {
    from: (table: string) => {
      delete: () => {
        eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      };
    };
  }).from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}
