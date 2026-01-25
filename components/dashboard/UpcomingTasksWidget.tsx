'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

interface TaskData {
  id: string;
  donor_id: string;
  donor_name: string;
  task_type: string;
  due_date: string;
  status: string;
}

/**
 * Upcoming Tasks Widget
 *
 * Shows upcoming follow-ups and scheduled engagements.
 */
export function UpcomingTasksWidget() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const supabase = createClient();

        // Get recent activities that might have follow-up dates
        const { data: activities } = await supabase
          .from('activity_log')
          .select('*')
          .in('activity_type', ['engagement_created', 'meeting_scheduled', 'call_logged'])
          .order('created_at', { ascending: false })
          .limit(10);

        // For now, create mock follow-up tasks based on activity data
        // In a full implementation, there would be a dedicated tasks/engagements table
        const mockTasks: TaskData[] = [];

        if (activities && activities.length > 0) {
          for (const activity of activities.slice(0, 5)) {
            const metadata = activity.metadata as Record<string, unknown> | null;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7) + 1);

            mockTasks.push({
              id: activity.id,
              donor_id: activity.entity_id || '',
              donor_name: (metadata?.donor_name as string) || 'Unknown Donor',
              task_type: activity.activity_type.replace(/_/g, ' '),
              due_date: dueDate.toISOString(),
              status: 'pending',
            });
          }
        }

        setTasks(mockTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, []);

  const getTaskIcon = (type: string) => {
    if (type.includes('email')) return '📧';
    if (type.includes('call')) return '📞';
    if (type.includes('meeting')) return '📅';
    return '✅';
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return `In ${diffDays} days`;
    }

    return date.toLocaleDateString();
  };

  const getDueBadgeColor = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'destructive';
    if (diffDays <= 2) return 'warning';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded" />
                <div>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Follow-ups</h3>
        <span className="text-2xl">📋</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500">No upcoming tasks</p>
          <p className="text-sm text-gray-400 mt-1">
            Schedule engagements to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={task.donor_id ? `/donors/${task.donor_id}` : '#'}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">
                  {getTaskIcon(task.task_type)}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {task.donor_name}
                  </p>
                  <p className="text-sm text-gray-500 capitalize truncate">
                    {task.task_type}
                  </p>
                </div>
              </div>
              <Badge variant={getDueBadgeColor(task.due_date)}>
                {formatDueDate(task.due_date)}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/engagements"
        className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-4"
      >
        View all tasks →
      </Link>
    </Card>
  );
}
