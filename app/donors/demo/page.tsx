'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  DonorSearch,
  IntelligenceBrief,
  DonorList,
  DonorListSkeleton,
  IntelligenceBriefSkeleton,
} from '@/components/donor';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Donor } from '@/types';

// Sample data for demonstration
const sampleDonors: Donor[] = [
  {
    id: '1',
    organizationId: 'demo-org',
    name: 'Jane Smith',
    location: 'San Francisco, CA',
    intelligenceData: {
      background: 'Technology entrepreneur and philanthropist with a focus on education and environmental causes. Founded two successful startups and has been actively involved in non-profit boards for over 10 years.',
      interests: ['Education', 'Environmental Conservation', 'Technology Access', 'Women in STEM'],
      givingHistory: [
        { organization: 'Tech for Good Foundation', amount: 50000, date: '2023-11', cause: 'Technology Education' },
        { organization: 'Green Earth Alliance', amount: 25000, date: '2023-06', cause: 'Environmental Conservation' },
        { organization: 'Girls Who Code', amount: 15000, date: '2023-03', cause: 'STEM Education' },
      ],
      connections: [
        { name: 'John Doe', relationship: 'Co-founder at TechStart', source: 'linkedin' },
        { name: 'Sarah Johnson', relationship: 'Board member at Education First', source: 'email' },
        { name: 'Mike Chen', relationship: 'Fellow at Innovation Lab', source: 'linkedin' },
      ],
      publicProfile: {
        linkedin: 'https://linkedin.com/in/janesmith',
        twitter: 'https://twitter.com/janesmith',
        website: 'https://janesmith.com',
        bio: 'Technology entrepreneur passionate about using innovation to solve social problems. Board member at multiple education-focused non-profits.',
      },
    },
    lastUpdated: new Date('2024-01-15'),
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '2',
    organizationId: 'demo-org',
    name: 'Robert Johnson',
    location: 'New York, NY',
    intelligenceData: {
      background: 'Finance executive with strong ties to healthcare and medical research philanthropy.',
      interests: ['Healthcare', 'Medical Research', 'Youth Development'],
      givingHistory: [
        { organization: 'City Hospital Foundation', amount: 100000, date: '2023-12', cause: 'Medical Research' },
        { organization: 'Youth Opportunity Fund', amount: 30000, date: '2023-08', cause: 'Youth Programs' },
      ],
      connections: [
        { name: 'Dr. Emily White', relationship: 'Hospital Board Member', source: 'public' },
        { name: 'James Miller', relationship: 'Investment Partner', source: 'linkedin' },
      ],
      publicProfile: {
        linkedin: 'https://linkedin.com/in/robertjohnson',
        bio: 'Finance professional dedicated to improving healthcare access and supporting medical research initiatives.',
      },
    },
    lastUpdated: new Date('2024-01-14'),
    createdAt: new Date('2024-01-05'),
  },
  {
    id: '3',
    organizationId: 'demo-org',
    name: 'Maria Garcia',
    location: 'Austin, TX',
    intelligenceData: {},
    lastUpdated: new Date('2024-01-12'),
    createdAt: new Date('2024-01-12'),
  },
];

