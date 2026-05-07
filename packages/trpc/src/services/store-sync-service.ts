import { db } from "@repo/db";
import { createWalletClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { encodeFunctionData } from "viem";

const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY || '';
const DEFAULT_RPC_URL = 'https://sepolia.base.org';

interface SyncConfig {
  scTokenAddress: string;
  rpcUrl?: string | null;
}

/**
 * Sync store SC-verification status to SoulaaniCoin contract.
 * Addresses come from CoopConfig (not env vars).
 */
export async function syncStoreVerificationToContract(
  storeWalletAddress: string,
  isScVerified: boolean,
  config: SyncConfig,
): Promise<string> {
  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  const backendAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: backendAccount,
    chain: baseSepolia,
    transport: http(config.rpcUrl || DEFAULT_RPC_URL),
  });

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
    to: config.scTokenAddress as Address,
    data: txData,
  });

  console.log(`🏪 Store verification synced to SC contract: ${storeWalletAddress} = ${isScVerified} (tx: ${txHash})`);
  return txHash;
}

/**
 * Sync all SC-verified stores to the SoulaaniCoin contract.
 * Loads contract addresses from CoopConfig.
 */
export async function syncAllStores(coopId: string): Promise<{ synced: number; failed: number }> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { scTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.scTokenAddress) {
    throw new Error(`scTokenAddress not configured in CoopConfig for ${coopId}`);
  }

  const syncConfig: SyncConfig = {
    scTokenAddress: coopConfig.scTokenAddress,
    rpcUrl: coopConfig.rpcUrl,
  };

  const stores = await db.store.findMany({
    where: { coopId, isScVerified: true, owner: { walletAddress: { not: null } } },
    select: {
      id: true,
      name: true,
      isScVerified: true,
      owner: { select: { walletAddress: true } },
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
      await syncStoreVerificationToContract(store.owner.walletAddress, store.isScVerified, syncConfig);
      synced++;
    } catch (error) {
      console.error(`❌ Failed to sync store ${store.name}:`, error);
      failed++;
    }
  }

  console.log(`✅ Store sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}
