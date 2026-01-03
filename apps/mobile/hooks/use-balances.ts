import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { publicClient, isBlockchainConfigured } from '@/lib/blockchain-client';
import { SOULAANI_COIN_ABI, UNITY_COIN_ABI } from '@/lib/contract-abis';
import { blockchainConfig } from '@/lib/config';

interface Balances {
  sc: string;
  uc: string;
  scRaw: bigint;
  ucRaw: bigint;
}

/**
 * Hook to fetch SC and UC balances from blockchain
 * Uses React Query for caching and automatic refetching
 */
export function useBalances(walletAddress?: string | null) {
  return useQuery({
    queryKey: ['balances', walletAddress],
    queryFn: async (): Promise<Balances> => {
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      if (!isBlockchainConfigured()) {
        console.warn('Blockchain not configured, returning zero balances');
        return {
          sc: '0',
          uc: '0',
          scRaw: 0n,
          ucRaw: 0n,
        };
      }

      try {
        // Fetch both balances in parallel
        const [scBalance, ucBalance] = await Promise.all([
          publicClient.readContract({
            address: blockchainConfig.contracts.soulaaniCoin as `0x${string}`,
            abi: SOULAANI_COIN_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }),
          publicClient.readContract({
            address: blockchainConfig.contracts.unityCoin as `0x${string}`,
            abi: UNITY_COIN_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }),
        ]);

        return {
          sc: formatUnits(scBalance, 18),
          uc: formatUnits(ucBalance, 18),
          scRaw: scBalance,
          ucRaw: ucBalance,
        };
      } catch (error) {
        console.error('Error fetching balances:', error);
        throw error;
      }
    },
    enabled: !!walletAddress && isBlockchainConfigured(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to check if user is an active member
 */
export function useIsActiveMember(walletAddress?: string | null) {
  return useQuery({
    queryKey: ['isActiveMember', walletAddress],
    queryFn: async (): Promise<boolean> => {
      if (!walletAddress || !isBlockchainConfigured()) {
        return false;
      }

      try {
        const isActive = await publicClient.readContract({
          address: blockchainConfig.contracts.soulaaniCoin as `0x${string}`,
          abi: SOULAANI_COIN_ABI,
          functionName: 'isActiveMember',
          args: [walletAddress as `0x${string}`],
        });

        return isActive;
      } catch (error) {
        console.error('Error checking member status:', error);
        return false;
      }
    },
    enabled: !!walletAddress && isBlockchainConfigured(),
    staleTime: 60000, // 1 minute
  });
}
