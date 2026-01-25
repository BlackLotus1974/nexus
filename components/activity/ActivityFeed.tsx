'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityItem, ActivityItemData } from './ActivityItem';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtime } from '@/lib/hooks/useRealtime';
import { createClient } from '@/lib/supabase/client';

interface ActivityFeedProps {
  organizationId?: string;
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

type ActivityFilter = 'all' | 'ai' | 'crm' | 'engagement' | 'donor';

/**
 * Activity Feed Component
 *
 * Displays a live feed of system activities with filtering and real-time updates.
 */
export function ActivityFeed({
  organizationId,
  limit = 20,
  showFilters = true,
  compact = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time activity updates
  const { data: realtimeActivity } = useRealtime<ActivityItemData>({
    table: 'activity_log',
    filter: organizationId ? `organization_id=eq.${organizationId}` : undefined,
    event: 'INSERT',
  });

  // Add new activity to the top of the list when received via realtime
  useEffect(() => {
    if (realtimeActivity) {
      setActivities((prev) => {
        // Check if activity already exists
        if (prev.some((a) => a.id === realtimeActivity.id)) {
          return prev;
        }
        // Add to top, respect filter
        if (filter !== 'all' && !matchesFilter(realtimeActivity.activity_type, filter)) {
          return prev;
        }
        return [realtimeActivity, ...prev].slice(0, limit);
      });
    }
  }, [realtimeActivity, filter, limit]);

  // Fetch activities
  const fetchActivities = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * limit, (pageNum + 1) * limit - 1);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (filter !== 'all') {
        const activityTypes = getActivityTypesForFilter(filter);
        query = query.in('activity_type', activityTypes);
      }

      const { data, error } = await query;

      if (error) throw error;

      const activityData = (data || []).map(mapActivityLogToItem);

      if (append) {
        setActivities((prev) => [...prev, ...activityData]);
      } else {
        setActivities(activityData);
      }

      setHasMore(activityData.length === limit);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, filter, limit]);

  // Initial fetch
  useEffect(() => {
    setPage(0);
    fetchActivities(0);
  }, [fetchActivities]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as ActivityFilter);
    setPage(0);
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'ai', label: 'AI Intelligence' },
    { value: 'crm', label: 'CRM Sync' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'donor', label: 'Donor Updates' },
  ];

  return (
    <Card className={compact ? 'p-4' : 'p-6'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
          Activity Feed
        </h2>
        {showFilters && (
          <Select
            value={filter}
            onChange={handleFilterChange}
            options={filterOptions}
            className="w-40"
          />
        )}
      </div>

      <div ref={containerRef} className="space-y-3">
        {isLoading && activities.length === 0 ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <ActivityItemSkeleton key={i} compact={compact} />
          ))
        ) : activities.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl mb-2">📭</div>
            <p className="text-gray-500">No activity yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Activities will appear here as you use Nexus
            </p>
          </div>
        ) : (
          // Activity list
          <>
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                compact={compact}
              />
            ))}

            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function ActivityItemSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className={`flex gap-3 ${compact ? 'py-2' : 'py-3'}`}>
      <Skeleton className="w-8 h-8 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function matchesFilter(activityType: string, filter: ActivityFilter): boolean {
  const activityTypes = getActivityTypesForFilter(filter);
  return activityTypes.includes(activityType);
}

function getActivityTypesForFilter(filter: ActivityFilter): string[] {
  switch (filter) {
    case 'ai':
      return [
        'ai_intelligence_generated',
        'ai_alignment_calculated',
        'ai_strategy_generated',
      ];
    case 'crm':
      return [
        'crm_connected',
        'crm_disconnected',
        'crm_sync_started',
        'crm_sync_completed',
        'crm_sync_failed',
        'crm_donor_synced',
        'crm_donation_synced',
      ];
    case 'engagement':
      return [
        'engagement_created',
        'engagement_completed',
        'email_sent',
        'call_logged',
        'meeting_scheduled',
      ];
    case 'donor':
      return [
        'donor_created',
        'donor_updated',
        'donor_searched',
        'donation_recorded',
      ];
    default:
      return [];
  }
}

function mapActivityLogToItem(log: Record<string, unknown>): ActivityItemData {
  return {
    id: log.id as string,
    activity_type: log.activity_type as string,
    entity_type: log.entity_type as string | null,
    entity_id: log.entity_id as string | null,
    metadata: log.metadata as Record<string, unknown> | null,
    user_id: log.user_id as string | null,
    created_at: log.created_at as string,
  };
}
