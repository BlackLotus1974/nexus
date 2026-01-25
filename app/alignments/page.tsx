'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { TopAlignmentsWidget } from '@/components/dashboard';

export default function AlignmentsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Donor-Project Alignments
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered matching of donors with projects based on interests, values, and giving history.
          </p>
        </div>

        {/* Top Alignments Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopAlignmentsWidget />

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                How Alignments Work
              </h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <div>
                    <p className="font-medium text-gray-900">Analyze Donor Interests</p>
                    <p className="text-sm text-gray-500">
                      AI reviews giving history, stated interests, and engagement patterns
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <div>
                    <p className="font-medium text-gray-900">Match with Projects</p>
                    <p className="text-sm text-gray-500">
                      Projects are scored based on alignment with donor values and goals
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <div>
                    <p className="font-medium text-gray-900">Generate Talking Points</p>
                    <p className="text-sm text-gray-500">
                      AI creates personalized conversation starters for each match
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">4️⃣</span>
                  <div>
                    <p className="font-medium text-gray-900">Track Engagement</p>
                    <p className="text-sm text-gray-500">
                      Monitor interactions and outcomes to improve future recommendations
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Total Alignments</p>
            </div>
          </Card>
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">0%</p>
              <p className="text-sm text-gray-500">Avg. Score (80%+)</p>
            </div>
          </Card>
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-500">Active Projects</p>
            </div>
          </Card>
          <Card hover>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-500">Donors Matched</p>
            </div>
          </Card>
        </div>

        {/* Empty State */}
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">🎯</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Alignments Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Add donors and create projects to generate AI-powered alignment recommendations.
                The system will analyze interests and suggest the best matches.
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href="/donors"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Donors
                </a>
                <a
                  href="/projects"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Create Projects
                </a>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
