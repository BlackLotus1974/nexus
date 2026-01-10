'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Donor } from '@/types';

export interface DonorListProps {
  donors: Donor[];
  onDonorClick: (donor: Donor) => void;
  onDeleteDonor?: (donorId: string) => void;
  loading?: boolean;
  className?: string;
}

type ViewMode = 'table' | 'grid';
type SortField = 'name' | 'location' | 'lastUpdated';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'complete' | 'pending' | 'failed';

function getIntelligenceStatus(donor: Donor): 'complete' | 'pending' | 'failed' {
  if (!donor.intelligenceData || Object.keys(donor.intelligenceData).length === 0) {
    return 'pending';
  }
  // Check if intelligence data has substantial content
  const hasContent = donor.intelligenceData.background ||
    (donor.intelligenceData.interests && donor.intelligenceData.interests.length > 0) ||
    (donor.intelligenceData.givingHistory && donor.intelligenceData.givingHistory.length > 0);

  return hasContent ? 'complete' : 'pending';
}

function StatusBadge({ status }: { status: 'complete' | 'pending' | 'failed' }) {
  const variants = {
    complete: { variant: 'success' as const, label: 'Complete' },
    pending: { variant: 'warning' as const, label: 'Pending' },
    failed: { variant: 'danger' as const, label: 'Failed' },
  };

  const { variant, label } = variants[status];

  return <Badge variant={variant} size="sm">{label}</Badge>;
}

export function DonorList({
  donors,
  onDonorClick,
  onDeleteDonor,
  loading = false,
  className = '',
}: DonorListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedDonors, setSelectedDonors] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedDonors = React.useMemo(() => {
    let filtered = donors;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(donor => getIntelligenceStatus(donor) === filterStatus);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'location':
          aValue = (a.location || '').toLowerCase();
          bValue = (b.location || '').toLowerCase();
          break;
        case 'lastUpdated':
          aValue = new Date(a.lastUpdated).getTime();
          bValue = new Date(b.lastUpdated).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [donors, sortField, sortOrder, filterStatus]);

  const toggleDonorSelection = (donorId: string) => {
    const newSelected = new Set(selectedDonors);
    if (newSelected.has(donorId)) {
      newSelected.delete(donorId);
    } else {
      newSelected.add(donorId);
    }
    setSelectedDonors(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDonors.size === filteredAndSortedDonors.length) {
      setSelectedDonors(new Set());
    } else {
      setSelectedDonors(new Set(filteredAndSortedDonors.map(d => d.id)));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (filteredAndSortedDonors.length === 0 && !loading) {
    return (
      <Card className={className}>
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No donors found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filterStatus !== 'all' ? 'Try changing your filter criteria' : 'Get started by searching for a donor'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('table')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('grid')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </Button>

          <div className="ml-4 flex items-center gap-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">Filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="complete">Complete</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedDonors.size > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDonors.size} selected
            </div>
          )}
          {selectedDonors.size > 0 && (
            <Button size="sm" variant="secondary">
              Export Selected
            </Button>
          )}
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedDonors.size === filteredAndSortedDonors.length && filteredAndSortedDonors.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center gap-2">
                      Location
                      <SortIcon field="location" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('lastUpdated')}
                  >
                    <div className="flex items-center gap-2">
                      Last Updated
                      <SortIcon field="lastUpdated" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedDonors.map((donor) => (
                  <tr
                    key={donor.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => onDonorClick(donor)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedDonors.has(donor.id)}
                        onChange={() => toggleDonorSelection(donor.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {donor.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {donor.location || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(donor.lastUpdated).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={getIntelligenceStatus(donor)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDonorClick(donor)}
                      >
                        View
                      </Button>
                      {onDeleteDonor && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteDonor(donor.id)}
                          className="ml-2 text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedDonors.map((donor) => (
            <Card
              key={donor.id}
              hover
              className="cursor-pointer"
              onClick={() => onDonorClick(donor)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedDonors.has(donor.id)}
                    onChange={() => toggleDonorSelection(donor.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {donor.name}
                  </h3>
                </div>
                <StatusBadge status={getIntelligenceStatus(donor)} />
              </div>

              {donor.location && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-2">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {donor.location}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Updated {new Date(donor.lastUpdated).toLocaleDateString()}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDonorClick(donor);
                  }}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
