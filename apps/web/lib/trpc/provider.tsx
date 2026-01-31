'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpLink } from '@trpc/client';
import { useState, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { api } from './client';
import { env } from '@/env';

function TRPCClientProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();

  // Store address in ref so headers() can access the latest value
  const addressRef = useRef(address);
  addressRef.current = address;

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
          // Add wallet address to headers for admin verification
          headers() {
            return {
              'x-wallet-address': addressRef.current || '',
            };
          },
        }),
      ],
    }),
    [] // Only create once, but headers() will use the ref to get current address
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  return <TRPCClientProvider>{children}</TRPCClientProvider>;
}
