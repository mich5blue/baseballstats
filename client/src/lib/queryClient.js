import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient — staleTime: 0 means data is always considered stale,
 * so every page mount triggers a background refetch. But the previous result
 * is shown instantly from cache while the new fetch runs, giving you both
 * speed and fresh data.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,            // always refetch in background on mount
      gcTime: 5 * 60 * 1000,  // keep unused cache for 5 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export default queryClient;
