'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpLink } from '@trpc/client';
import { useState } from 'react';
import { api } from './client';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpLink({
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc',
          // You can add headers here if needed for authentication
          // headers() {
          //   return {
          //     authorization: getAuthToken(),
          //   };
          // },
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}
