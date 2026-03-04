import { db } from "@repo/db";
import { createWalletClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { encodeFunctionData } from "viem";

const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY || '';
const SOULAAN_COIN_ADDRESS = process.env.SOULAAN_COIN_ADDRESS || '';
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

/**
 * Sync store SC-verification status to SoulaaniCoin contract
 * This enables automatic treasury reserve transfers for SC-verified stores in UnityCoin
 */
export async function syncStoreVerificationToContract(
  storeWalletAddress: string,
  isScVerified: boolean
): Promise<string> {
  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  if (!SOULAAN_COIN_ADDRESS) {
    throw new Error('SOULAAN_COIN_ADDRESS environment variable is required');
  }

  const backendAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: backendAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // Call setStoreVerification on SoulaaniCoin contract
  const txData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: 'store', type: 'address' },
          { name: 'isVerified', type: 'bool' },
        ],
        name: 'setStoreVerification',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    functionName: 'setStoreVerification',
    args: [storeWalletAddress as Address, isScVerified],
  });

  const txHash = await walletClient.sendTransaction({
    to: SOULAAN_COIN_ADDRESS as Address,
    data: txData,
  });

  console.log(`🏪 Store verification synced to SC contract: ${storeWalletAddress} = ${isScVerified} (tx: ${txHash})`);
  return txHash;
}

/**
 * Sync all SC-verified stores to the SoulaaniCoin contract
 * Should be run on deployment or when stores are updated
 */
export async function syncAllStores(): Promise<{ synced: number; failed: number }> {
  const stores = await db.store.findMany({
    where: {
      isScVerified: true,
      owner: {
        walletAddress: { not: null },
      },
    },
    select: {
      id: true,
      name: true,
      isScVerified: true,
      owner: {
        select: {
          walletAddress: true,
        },
      },
    },
  });

  let synced = 0;
  let failed = 0;

  for (const store of stores) {
    if (!store.owner.walletAddress) {
      console.warn(`⚠️ Store ${store.name} owner has no wallet address, skipping`);
      failed++;
      continue;
    }

    try {
      await syncStoreVerificationToContract(store.owner.walletAddress, store.isScVerified);
      synced++;
    } catch (error) {
      console.error(`❌ Failed to sync store ${store.name}:`, error);
      failed++;
    }
  }

  console.log(`✅ Store sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}
