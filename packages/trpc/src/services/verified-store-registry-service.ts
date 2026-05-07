import { createWalletClient, createPublicClient, http, type Address, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const DEFAULT_RPC_URL = 'https://sepolia.base.org';
const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY;

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

function getPublicClient(rpcUrl?: string | null) {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl || DEFAULT_RPC_URL),
  });
}

function getWalletClient(rpcUrl?: string | null) {
  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }
  const account = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl || DEFAULT_RPC_URL),
  });
}

/**
 * Convert string to bytes32 hash
 * Used for categoryKey and storeKey
 */
export function stringToBytes32(str: string): `0x${string}` {
  return keccak256(toBytes(str));
}

interface ContractConfig {
  registryAddress: string;
  rpcUrl?: string | null;
}

export async function verifyStoreOnChain(
  storeOwnerAddress: string,
  category: string,
  storeId: string,
  config: ContractConfig,
): Promise<string> {
  console.log(`🔗 Verifying store on-chain: ${storeOwnerAddress} (${category})`);

  const walletClient = getWalletClient(config.rpcUrl);
  const publicClient = getPublicClient(config.rpcUrl);
  const registryAddress = config.registryAddress as Address;

  const categoryKey = stringToBytes32(category);
  const storeKey = stringToBytes32(storeId);

  const isVerified = await publicClient.readContract({
    address: registryAddress,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'isVerified',
    args: [storeOwnerAddress as Address],
  });

  if (isVerified) {
    throw new Error('Store is already verified on-chain');
  }

  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'verifyStore',
    args: [storeOwnerAddress as Address, categoryKey, storeKey],
  });

  console.log(`📝 Transaction submitted: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  console.log(`✅ Store verified on-chain: ${txHash}`);
  return txHash;
}

export async function unverifyStoreOnChain(
  storeOwnerAddress: string,
  config: ContractConfig,
): Promise<string> {
  console.log(`🔗 Unverifying store on-chain: ${storeOwnerAddress}`);

  const walletClient = getWalletClient(config.rpcUrl);
  const publicClient = getPublicClient(config.rpcUrl);
  const registryAddress = config.registryAddress as Address;

  const isVerified = await publicClient.readContract({
    address: registryAddress,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'isVerified',
    args: [storeOwnerAddress as Address],
  });

  if (!isVerified) {
    throw new Error('Store is not verified on-chain');
  }

  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'unverifyStore',
    args: [storeOwnerAddress as Address],
  });

  console.log(`📝 Transaction submitted: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  console.log(`✅ Store unverified on-chain: ${txHash}`);
  return txHash;
}

export async function verifyStoresBatchOnChain(
  stores: Array<{ ownerAddress: string; category: string; storeId: string }>,
  config: ContractConfig,
): Promise<string> {
  console.log(`🔗 Batch verifying ${stores.length} stores on-chain...`);

  const walletClient = getWalletClient(config.rpcUrl);
  const publicClient = getPublicClient(config.rpcUrl);
  const registryAddress = config.registryAddress as Address;

  const storeOwners: Address[] = stores.map(s => s.ownerAddress as Address);
  const categoryKeys = stores.map(s => stringToBytes32(s.category));
  const storeKeys = stores.map(s => stringToBytes32(s.storeId));

  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'verifyStoresBatch',
    args: [storeOwners, categoryKeys, storeKeys],
  });

  console.log(`📝 Batch transaction submitted: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'reverted') {
    throw new Error(`Batch transaction reverted: ${txHash}`);
  }

  console.log(`✅ ${stores.length} stores verified on-chain: ${txHash}`);
  return txHash;
}

export async function isStoreVerifiedOnChain(
  storeOwnerAddress: string,
  config: ContractConfig,
): Promise<boolean> {
  const publicClient = getPublicClient(config.rpcUrl);
  return publicClient.readContract({
    address: config.registryAddress as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'isVerified',
    args: [storeOwnerAddress as Address],
  });
}

export async function getStoreInfoOnChain(
  storeOwnerAddress: string,
  config: ContractConfig,
): Promise<{
  isVerified: boolean;
  categoryKey: string;
  storeKey: string;
  verifiedAt: bigint;
  updatedAt: bigint;
} | null> {
  const publicClient = getPublicClient(config.rpcUrl);
  const info = await publicClient.readContract({
    address: config.registryAddress as Address,
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

export async function getAllVerifiedStoresOnChain(config: ContractConfig): Promise<string[]> {
  const publicClient = getPublicClient(config.rpcUrl);
  const addresses = await publicClient.readContract({
    address: config.registryAddress as Address,
    abi: VERIFIED_STORE_REGISTRY_ABI,
    functionName: 'getVerifiedStores',
  });
  return [...addresses] as string[];
}
