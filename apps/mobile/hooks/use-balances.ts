import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/config';

interface Balances {
  sc: string;
  uc: string;
  scRaw: string;
  ucRaw: string;
}

/**
 * Hook to fetch SC and UC balances from backend API
 * Uses React Query for caching and automatic refetching
 */
export function useBalances(walletAddress?: string | null) {
  return useQuery({
    queryKey: ['balances', walletAddress],
    queryFn: async (): Promise<Balances> => {
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      try {
        const response = await fetch(`${getApiUrl()}/trpc/user.getBalances?input=${encodeURIComponent(JSON.stringify({ walletAddress }))}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.result?.data) {
          return data.result.data;
        } else {
          console.warn('No balance data returned, using zeros');
          return {
            sc: '0',
            uc: '0',
            scRaw: '0',
            ucRaw: '0',
          };
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
        // Return zeros instead of throwing to prevent UI from breaking
        return {
          sc: '0',
          uc: '0',
          scRaw: '0',
          ucRaw: '0',
        };
      }
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
