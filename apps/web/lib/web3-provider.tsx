'use client';

import type { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { injected, walletConnect } from 'wagmi/connectors';
import { config as appConfig, chainConfig } from './config';

// Create wagmi config
const metadata = {
  name: 'Soulaan Co-op Admin',
  description: 'Soulaan Co-op Admin Panel',
  url: appConfig.app.uri,
  icons: [`${appConfig.app.uri}/favicon.ico`],
};

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [chainConfig as any],
  transports: {
    [chainConfig.id]: http(appConfig.chain.rpcUrl),
  },
  connectors: [
    injected(),
    ...(appConfig.walletConnect.projectId ? [
      walletConnect({ 
        projectId: appConfig.walletConnect.projectId, 
        metadata 
      })
    ] : []),
  ],
});

// Create web3modal only if projectId is available
if (appConfig.walletConnect.projectId) {
  createWeb3Modal({
    wagmiConfig,
    projectId: appConfig.walletConnect.projectId,
    enableAnalytics: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#3b82f6',
      '--w3m-border-radius-master': '0.5rem',
    },
  });
}

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
