'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface DonorSearchProps {
  onSearch: (name: string, location?: string) => void;
  loading?: boolean;
  recentSearches?: string[];
  onRecentSearchClick?: (name: string) => void;
  onClearHistory?: () => void;
}

export function DonorSearch({
  onSearch,
  loading = false,
  recentSearches = [],
  onRecentSearchClick,
  onClearHistory,
}: DonorSearchProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Donor name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSearch(name.trim(), location.trim() || undefined);
    }
  };

  const handleReset = () => {
    setName('');
    setLocation('');
    setErrors({});
  };

  const handleRecentSearchClick = (searchName: string) => {
    setName(searchName);
    setLocation('');
    setErrors({});
    if (onRecentSearchClick) {
      onRecentSearchClick(searchName);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Donor Name"
              placeholder="Enter donor name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors({ ...errors, name: undefined });
                }
              }}
              error={errors.name}
              fullWidth
              required
              disabled={loading}
              leftIcon={
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />

            <Input
              label="Location (Optional)"
              placeholder="City, State, or Country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
              disabled={loading}
              leftIcon={
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
              className="flex-1 md:flex-initial"
            >
              {loading ? 'Generating Intelligence...' : 'Search Donor'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </form>
      </Card>

      {recentSearches.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recent Searches
            </h3>
            {onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={loading}
              >
                Clear History
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {recentSearches.map((searchName, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleRecentSearchClick(searchName)}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {searchName}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
