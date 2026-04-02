'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpLink } from '@trpc/client';
import { useState, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { api } from './client';
import { env } from '@/env';

export function TRPCProvider({ 
  children, 
  coopId 
}: { 
  children: React.ReactNode;
  coopId?: string;
}) {
  const { address } = useAccount();

  // Store address and coopId in refs so headers() can access the latest values
  const addressRef = useRef(address);
  const coopIdRef = useRef(coopId);
  
  addressRef.current = address;
  coopIdRef.current = coopId;

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  const trpcClient = useMemo(() =>
    api.createClient({
      links: [
        httpLink({
          url: env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc',
          // Add wallet address and coop ID to headers for admin verification
          headers() {
            const headers: Record<string, string> = {
              'x-wallet-address': addressRef.current || '',
            };
            
            if (coopIdRef.current) {
              headers['x-coop-id'] = coopIdRef.current;
            }
            
            return headers;
          },
        }),
      ],
    }),
    [] // Only create once, but headers() will use the refs to get current values
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}
