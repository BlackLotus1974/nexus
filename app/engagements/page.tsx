'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { UpcomingTasksWidget } from '@/components/dashboard';
import { EngagementTracker } from '@/components/engagement';

export default function EngagementsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Engagements
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage all donor interactions and follow-ups.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Tasks */}
          <UpcomingTasksWidget />

          {/* Engagement Tracker */}
          <div className="lg:col-span-2">
            <EngagementTracker limit={15} showFilters={true} />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Total Engagements</p>
            </div>
          </Card>
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-500">This Week</p>
            </div>
          </Card>
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">0</p>
              <p className="text-sm text-gray-500">Pending Follow-ups</p>
            </div>
          </Card>
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">0%</p>
              <p className="text-sm text-gray-500">Response Rate</p>
            </div>
          </Card>
        </div>

        {/* Empty State if no engagements */}
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">📋</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Start Tracking Engagements
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Log your donor interactions to build a complete engagement history.
                Track calls, meetings, emails, and events all in one place.
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Log First Engagement
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
