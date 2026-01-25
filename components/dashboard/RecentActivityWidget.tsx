'use client';

import { Card } from '@/components/ui/Card';
import { ActivityFeed } from '@/components/activity/ActivityFeed';

/**
 * Recent Activity Widget
 *
 * Compact activity feed for the dashboard.
 */
export function RecentActivityWidget() {
  return (
    <div>
      <ActivityFeed
        limit={5}
        showFilters={false}
        compact={true}
      />
    </div>
  );
}
