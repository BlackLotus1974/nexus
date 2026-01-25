'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppSelector } from '@/store/hooks';
import {
  DonorStatsWidget,
  RecentActivityWidget,
  TopAlignmentsWidget,
  UpcomingTasksWidget,
} from '@/components/dashboard';

export default function DashboardPage() {
  const { profile, user } = useAppSelector((state) => state.auth);
  const { donors } = useAppSelector((state) => state.donor);
  const { projects } = useAppSelector((state) => state.project);

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here&apos;s what&apos;s happening with your fundraising efforts today.
          </p>
        </div>

        {/* Donor Stats Widget - Full width */}
        <DonorStatsWidget />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <Link href="/donors/new">
                  <Button variant="primary" fullWidth>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Add New Donor
                  </Button>
                </Link>
                <Link href="/projects/new">
                  <Button variant="secondary" fullWidth>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Project
                  </Button>
                </Link>
                <Link href="/crm">
                  <Button variant="secondary" fullWidth>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Manage CRM
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Recent Activity Widget */}
          <div className="lg:col-span-2">
            <RecentActivityWidget />
          </div>
        </div>

        {/* Second Row - Alignments and Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopAlignmentsWidget />
          <UpcomingTasksWidget />
        </div>

        {/* Empty State for new users */}
        {donors.length === 0 && projects.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Get Started with Nexus
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Start by adding your first donor or creating a project. Our AI will help you discover insights and connections.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/donors/new">
                    <Button variant="primary">
                      Add Your First Donor
                    </Button>
                  </Link>
                  <Button variant="secondary">
                    View Tutorial
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
