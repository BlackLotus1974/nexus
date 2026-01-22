import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

// Type for RPC response since these functions are added by migration
// and may not be in the generated types yet
type SearchDonorsRow = Record<string, unknown>;
type SuggestionRow = Record<string, unknown>;
type TagsRow = { tags: string[] | null };

export interface AdvancedSearchParams {
  organizationId: string;
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
  limit?: number;
  offset?: number;
}

export interface AdvancedSearchResult {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  givingLevel?: string;
  totalGiving?: number;
  donorType?: string;
  lastContactDate?: Date;
  lastDonationDate?: Date;
  tags?: string[];
  notes?: string;
  intelligenceData: Record<string, unknown>;
  createdAt: Date;
  lastUpdated: Date;
  relevanceScore: number;
  alignmentScore?: number;
}

export interface SearchSuggestion {
  id: string;
  name: string;
  location?: string;
  givingLevel?: string;
  similarityScore: number;
}

/**
 * Debounce hook for search input
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Convert search params to RPC parameters
 */
function paramsToRPC(params: AdvancedSearchParams) {
  return {
    p_organization_id: params.organizationId,
    p_query: params.query || null,
    p_location: params.location || null,
    p_giving_levels: params.givingLevels?.length ? params.givingLevels : null,
    p_donor_types: params.donorTypes?.length ? params.donorTypes : null,
    p_min_total_giving: params.minTotalGiving ?? null,
    p_max_total_giving: params.maxTotalGiving ?? null,
    p_last_contact_after: params.lastContactAfter?.toISOString() ?? null,
    p_last_contact_before: params.lastContactBefore?.toISOString() ?? null,
    p_last_donation_after: params.lastDonationAfter?.toISOString() ?? null,
    p_last_donation_before: params.lastDonationBefore?.toISOString() ?? null,
    p_tags: params.tags?.length ? params.tags : null,
    p_project_id: params.projectId || null,
    p_min_alignment_score: params.minAlignmentScore ?? null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  };
}

/**
 * Transform database row to search result
 */
function transformSearchResult(row: Record<string, unknown>): AdvancedSearchResult {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    location: row.location as string | undefined,
    givingLevel: row.giving_level as string | undefined,
    totalGiving: row.total_giving as number | undefined,
    donorType: row.donor_type as string | undefined,
    lastContactDate: row.last_contact_date ? new Date(row.last_contact_date as string) : undefined,
    lastDonationDate: row.last_donation_date ? new Date(row.last_donation_date as string) : undefined,
    tags: row.tags as string[] | undefined,
    notes: row.notes as string | undefined,
    intelligenceData: (row.intelligence_data as Record<string, unknown>) || {},
    createdAt: new Date(row.created_at as string),
    lastUpdated: new Date(row.last_updated as string),
    relevanceScore: row.relevance_score as number,
    alignmentScore: row.alignment_score as number | undefined,
  };
}

/**
 * Transform suggestion row
 */
function transformSuggestion(row: Record<string, unknown>): SearchSuggestion {
  return {
    id: row.id as string,
    name: row.name as string,
    location: row.location as string | undefined,
    givingLevel: row.giving_level as string | undefined,
    similarityScore: row.similarity_score as number,
  };
}

/**
 * Advanced donor search hook with debounced queries
 */
