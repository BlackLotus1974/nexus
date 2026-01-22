'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  DonorSearch,
  DonorList,
  DonorListSkeleton,
  DonorGridSkeleton,
} from '@/components/donor';
import { AdvancedSearchForm, type AdvancedSearchFilters } from '@/components/search';
import { Alert } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useDonors, useGenerateDonorIntelligence } from '@/lib/hooks/useDonors';
import { usePaginatedSearch, useAvailableTags } from '@/lib/hooks/useAdvancedSearch';
import { useProjects } from '@/lib/hooks/useProjects';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addToSearchHistory,
  clearSearchHistory,
  setSelectedDonor,
} from '@/store/slices/donorSlice';
import type { Donor } from '@/types';
import type { AdvancedSearchResult } from '@/lib/hooks/useAdvancedSearch';

type SearchMode = 'quick' | 'advanced';

export default function DonorsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Local state
  const [searchMode, setSearchMode] = useState<SearchMode>('quick');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Redux state
  const { searchHistory } = useAppSelector((state) => state.donor);
  const { organizationId, initialized } = useAppSelector((state) => state.auth);

  // Use organization ID from auth state, fallback to temp for development
  const currentOrgId = organizationId || 'temp-org-id';

  // React Query hooks - basic donors list
  const { data: donors = [], isLoading, error: fetchError } = useDonors(currentOrgId, initialized);
  const generateIntelligence = useGenerateDonorIntelligence();

  // Advanced search hooks
  const advancedSearch = usePaginatedSearch(currentOrgId);
  const { data: availableTags = [] } = useAvailableTags(currentOrgId, initialized);
  const { data: projects = [] } = useProjects(currentOrgId, initialized);

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('donorSearchHistory');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        history.forEach((name: string) => dispatch(addToSearchHistory(name)));
      } catch (e) {
        console.error('Failed to load search history', e);
      }
    }
  }, [dispatch]);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('donorSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const generateDonorIntelligence = async (name: string, location?: string): Promise<string> => {
    // Start progress simulation while AI generates
    setGenerationProgress(0);

    // Simulate progress updates during AI generation
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return prev; // Don't go to 100% until actually complete
        return prev + Math.random() * 10;
      });
    }, 1000);

    try {
      // Call the actual Edge Function
      const result = await generateIntelligence.mutateAsync({
        name,
        location,
      });

      // Complete the progress
      clearInterval(progressInterval);
      setGenerationProgress(100);

      return result.donorId;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  const handleQuickSearch = async (name: string, location?: string) => {
    setError(null);
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Add to search history
      dispatch(addToSearchHistory(name));

      // Generate intelligence using AI
      const donorId = await generateDonorIntelligence(name, location);

      // Navigate to the donor detail page
      router.push(`/donors/${donorId}`);
    } catch (err) {
      console.error('Failed to generate donor intelligence:', err);

      // Handle specific error types
      let errorMessage = 'Failed to generate donor intelligence. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('rate limit')) {
          errorMessage = 'AI service is busy. Please try again in a few minutes.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again with a shorter search.';
        } else if (err.message.includes('unauthorized') || err.message.includes('authentication')) {
          errorMessage = 'Please log in to use this feature.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleAdvancedSearch = useCallback((filters: AdvancedSearchFilters) => {
    advancedSearch.setFilters({
      query: filters.query,
      location: filters.location,
      givingLevels: filters.givingLevels,
      donorTypes: filters.donorTypes,
      minTotalGiving: filters.minTotalGiving,
      maxTotalGiving: filters.maxTotalGiving,
      lastContactAfter: filters.lastContactAfter,
      lastContactBefore: filters.lastContactBefore,
      lastDonationAfter: filters.lastDonationAfter,
      lastDonationBefore: filters.lastDonationBefore,
      tags: filters.tags,
      projectId: filters.projectId,
      minAlignmentScore: filters.minAlignmentScore,
    });
  }, [advancedSearch]);

  const handleClearAdvancedSearch = useCallback(() => {
    advancedSearch.clearFilters();
  }, [advancedSearch]);

  const handleRecentSearchClick = (name: string) => {
    // Find existing donor with this name
    const existingDonor = donors.find(
      (d) => d.name.toLowerCase() === name.toLowerCase()
    );

    if (existingDonor) {
      router.push(`/donors/${existingDonor.id}`);
    } else {
      handleQuickSearch(name);
    }
  };

  const handleDonorClick = (donor: Donor) => {
    dispatch(setSelectedDonor(donor));
    router.push(`/donors/${donor.id}`);
  };

  const handleAdvancedDonorClick = (result: { id: string; name: string }) => {
    router.push(`/donors/${result.id}`);
  };

  const handleClearHistory = () => {
    dispatch(clearSearchHistory());
    localStorage.removeItem('donorSearchHistory');
  };

  // Convert advanced search results to Donor type for DonorList
  const advancedResultsAsDonors: Donor[] = advancedSearch.results.map((result: AdvancedSearchResult) => ({
    id: result.id,
    organizationId: result.organizationId,
    name: result.name,
    location: result.location,
    intelligenceData: result.intelligenceData as Donor['intelligenceData'],
    lastUpdated: result.lastUpdated,
    createdAt: result.createdAt,
  }));

  // Determine which data to show
  const isUsingAdvancedSearch = searchMode === 'advanced' && Object.keys(advancedSearch.params).length > 2;
  const displayDonors = isUsingAdvancedSearch ? advancedResultsAsDonors : donors;
  const isLoadingData = isUsingAdvancedSearch ? advancedSearch.isLoading : isLoading;

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Donor Intelligence
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Search for donors and generate AI-powered intelligence briefs
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={searchMode === 'quick' ? 'primary' : 'secondary'}
                  onClick={() => setSearchMode('quick')}
                  size="sm"
                >
                  Quick Search
                </Button>
                <Button
                  variant={searchMode === 'advanced' ? 'primary' : 'secondary'}
                  onClick={() => setSearchMode('advanced')}
                  size="sm"
                >
                  Advanced Search
                </Button>
              </div>
            </div>
          </div>

          {/* Search Form */}
          <div className="mb-6">
            {searchMode === 'quick' ? (
              <DonorSearch
                onSearch={handleQuickSearch}
                loading={isGenerating}
                recentSearches={searchHistory.slice(0, 5)}
                onRecentSearchClick={handleRecentSearchClick}
                onClearHistory={handleClearHistory}
              />
            ) : (
              <AdvancedSearchForm
                onSearch={handleAdvancedSearch}
                onClear={handleClearAdvancedSearch}
                loading={advancedSearch.isFetching}
                projects={projects.map(p => ({ id: p.id, name: p.name }))}
                availableTags={availableTags}
              />
            )}
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="mb-6">
              <Alert variant="info" title="Generating Intelligence">
                <div className="space-y-2">
                  <p className="text-sm">
                    AI is analyzing donor information from multiple sources...
                  </p>
                  <Progress
                    value={generationProgress}
                    variant="default"
                    showLabel
                    label="Progress"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {generationProgress < 20 && 'Creating donor record...'}
                    {generationProgress >= 20 && generationProgress < 40 && 'Searching public data...'}
                    {generationProgress >= 40 && generationProgress < 60 && 'Analyzing connections...'}
                    {generationProgress >= 60 && generationProgress < 80 && 'Generating insights...'}
                    {generationProgress >= 80 && 'Finalizing...'}
                  </p>
                </div>
              </Alert>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6">
              <Alert
                variant="error"
                title="Error"
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            </div>
          )}

          {/* Fetch Error */}
          {fetchError && (
            <div className="mb-6">
              <Alert variant="error" title="Failed to Load Donors">
                {fetchError instanceof Error ? fetchError.message : 'An error occurred'}
              </Alert>
            </div>
          )}

          {/* Advanced Search Error */}
          {advancedSearch.error && (
            <div className="mb-6">
              <Alert variant="error" title="Search Error">
                {advancedSearch.error instanceof Error ? advancedSearch.error.message : 'Search failed'}
              </Alert>
            </div>
          )}

          {/* Search Results Info (Advanced Mode) */}
          {searchMode === 'advanced' && isUsingAdvancedSearch && (
            <div className="mb-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Found <span className="font-semibold text-gray-900 dark:text-gray-100">{advancedSearch.total}</span> donors
                    </span>
                    {advancedSearch.isFetching && (
                      <Badge variant="info" size="sm">Searching...</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={advancedSearch.previousPage}
                      disabled={!advancedSearch.hasPreviousPage}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {advancedSearch.currentPage + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={advancedSearch.nextPage}
                      disabled={!advancedSearch.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Donor List */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {searchMode === 'advanced' && isUsingAdvancedSearch
                  ? 'Search Results'
                  : `All Donors (${donors.length})`}
              </h2>
            </div>

            {isLoadingData ? (
              viewMode === 'table' ? (
                <DonorListSkeleton />
              ) : (
                <DonorGridSkeleton />
              )
            ) : (
              <DonorList
                donors={displayDonors}
                onDonorClick={handleDonorClick}
                loading={isGenerating || advancedSearch.isFetching}
              />
            )}
          </div>
        </div>
      </ErrorBoundary>
    </DashboardLayout>
  );
}
