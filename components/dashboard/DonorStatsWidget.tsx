'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

interface DonorStats {
  totalDonors: number;
  newThisMonth: number;
  totalGiving: number;
  activeRelationships: number;
}

/**
 * Donor Stats Widget
 *
 * Displays key donor statistics for the dashboard.
 */
export function DonorStatsWidget() {
  const [stats, setStats] = useState<DonorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const supabase = createClient();

        // Get total donors
        const { count: totalDonors } = await supabase
          .from('donors')
          .select('*', { count: 'exact', head: true });

        // Get donors created this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: newThisMonth } = await supabase
          .from('donors')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString());

        // Get total giving (sum from intelligence_data)
        const { data: donorsWithGiving } = await supabase
          .from('donors')
          .select('intelligence_data');

        let totalGiving = 0;
        if (donorsWithGiving) {
          for (const donor of donorsWithGiving) {
            const data = donor.intelligence_data as Record<string, unknown> | null;
            if (data?.totalGiving) {
              totalGiving += Number(data.totalGiving) || 0;
            }
          }
        }

        // Get active relationships count
        const { count: activeRelationships } = await supabase
          .from('relationships')
          .select('*', { count: 'exact', head: true })
          .gte('strength_score', 50);

        setStats({
          totalDonors: totalDonors || 0,
          newThisMonth: newThisMonth || 0,
          totalGiving,
          activeRelationships: activeRelationships || 0,
        });
      } catch (error) {
        console.error('Error fetching donor stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const statItems = [
    {
      label: 'Total Donors',
      value: stats?.totalDonors || 0,
      format: 'number',
      icon: '👥',
    },
    {
      label: 'New This Month',
      value: stats?.newThisMonth || 0,
      format: 'number',
      icon: '✨',
      trend: stats?.newThisMonth && stats.newThisMonth > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Total Giving',
      value: stats?.totalGiving || 0,
      format: 'currency',
      icon: '💰',
    },
    {
      label: 'Active Relationships',
      value: stats?.activeRelationships || 0,
      format: 'number',
      icon: '🤝',
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Donor Overview</h3>
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{item.icon}</span>
              <span className="text-2xl font-bold text-gray-900">
                {item.format === 'currency'
                  ? `$${item.value.toLocaleString()}`
                  : item.value.toLocaleString()}
              </span>
              {item.trend === 'up' && (
                <span className="text-green-500 text-sm">↑</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