export default function DonorDemoPage() {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(sampleDonors[0]);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [recentSearches] = useState(['Jane Smith', 'Robert Johnson', 'Maria Garcia']);

  const handleSearch = (name: string, location?: string) => {
    console.log('Search:', name, location);
    alert(`Searching for: ${name}${location ? ` in ${location}` : ''}`);
  };

  const handleDonorClick = (donor: Donor) => {
    setSelectedDonor(donor);
  };

  const handleExportPDF = () => {
    alert('PDF export functionality would be implemented here');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Donor Components Demo
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Interactive demonstration of all donor search and intelligence components
          </p>
        </div>

        {/* Component Toggles */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Demo Controls</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showSkeleton}
                  onChange={(e) => setShowSkeleton(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show Skeleton Loaders
                </span>
              </label>
            </div>
          </CardBody>
        </Card>

        {/* Donor Search Component */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              DonorSearch Component
              <Badge variant="info" size="sm">Core Feature</Badge>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Search form with validation, recent searches, and loading states
            </p>
          </div>
          <DonorSearch
            onSearch={handleSearch}
            recentSearches={recentSearches}
            onRecentSearchClick={(name) => alert(`Clicked recent search: ${name}`)}
            onClearHistory={() => alert('Clear history clicked')}
          />
        </div>

        {/* Intelligence Brief Component */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              IntelligenceBrief Component
              <Badge variant="info" size="sm">Core Feature</Badge>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Displays AI-generated donor insights with collapsible sections
            </p>
          </div>

          {showSkeleton ? (
            <IntelligenceBriefSkeleton />
          ) : selectedDonor ? (
            <IntelligenceBrief
              donor={selectedDonor}
              onExportPDF={handleExportPDF}
            />
          ) : (
            <Card>
              <p className="text-gray-500 dark:text-gray-400">
                Select a donor to view their intelligence brief
              </p>
            </Card>
          )}
        </div>

        {/* Donor List Component */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              DonorList Component
              <Badge variant="info" size="sm">Core Feature</Badge>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Table/grid view with sorting, filtering, and bulk actions
            </p>
          </div>

          {showSkeleton ? (
            <DonorListSkeleton />
          ) : (
            <DonorList
              donors={sampleDonors}
              onDonorClick={handleDonorClick}
              onDeleteDonor={(id) => alert(`Delete donor: ${id}`)}
            />
          )}
        </div>

        {/* Component Features */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Component Features</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  DonorSearch
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>✓ Name and location input fields</li>
                  <li>✓ Form validation (min 2 characters)</li>
                  <li>✓ Loading states with spinner</li>
                  <li>✓ Recent search history (last 5)</li>
                  <li>✓ Clickable recent searches</li>
                  <li>✓ Clear history button</li>
                  <li>✓ Responsive design</li>
                  <li>✓ Icon integration</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  IntelligenceBrief
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>✓ Collapsible sections</li>
                  <li>✓ Overview & background</li>
                  <li>✓ Cause interests with badges</li>
                  <li>✓ Donation history timeline</li>
                  <li>✓ Connections & network</li>
                  <li>✓ Public profile links</li>
                  <li>✓ Copy-to-clipboard functionality</li>
                  <li>✓ Export PDF button</li>
                  <li>✓ Empty state handling</li>
                  <li>✓ Data source indicators</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  DonorList
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>✓ Table and grid view modes</li>
                  <li>✓ Sortable columns (name, location, date)</li>
                  <li>✓ Status filtering (all, complete, pending, failed)</li>
                  <li>✓ Checkbox selection (single & bulk)</li>
                  <li>✓ Status badges (complete/pending/failed)</li>
                  <li>✓ Row actions (view, delete)</li>
                  <li>✓ Empty state message</li>
                  <li>✓ Responsive layout</li>
                  <li>✓ Hover effects</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Loading States
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>✓ DonorListSkeleton - Table skeleton</li>
                  <li>✓ DonorGridSkeleton - Grid skeleton</li>
                  <li>✓ IntelligenceBriefSkeleton - Brief skeleton</li>
                  <li>✓ Shimmer animation effect</li>
                  <li>✓ Matches component structure</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Integration Notes */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Integration Guidelines</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold mb-2">Redux Integration</h3>
                <p>Components integrate with donorSlice for state management:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>searchHistory - Stored in Redux and localStorage</li>
                  <li>selectedDonor - Active donor for detail view</li>
                  <li>Async thunks for CRUD operations</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">React Query Integration</h3>
                <p>Data fetching via custom hooks:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>useDonors() - Fetch all donors</li>
                  <li>useDonor(id) - Fetch single donor</li>
                  <li>useCreateDonor() - Create new donor</li>
                  <li>useUpdateDonor() - Update donor data</li>
                  <li>useDeleteDonor() - Delete donor</li>
                  <li>Automatic caching and refetching</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Type Safety</h3>
                <p>All components use TypeScript interfaces from types/index.ts:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Donor - Core donor type</li>
                  <li>IntelligenceData - AI-generated insights</li>
                  <li>Component prop interfaces</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
