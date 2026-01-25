'use client';

import Link from 'next/link';

export interface ActivityItemData {
  id: string;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
  [key: string]: unknown; // Index signature for compatibility with useRealtime
}

interface ActivityItemProps {
  activity: ActivityItemData;
  compact?: boolean;
}

/**
 * Activity Item Component
 *
 * Renders a single activity log entry with appropriate icon and formatting.
 */
export function ActivityItem({ activity, compact = false }: ActivityItemProps) {
  const { icon, color, label, description } = getActivityDisplay(activity);
  const timeAgo = formatTimeAgo(activity.created_at);

  return (
    <div className={`flex gap-3 ${compact ? 'py-2' : 'py-3'} hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors`}>
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${color as string}`}
      >
        {icon as string}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`${compact ? 'text-sm' : 'text-base'} text-gray-900`}>
          <span className="font-medium">{label as string}</span>
          {activity.entity_id && activity.entity_type && (
            <Link
              href={getEntityLink(activity.entity_type, activity.entity_id)}
              className="ml-1 text-blue-600 hover:text-blue-800 hover:underline"
            >
              {getEntityDisplayName(activity)}
            </Link>
          )}
        </div>
        {description && (
          <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'} truncate`}>
            {description as string}
          </p>
        )}
        <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-xs'} mt-0.5`}>
          {timeAgo}
        </p>
      </div>

      {/* Status indicator for certain activity types */}
      {activity.metadata?.status && (
        <div className="flex-shrink-0">
          <StatusBadge status={activity.metadata.status as string} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    success: { color: 'bg-green-100 text-green-700', label: 'Success' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
    error: { color: 'bg-red-100 text-red-700', label: 'Error' },
    pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    in_progress: { color: 'bg-blue-100 text-blue-700', label: 'In Progress' },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

interface ActivityDisplay {
  icon: string;
  color: string;
  label: string;
  description?: string;
}

function getActivityDisplay(activity: ActivityItemData): ActivityDisplay {
  const metadata = activity.metadata || {};

  const activityConfig: Record<string, ActivityDisplay> = {
    // AI Activities
    ai_intelligence_generated: {
      icon: '🤖',
      color: 'bg-purple-100',
      label: 'AI Intelligence generated for',
      description: metadata.provider ? `Using ${metadata.provider}` : undefined,
    },
    ai_alignment_calculated: {
      icon: '🎯',
      color: 'bg-purple-100',
      label: 'Donor-project alignment calculated',
      description: metadata.score ? `Score: ${metadata.score}%` : undefined,
    },
    ai_strategy_generated: {
      icon: '💡',
      color: 'bg-purple-100',
      label: 'Engagement strategy generated for',
    },

    // CRM Activities
    crm_connected: {
      icon: '🔗',
      color: 'bg-green-100',
      label: `${metadata.provider || 'CRM'} connected`,
    },
    crm_disconnected: {
      icon: '🔌',
      color: 'bg-gray-100',
      label: `${metadata.provider || 'CRM'} disconnected`,
    },
    crm_sync_started: {
      icon: '🔄',
      color: 'bg-blue-100',
      label: `${metadata.provider || 'CRM'} sync started`,
    },
    crm_sync_completed: {
      icon: '✅',
      color: 'bg-green-100',
      label: `${metadata.provider || 'CRM'} sync completed`,
      description: metadata.stats
        ? `${(metadata.stats as { totalProcessed?: number }).totalProcessed || 0} records processed`
        : undefined,
    },
    crm_sync_failed: {
      icon: '❌',
      color: 'bg-red-100',
      label: `${metadata.provider || 'CRM'} sync failed`,
      description: (metadata.error as { message?: string })?.message,
    },
    crm_donor_synced: {
      icon: '👤',
      color: 'bg-blue-100',
      label: 'Donor synced from CRM',
    },
    crm_donation_synced: {
      icon: '💰',
      color: 'bg-blue-100',
      label: 'Donation synced from CRM',
    },

    // Engagement Activities
    engagement_created: {
      icon: '📝',
      color: 'bg-indigo-100',
      label: 'Engagement logged',
      description: metadata.type ? `Type: ${metadata.type}` : undefined,
    },
    engagement_completed: {
      icon: '✔️',
      color: 'bg-green-100',
      label: 'Engagement completed',
    },
    email_sent: {
      icon: '📧',
      color: 'bg-blue-100',
      label: 'Email sent to',
    },
    call_logged: {
      icon: '📞',
      color: 'bg-blue-100',
      label: 'Call logged for',
    },
    meeting_scheduled: {
      icon: '📅',
      color: 'bg-blue-100',
      label: 'Meeting scheduled with',
    },

    // Donor Activities
    donor_created: {
      icon: '➕',
      color: 'bg-green-100',
      label: 'Donor created',
    },
    donor_updated: {
      icon: '✏️',
      color: 'bg-yellow-100',
      label: 'Donor updated',
    },
    donor_searched: {
      icon: '🔍',
      color: 'bg-gray-100',
      label: 'Donor searched',
      description: metadata.query ? `Query: ${metadata.query}` : undefined,
    },
    donation_recorded: {
      icon: '💵',
      color: 'bg-green-100',
      label: 'Donation recorded',
      description: metadata.amount ? `Amount: $${metadata.amount}` : undefined,
    },

    // Project Activities
    project_created: {
      icon: '📁',
      color: 'bg-blue-100',
      label: 'Project created',
    },
    project_updated: {
      icon: '📝',
      color: 'bg-yellow-100',
      label: 'Project updated',
    },

    // Default
    default: {
      icon: '📌',
      color: 'bg-gray-100',
      label: activity.activity_type.replace(/_/g, ' '),
    },
  };

  return activityConfig[activity.activity_type] || activityConfig.default;
}

function getEntityLink(entityType: string, entityId: string): string {
  const links: Record<string, string> = {
    donor: `/donors/${entityId}`,
    project: `/projects/${entityId}`,
    crm_integration: `/crm`,
    engagement: `/engagements/${entityId}`,
  };
  return links[entityType] || '#';
}

function getEntityDisplayName(activity: ActivityItemData): string {
  const metadata = activity.metadata || {};

  // Try to get a display name from metadata
  if (metadata.donor_name) return metadata.donor_name as string;
  if (metadata.project_name) return metadata.project_name as string;
  if (metadata.name) return metadata.name as string;

  // Fall back to entity ID (truncated)
  if (activity.entity_id) {
    return activity.entity_id.length > 8
      ? `${activity.entity_id.slice(0, 8)}...`
      : activity.entity_id;
  }

  return '';
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
