'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {PrivyProvider} from '@privy-io/react-auth';

import { trpc, trpcClient } from '../utils/trpc';

const queryClient = new QueryClient();

// You'll need to get your Privy App ID from the Privy dashboard
const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID || 'your-privy-app-id';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#DC2626',
        },
        loginMethods: ['email'],
        embeddedWallets: {
          createOnLogin: 'off', // Disable embedded wallets for now
        },
      }}
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </PrivyProvider>
  );
}