import { createWalletClient, createPublicClient, http, encodeFunctionData, type Address, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Environment configuration
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY;
const VERIFIED_STORE_REGISTRY_ADDRESS = process.env.VERIFIED_STORE_REGISTRY_ADDRESS;

// Validate configuration
if (!VERIFIED_STORE_REGISTRY_ADDRESS) {
  console.warn('⚠️  VERIFIED_STORE_REGISTRY_ADDRESS not set - on-chain verification disabled');
}

// VerifiedStoreRegistry ABI (only the functions we need)
const VERIFIED_STORE_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'storeOwner', type: 'address' },
      { name: 'categoryKey', type: 'bytes32' },
      { name: 'storeKey', type: 'bytes32' },
    ],
    name: 'verifyStore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'storeOwner', type: 'address' }],
    name: 'unverifyStore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'storeOwners', type: 'address[]' },
      { name: 'categoryKeys', type: 'bytes32[]' },
      { name: 'storeKeys', type: 'bytes32[]' },
    ],
    name: 'verifyStoresBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'storeOwner', type: 'address' }],
    name: 'isVerified',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'storeOwner', type: 'address' }],
    name: 'getStoreInfo',
    outputs: [
      {
        components: [
          { name: 'isVerified', type: 'bool' },
          { name: 'categoryKey', type: 'bytes32' },
          { name: 'storeKey', type: 'bytes32' },
          { name: 'verifiedAt', type: 'uint256' },
          { name: 'updatedAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVerifiedStores',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get public client for reading from blockchain
 */
function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

/**
 * Get wallet client for writing to blockchain
 */
function getWalletClient() {
  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  const account = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

/**
 * Convert string to bytes32 hash
 * Used for categoryKey and storeKey
 */
export function stringToBytes32(str: string): `0x${string}` {
  return keccak256(toBytes(str));
}

/**
 * Verify a store on-chain
 * @param storeOwnerAddress - Wallet address of the store owner
 * @param category - Store category (e.g., "FOOD_BEVERAGE", "RETAIL")
 * @param storeId - Unique store ID from database
 * @returns Transaction hash
 */
export async function verifyStoreOnChain(
  storeOwnerAddress: string,
  category: string,
  storeId: string
): Promise<string> {
  if (!VERIFIED_STORE_REGISTRY_ADDRESS) {
    throw new Error('VerifiedStoreRegistry contract address not configured');
  }

  console.log(`🔗 Verifying store on-chain...`);
  console.log(`   Store Owner: ${storeOwnerAddress}`);
  console.log(`   Category: ${category}`);
  console.log(`   Store ID: ${storeId}`);

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  // Convert category and storeId to bytes32
  const categoryKey = stringToBytes32(category);
  const storeKey = stringToBytes32(storeId);

  console.log(`   Category Key: ${categoryKey}`);
  console.log(`   Store Key: ${storeKey}`);

  // Check if already verified
  const isVerified = await publicClient.readContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'isVerified',
    args: [storeOwnerAddress as Address],
  });

  if (isVerified) {
    throw new Error('Store is already verified on-chain');
  }

  // Call verifyStore
  const txHash = await walletClient.writeContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'verifyStore',
    args: [storeOwnerAddress as Address, categoryKey, storeKey],
  });

  console.log(`📝 Transaction submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  console.log(`✅ Store verified on-chain: ${txHash}`);

  return txHash;
}

/**
 * Unverify a store on-chain
 * @param storeOwnerAddress - Wallet address of the store owner
 * @returns Transaction hash
 */
export async function unverifyStoreOnChain(storeOwnerAddress: string): Promise<string> {
  if (!VERIFIED_STORE_REGISTRY_ADDRESS) {
    throw new Error('VerifiedStoreRegistry contract address not configured');
  }

  console.log(`🔗 Unverifying store on-chain...`);
  console.log(`   Store Owner: ${storeOwnerAddress}`);

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  // Check if verified
  const isVerified = await publicClient.readContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'isVerified',
    args: [storeOwnerAddress as Address],
  });

  if (!isVerified) {
    throw new Error('Store is not verified on-chain');
  }

  // Call unverifyStore
  const txHash = await walletClient.writeContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'unverifyStore',
    args: [storeOwnerAddress as Address],
  });

  console.log(`📝 Transaction submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  console.log(`✅ Store unverified on-chain: ${txHash}`);

  return txHash;
}

/**
 * Verify multiple stores in a batch
 * @param stores - Array of store data { ownerAddress, category, storeId }
 * @returns Transaction hash
 */
export async function verifyStoresBatchOnChain(
  stores: Array<{ ownerAddress: string; category: string; storeId: string }>
): Promise<string> {
  if (!VERIFIED_STORE_REGISTRY_ADDRESS) {
    throw new Error('VerifiedStoreRegistry contract address not configured');
  }

  console.log(`🔗 Batch verifying ${stores.length} stores on-chain...`);

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  // Prepare arrays
  const storeOwners: Address[] = [];
  const categoryKeys: `0x${string}`[] = [];
  const storeKeys: `0x${string}`[] = [];

  for (const store of stores) {
    storeOwners.push(store.ownerAddress as Address);
    categoryKeys.push(stringToBytes32(store.category));
    storeKeys.push(stringToBytes32(store.storeId));
  }

  // Call verifyStoresBatch
  const txHash = await walletClient.writeContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'verifyStoresBatch',
    args: [storeOwners, categoryKeys, storeKeys],
  });

  console.log(`📝 Batch transaction submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'reverted') {
    throw new Error(`Batch transaction reverted: ${txHash}`);
  }

  console.log(`✅ ${stores.length} stores verified on-chain: ${txHash}`);

  return txHash;
}

/**
 * Check if a store is verified on-chain
 * @param storeOwnerAddress - Wallet address of the store owner
 * @returns True if verified
 */
export async function isStoreVerifiedOnChain(storeOwnerAddress: string): Promise<boolean> {
  if (!VERIFIED_STORE_REGISTRY_ADDRESS) {
    return false;
  }

  const publicClient = getPublicClient();

  const isVerified = await publicClient.readContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'isVerified',
    args: [storeOwnerAddress as Address],
  });

  return isVerified;
}

/**
 * Get store info from on-chain registry
 * @param storeOwnerAddress - Wallet address of the store owner
 * @returns Store info or null if not found
 */
export async function getStoreInfoOnChain(storeOwnerAddress: string): Promise<{
  isVerified: boolean;
  categoryKey: string;
  storeKey: string;
  verifiedAt: bigint;
  updatedAt: bigint;
} | null> {
  if (!VERIFIED_STORE_REGISTRY_ADDRESS) {
    return null;
  }

  const publicClient = getPublicClient();

  const info = await publicClient.readContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'getStoreInfo',
    args: [storeOwnerAddress as Address],
  });

  return {
    isVerified: info.isVerified,
    categoryKey: info.categoryKey,
    storeKey: info.storeKey,
    verifiedAt: info.verifiedAt,
    updatedAt: info.updatedAt,
  };
}

/**
 * Get all verified store addresses from on-chain registry
 * @returns Array of verified store owner addresses
 */
export async function getAllVerifiedStoresOnChain(): Promise<string[]> {
  if (!VERIFIED_STORE_REGISTRY_ADDRESS) {
    return [];
  }

  const publicClient = getPublicClient();

  const addresses = await publicClient.readContract({
    address: VERIFIED_STORE_REGISTRY_ADDRESS as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'getVerifiedStores',
  });

  return addresses;
}
