/**
 * Application configuration
 * Uses environment variables with fallbacks for testing
 */
import { env } from '~/env';

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
    domain: env.NEXT_PUBLIC_DOMAIN || 'localhost:3000',
    uri: env.NEXT_PUBLIC_URI || 'http://localhost:3000',
  },
  
  // Session configuration
  session: {
    secret: env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development',
    cookieName: 'soulaan_auth_session',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
  
  // Feature flags
  features: {
    // Skip blockchain checks in test/development mode
    skipBlockchainChecks: env.NODE_ENV === 'test' || 
                          (env.NODE_ENV === 'development' && !env.NEXT_PUBLIC_SOULAANI_COIN_ADDRESS),
  },
};

// Validate required configuration
export function validateConfig() {
  const errors: string[] = [];
  
  if (env.NODE_ENV === 'production') {
    if (!config.contracts.soulaaniCoin) {
      errors.push('NEXT_PUBLIC_SOULAANI_COIN_ADDRESS is required in production');
    }
    
    if (!config.walletConnect.projectId) {
      errors.push('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is required in production');
    }
    
    if (config.session.secret.includes('development')) {
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
