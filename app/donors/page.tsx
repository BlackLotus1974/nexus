'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  DonorSearch,
  DonorList,
  DonorListSkeleton,
  DonorGridSkeleton,
} from '@/components/donor';
import { Alert } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useDonors, useGenerateDonorIntelligence } from '@/lib/hooks/useDonors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addToSearchHistory,
  clearSearchHistory,
  setSelectedDonor,
} from '@/store/slices/donorSlice';
import type { Donor } from '@/types';

export default function DonorsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Local state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Redux state
  const { searchHistory } = useAppSelector((state) => state.donor);
  const { organizationId, user, initialized } = useAppSelector((state) => state.auth);

  // Use organization ID from auth state, fallback to temp for development
  const currentOrgId = organizationId || 'temp-org-id';

  // React Query hooks
  const { data: donors = [], isLoading, error: fetchError } = useDonors(currentOrgId, initialized);
  const generateIntelligence = useGenerateDonorIntelligence();

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

  const handleSearch = async (name: string, location?: string) => {
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

  const handleRecentSearchClick = (name: string) => {
    // Find existing donor with this name
    const existingDonor = donors.find(
      (d) => d.name.toLowerCase() === name.toLowerCase()
    );

    if (existingDonor) {
      router.push(`/donors/${existingDonor.id}`);
    } else {
      handleSearch(name);
    }
  };

  const handleDonorClick = (donor: Donor) => {
    dispatch(setSelectedDonor(donor));
    router.push(`/donors/${donor.id}`);
  };

  const handleClearHistory = () => {
    dispatch(clearSearchHistory());
    localStorage.removeItem('donorSearchHistory');
  };

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Donor Intelligence
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Search for donors and generate AI-powered intelligence briefs
            </p>
          </div>

          {/* Search Form */}
          <div className="mb-6">
            <DonorSearch
              onSearch={handleSearch}
              loading={isGenerating}
              recentSearches={searchHistory.slice(0, 5)}
              onRecentSearchClick={handleRecentSearchClick}
              onClearHistory={handleClearHistory}
            />
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

          {/* Donor List */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                All Donors ({donors.length})
              </h2>
            </div>

            {isLoading ? (
              viewMode === 'table' ? (
                <DonorListSkeleton />
              ) : (
                <DonorGridSkeleton />
              )
            ) : (
              <DonorList
                donors={donors}
                onDonorClick={handleDonorClick}
                loading={isGenerating}
              />
            )}
          </div>
        </div>
      </ErrorBoundary>
    </DashboardLayout>
  );
}
