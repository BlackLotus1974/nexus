'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

interface Engagement {
  id: string;
  donor_id: string;
  donor_name?: string;
  project_id?: string;
  project_name?: string;
  type: 'email' | 'call' | 'meeting' | 'event' | 'letter' | 'other';
  status: 'planned' | 'completed' | 'cancelled' | 'rescheduled';
  scheduled_date?: string;
  completed_date?: string;
  notes?: string;
  outcome?: string;
  follow_up_date?: string;
  created_by?: string;
  created_at: string;
}

interface EngagementTrackerProps {
  donorId?: string;
  projectId?: string;
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

/**
 * Engagement Tracker Component
 *
 * Displays and manages donor engagements with filtering and status tracking.
 */
export function EngagementTracker({
  donorId,
  projectId,
  limit = 10,
  showFilters = true,
  compact = false,
}: EngagementTrackerProps) {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Engagement['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Engagement['type'] | 'all'>('all');

  useEffect(() => {
    async function fetchEngagements() {
      try {
        const supabase = createClient();

        // For now, use activity_log as a proxy for engagements
        // In production, there would be a dedicated engagements table
        let query = supabase
          .from('activity_log')
          .select('*')
          .in('activity_type', [
            'engagement_created',
            'meeting_scheduled',
            'call_logged',
            'email_sent',
          ])
          .order('created_at', { ascending: false })
          .limit(limit);

        if (donorId) {
          query = query.eq('entity_id', donorId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Transform activity_log entries to engagement format
        const mapped: Engagement[] = (data || []).map((item) => {
          const metadata = item.metadata as Record<string, unknown> | null;
          return {
            id: item.id,
            donor_id: item.entity_id || '',
            donor_name: metadata?.donor_name as string | undefined,
            project_id: metadata?.project_id as string | undefined,
            project_name: metadata?.project_name as string | undefined,
            type: (metadata?.engagement_type as Engagement['type']) || 'other',
            status: (metadata?.status as Engagement['status']) || 'completed',
            scheduled_date: metadata?.scheduled_date as string | undefined,
            completed_date: metadata?.completed_date as string | undefined,
            notes: metadata?.notes as string | undefined,
            outcome: metadata?.outcome as string | undefined,
            follow_up_date: metadata?.follow_up_date as string | undefined,
            created_at: item.created_at || new Date().toISOString(),
          };
        });

        setEngagements(mapped);
      } catch (error) {
        console.error('Error fetching engagements:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEngagements();
  }, [donorId, projectId, limit]);

  const filteredEngagements = engagements.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    return true;
  });

  const getTypeIcon = (type: Engagement['type']) => {
    const icons: Record<Engagement['type'], string> = {
      email: '📧',
      call: '📞',
      meeting: '🤝',
      event: '🎉',
      letter: '✉️',
      other: '📌',
    };
    return icons[type];
  };

  const getStatusColor = (status: Engagement['status']) => {
    const colors: Record<Engagement['status'], string> = {
      planned: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rescheduled: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <Card className={compact ? 'p-4' : 'p-6'}>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'p-4' : 'p-6'}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
          Engagement History
        </h3>
        <Button variant="primary" size="sm">
          + Log Engagement
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="event">Event</option>
            <option value="letter">Letter</option>
          </select>
        </div>
      )}

      {filteredEngagements.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl mb-2 block">📋</span>
          <p className="text-gray-500">No engagements recorded yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Log your first engagement to start tracking
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEngagements.map((engagement) => (
            <div
              key={engagement.id}
              className={`flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                compact ? 'p-2' : 'p-3'
              }`}
            >
              <span className={`flex-shrink-0 ${compact ? 'text-lg' : 'text-xl'}`}>
                {getTypeIcon(engagement.type)}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(engagement.status)}>
                    {engagement.status}
                  </Badge>
                  <span className="text-sm text-gray-500 capitalize">
                    {engagement.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(engagement.created_at)}
                  </span>
                </div>

                {engagement.donor_name && !donorId && (
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {engagement.donor_name}
                  </p>
                )}

                {engagement.notes && (
                  <p className={`text-gray-600 mt-1 ${compact ? 'text-xs line-clamp-1' : 'text-sm'}`}>
                    {engagement.notes}
                  </p>
                )}

                {engagement.outcome && !compact && (
                  <p className="text-sm text-green-600 mt-1">
                    Outcome: {engagement.outcome}
                  </p>
                )}

                {engagement.follow_up_date && (
                  <p className="text-xs text-blue-600 mt-1">
                    Follow-up: {formatDate(engagement.follow_up_date)}
                  </p>
                )}
              </div>

              {!compact && (
                <Button variant="secondary" size="sm">
                  View
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredEngagements.length >= limit && (
        <button className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 mt-4">
          View all engagements
        </button>
      )}
    </Card>
  );
}
