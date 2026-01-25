'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface NotificationListProps {
  notifications: NotificationData[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

/**
 * Notification List Component
 *
 * Displays a list of notifications in a dropdown.
 */
export function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationListProps) {
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-blue-600 hover:text-blue-800"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading skeletons
          <div className="p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          // Empty state
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-2">🔔</div>
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          // Notification items
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <Link
          href="/settings/notifications"
          onClick={onClose}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Notification settings
        </Link>
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
  const isUnread = !notification.read_at;
  const { icon, iconColor } = getNotificationIcon(notification.type);

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      onClose();
    }
  };

  const content = (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        isUnread ? 'bg-blue-50/50' : ''
      }`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${iconColor}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link}>
        {content}
      </Link>
    );
  }

  return content;
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function getNotificationIcon(type: string): { icon: string; iconColor: string } {
  const iconConfig: Record<string, { icon: string; iconColor: string }> = {
    ai_complete: { icon: '🤖', iconColor: 'bg-purple-100' },
    crm_sync: { icon: '🔄', iconColor: 'bg-blue-100' },
    crm_error: { icon: '⚠️', iconColor: 'bg-red-100' },
    donor_update: { icon: '👤', iconColor: 'bg-green-100' },
    project_update: { icon: '📁', iconColor: 'bg-indigo-100' },
    engagement_due: { icon: '📅', iconColor: 'bg-yellow-100' },
    alignment_found: { icon: '🎯', iconColor: 'bg-purple-100' },
    system: { icon: '💬', iconColor: 'bg-gray-100' },
    default: { icon: '🔔', iconColor: 'bg-gray-100' },
  };

  return iconConfig[type] || iconConfig.default;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