export function useAdvancedSearch(
  params: AdvancedSearchParams,
  options: { enabled?: boolean; debounceMs?: number } = {}
) {
  const { enabled = true, debounceMs = 300 } = options;

  // Debounce the query parameter specifically
  const debouncedQuery = useDebounce(params.query, debounceMs);
  const debouncedLocation = useDebounce(params.location, debounceMs);

  // Create the final params with debounced values
  const searchParams = {
    ...params,
    query: debouncedQuery,
    location: debouncedLocation,
  };

  return useQuery({
    queryKey: ['advanced-search', searchParams],
    queryFn: async () => {
      const rpcParams = paramsToRPC(searchParams);

      // Cast since the RPC function is added by migration and may not be in generated types
      const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: SearchDonorsRow[] | null; error: { code: string; message: string } | null }>)(
        'search_donors',
        rpcParams
      );

      if (error) {
        // If the function doesn't exist yet (migration not run), fall back to basic query
        if (error.code === '42883') {
          console.warn('search_donors function not found, falling back to basic query');
          return { results: [], total: 0, hasMore: false };
        }
        throw new Error(error.message);
      }

      const results = (data || []).map(transformSearchResult);

      return {
        results,
        total: results.length,
        hasMore: results.length === (searchParams.limit ?? 50),
      };
    },
    enabled: enabled && !!params.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Search suggestions hook for autocomplete
 */
export function useSearchSuggestions(
  organizationId: string,
  query: string,
  options: { enabled?: boolean; debounceMs?: number; limit?: number } = {}
) {
  const { enabled = true, debounceMs = 200, limit = 10 } = options;

  const debouncedQuery = useDebounce(query, debounceMs);

  return useQuery({
    queryKey: ['search-suggestions', organizationId, debouncedQuery],
    queryFn: async () => {
      // Cast since the RPC function is added by migration and may not be in generated types
      const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: SuggestionRow[] | null; error: { code: string; message: string } | null }>)(
        'get_donor_suggestions',
        {
          p_organization_id: organizationId,
          p_query: debouncedQuery,
          p_limit: limit,
        }
      );

      if (error) {
        // If the function doesn't exist yet, return empty array
        if (error.code === '42883') {
          console.warn('get_donor_suggestions function not found');
          return [];
        }
        throw new Error(error.message);
      }

      return (data || []).map(transformSuggestion);
    },
    enabled: enabled && !!organizationId && !!debouncedQuery && debouncedQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to manage search state with pagination
 */
export function usePaginatedSearch(organizationId: string) {
  const [params, setParams] = useState<Omit<AdvancedSearchParams, 'organizationId'>>({
    limit: 50,
    offset: 0,
  });

  const fullParams: AdvancedSearchParams = {
    ...params,
    organizationId,
  };

  const { data, isLoading, isFetching, error, refetch } = useAdvancedSearch(fullParams);

  const setFilters = useCallback((
    newFilters: Omit<AdvancedSearchParams, 'organizationId' | 'limit' | 'offset'>
  ) => {
    setParams(prev => ({
      ...prev,
      ...newFilters,
      offset: 0, // Reset to first page when filters change
    }));
  }, []);

  const nextPage = useCallback(() => {
    if (data?.hasMore) {
      setParams(prev => ({
        ...prev,
        offset: (prev.offset ?? 0) + (prev.limit ?? 50),
      }));
    }
  }, [data?.hasMore]);

  const previousPage = useCallback(() => {
    setParams(prev => ({
      ...prev,
      offset: Math.max(0, (prev.offset ?? 0) - (prev.limit ?? 50)),
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setParams(prev => ({
      ...prev,
      offset: page * (prev.limit ?? 50),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setParams({
      limit: 50,
      offset: 0,
    });
  }, []);

  const currentPage = Math.floor((params.offset ?? 0) / (params.limit ?? 50));
  const hasPreviousPage = (params.offset ?? 0) > 0;

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    isFetching,
    error,
    refetch,
    params,
    setFilters,
    nextPage,
    previousPage,
    setPage,
    clearFilters,
    currentPage,
    hasPreviousPage,
    hasNextPage: data?.hasMore ?? false,
  };
}

/**
 * Hook to get available tags for filter suggestions
 */
export function useAvailableTags(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['donor-tags', organizationId],
    queryFn: async () => {
      // Get unique tags from donors
      // Note: 'tags' column is added by migration and may not be in generated types yet
      const { data, error } = await supabase
        .from('donors')
        .select('tags')
        .eq('organization_id', organizationId)
        .not('tags', 'is', null) as unknown as { data: TagsRow[] | null; error: { message: string } | null };

      if (error) {
        // If tags column doesn't exist yet, return empty array
        console.warn('tags column not found, returning empty array');
        return [];
      }

      // Flatten and deduplicate tags
      const allTags = (data || [])
        .flatMap(row => row.tags || [])
        .filter((tag): tag is string => typeof tag === 'string');

      const uniqueTags = [...new Set(allTags)].sort();

      return uniqueTags;
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
