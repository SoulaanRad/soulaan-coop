/**
 * Application configuration
 * Uses environment variables with fallbacks for testing
 * 
 * NOTE: This file exports CLIENT-SAFE configuration only.
 * For server-side config (like SESSION_SECRET), use getServerConfig()
 */
import { env } from '~/env';

// Client-safe configuration (can be imported anywhere)
export const config = {
  // Blockchain configuration
  chain: {
    id: parseInt(env.NEXT_PUBLIC_CHAIN_ID || '84532'), // Base Sepolia by default
    name: env.NEXT_PUBLIC_CHAIN_NAME || 'Base Sepolia',
    rpcUrl: env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org',
  },
  
  // Smart contract addresses
  contracts: {
    soulaaniCoin: env.NEXT_PUBLIC_SOULAANI_COIN_ADDRESS as `0x${string}` | undefined,
  },
  
  // WalletConnect configuration
  walletConnect: {
    projectId: env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  },
  
  // App configuration
  app: {
    domain: env.NEXT_PUBLIC_DOMAIN || 'localhost',
    uri: env.NEXT_PUBLIC_URI || 'http://localhost:3000',
  },
  
  // Feature flags
  features: {
    // Skip blockchain checks in test/development mode
    // eslint-disable-next-line no-restricted-properties
    skipBlockchainChecks: process.env.NODE_ENV === 'test' || 
                          // eslint-disable-next-line no-restricted-properties
                          (process.env.NODE_ENV === 'development' && !env.NEXT_PUBLIC_SOULAANI_COIN_ADDRESS),
  },
};

// Server-only configuration (use only in API routes, middleware, and server components)
export function getServerConfig() {
  // eslint-disable-next-line no-restricted-properties -- Server-side only function
  const sessionSecret = process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development';
  
  return {
    session: {
      secret: sessionSecret,
      cookieName: 'soulaan_auth_session',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    },
  };
}

// Validate required configuration (server-side only)
export function validateConfig() {
  const errors: string[] = [];
  
  // eslint-disable-next-line no-restricted-properties -- Server-side validation only
  if (process.env.NODE_ENV === 'production') {
    if (!config.contracts.soulaaniCoin) {
      errors.push('NEXT_PUBLIC_SOULAANI_COIN_ADDRESS is required in production');
    }
    
    if (!config.walletConnect.projectId) {
      errors.push('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is required in production');
    }
    
    const serverConfig = getServerConfig();
    if (serverConfig.session.secret.includes('development')) {
      errors.push('SESSION_SECRET must be set to a secure value in production');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

// Export chain configuration for wagmi
export const chainConfig = {
  id: config.chain.id,
  name: config.chain.name,
  network: config.chain.name.toLowerCase().replace(/\s+/g, '-'),
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [config.chain.rpcUrl] },
    public: { http: [config.chain.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
};
