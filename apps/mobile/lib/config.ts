// Get API URL from environment variable or fallback to defaults
const getApiBaseUrl = () => {
  // Check EXPO_PUBLIC_ prefixed variable (recommended for Expo)
  const envApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // Fallback to default values
  return __DEV__ ? 'http://localhost:3001' : 'https://api.soulaan.coop';
};

// API configuration for Expo
export const config = {
  // API Base URL - reads from .env file or uses defaults
  API_BASE_URL: getApiBaseUrl(),
  
  // Request timeout
  REQUEST_TIMEOUT: 10000, // 10 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Helper function to get the correct API URL
export const getApiUrl = () => {
  const baseUrl = config.API_BASE_URL;
  
  if (__DEV__) {
    console.log(`📱 Mobile app connecting to: ${baseUrl}`);
  }
  
  return baseUrl;
};

// Network configuration for Expo
export const networkConfig = {
  // Enable network debugging in development
  enableNetworkLogging: __DEV__,

  // Headers for all requests
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // CORS configuration (handled by the API server)
  cors: {
    origin: __DEV__ ? ['http://localhost:3000', 'http://localhost:8081'] : ['https://soulaan.coop'],
    credentials: true,
  }
};

// Blockchain configuration
export const blockchainConfig = {
  // RPC URL for blockchain interactions
  rpcUrl: process.env.EXPO_PUBLIC_RPC_URL || 'https://sepolia.base.org',

  // Chain ID
  chainId: parseInt(process.env.EXPO_PUBLIC_CHAIN_ID || '84532'), // Base Sepolia

  // Contract addresses (set via environment variables after deployment)
  contracts: {
    soulaaniCoin: process.env.EXPO_PUBLIC_SC_CONTRACT || '0x0000000000000000000000000000000000000000',
    unityCoin: process.env.EXPO_PUBLIC_UC_CONTRACT || '0x0000000000000000000000000000000000000000',
  },
};
