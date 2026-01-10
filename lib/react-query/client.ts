import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes (data considered fresh for 5 minutes)
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes (unused data kept in cache for 10 minutes)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 1 time
      retry: 1,
      // Refetch on window focus (useful for keeping data fresh)
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      // Don't refetch on reconnect
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations 0 times
      retry: 0,
    },
  },
});
