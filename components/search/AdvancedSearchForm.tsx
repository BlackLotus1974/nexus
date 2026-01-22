'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface AdvancedSearchFilters {
  query?: string;
  location?: string;
  givingLevels?: string[];
  donorTypes?: string[];
  minTotalGiving?: number;
  maxTotalGiving?: number;
  lastContactAfter?: Date;
  lastContactBefore?: Date;
  lastDonationAfter?: Date;
  lastDonationBefore?: Date;
  tags?: string[];
  projectId?: string;
  minAlignmentScore?: number;
}

export interface AdvancedSearchFormProps {
  onSearch: (filters: AdvancedSearchFilters) => void;
  onClear: () => void;
  loading?: boolean;
  projects?: Array<{ id: string; name: string }>;
  availableTags?: string[];
  initialFilters?: AdvancedSearchFilters;
  className?: string;
}

const GIVING_LEVELS = [
  { value: 'major', label: 'Major Donor' },
  { value: 'mid-level', label: 'Mid-Level' },
  { value: 'emerging', label: 'Emerging' },
  { value: 'new', label: 'New' },
  { value: 'lapsed', label: 'Lapsed' },
];

const DONOR_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'organization', label: 'Organization' },
  { value: 'foundation', label: 'Foundation' },
];

export function AdvancedSearchForm({
  onSearch,
  onClear,
  loading = false,
  projects = [],
  availableTags = [],
  initialFilters = {},
  className = '',
}: AdvancedSearchFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters);
  const [tagInput, setTagInput] = useState('');

  const updateFilter = useCallback(<K extends keyof AdvancedSearchFilters>(
    key: K,
    value: AdvancedSearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback(<K extends keyof AdvancedSearchFilters>(
    key: K,
    value: string
  ) => {
    setFilters(prev => {
      const currentArray = (prev[key] as string[] | undefined) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray.length > 0 ? newArray : undefined };
    });
  }, []);

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;

    setFilters(prev => {
      const currentTags = prev.tags || [];
      if (currentTags.includes(trimmedTag)) return prev;
      return { ...prev, tags: [...currentTags, trimmedTag] };
    });
    setTagInput('');
  }, []);

  const removeTag = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag),
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({});
    setTagInput('');
    onClear();
  };

  const activeFilterCount = Object.values(filters).filter(
    v => v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseDateFromInput = (value: string): Date | undefined => {
    if (!value) return undefined;
    return new Date(value);
  };

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit}>
        {/* Main Search Bar */}
        <div className="flex gap-3">
          <Input
            placeholder="Search donors by name, notes, or tags..."
            value={filters.query || ''}
            onChange={(e) => updateFilter('query', e.target.value || undefined)}
            fullWidth
            disabled={loading}
            leftIcon={
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <Button type="submit" variant="primary" loading={loading} disabled={loading}>
            Search
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <svg
              className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="ml-2">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="info" size="sm" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="mt-6 space-y-6">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <Input
                placeholder="City, State, or Country"
                value={filters.location || ''}
                onChange={(e) => updateFilter('location', e.target.value || undefined)}
                fullWidth
                disabled={loading}
                leftIcon={
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                }
              />
            </div>

            {/* Giving Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Giving Level
              </label>
              <div className="flex flex-wrap gap-2">
                {GIVING_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => toggleArrayFilter('givingLevels', level.value)}
                    disabled={loading}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      filters.givingLevels?.includes(level.value)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } disabled:opacity-50`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Donor Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Donor Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DONOR_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleArrayFilter('donorTypes', type.value)}
                    disabled={loading}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      filters.donorTypes?.includes(type.value)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } disabled:opacity-50`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Giving Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Giving Range
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={filters.minTotalGiving?.toString() || ''}
                  onChange={(e) => updateFilter('minTotalGiving', e.target.value ? parseFloat(e.target.value) : undefined)}
                  fullWidth
                  disabled={loading}
                  leftIcon={<span className="text-gray-400">$</span>}
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={filters.maxTotalGiving?.toString() || ''}
                  onChange={(e) => updateFilter('maxTotalGiving', e.target.value ? parseFloat(e.target.value) : undefined)}
                  fullWidth
                  disabled={loading}
                  leftIcon={<span className="text-gray-400">$</span>}
                />
              </div>
            </div>

            {/* Last Contact Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Contact Date
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  placeholder="After"
                  value={formatDateForInput(filters.lastContactAfter)}
                  onChange={(e) => updateFilter('lastContactAfter', parseDateFromInput(e.target.value))}
                  fullWidth
                  disabled={loading}
                />
                <Input
                  type="date"
                  placeholder="Before"
                  value={formatDateForInput(filters.lastContactBefore)}
                  onChange={(e) => updateFilter('lastContactBefore', parseDateFromInput(e.target.value))}
                  fullWidth
                  disabled={loading}
                />
              </div>
            </div>

            {/* Last Donation Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Donation Date
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  placeholder="After"
                  value={formatDateForInput(filters.lastDonationAfter)}
                  onChange={(e) => updateFilter('lastDonationAfter', parseDateFromInput(e.target.value))}
                  fullWidth
                  disabled={loading}
                />
                <Input
                  type="date"
                  placeholder="Before"
                  value={formatDateForInput(filters.lastDonationBefore)}
                  onChange={(e) => updateFilter('lastDonationBefore', parseDateFromInput(e.target.value))}
                  fullWidth
                  disabled={loading}
                />
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  fullWidth
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addTag(tagInput)}
                  disabled={loading || !tagInput.trim()}
                >
                  Add
                </Button>
              </div>

              {/* Available Tags Suggestions */}
              {availableTags.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Suggestions: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {availableTags.slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        disabled={loading || filters.tags?.includes(tag)}
                        className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Tags */}
              {filters.tags && filters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map(tag => (
                    <Badge key={tag} variant="info" size="sm">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1.5 hover:text-red-300"
                        disabled={loading}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Project Alignment Filter */}
            {projects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Alignment
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={filters.projectId || ''}
                    onChange={(e) => updateFilter('projectId', e.target.value || undefined)}
                    disabled={loading}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Projects</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Min alignment score (0-100)"
                    value={filters.minAlignmentScore?.toString() || ''}
                    onChange={(e) => updateFilter('minAlignmentScore', e.target.value ? parseFloat(e.target.value) / 100 : undefined)}
                    fullWidth
                    disabled={loading || !filters.projectId}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                disabled={loading || activeFilterCount === 0}
              >
                Clear All Filters
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsExpanded(false)}
                >
                  Collapse
                </Button>
                <Button type="submit" variant="primary" loading={loading} disabled={loading}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}

export default AdvancedSearchForm;
