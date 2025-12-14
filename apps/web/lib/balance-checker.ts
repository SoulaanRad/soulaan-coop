import { createPublicClient, http } from 'viem';
import { PrismaClient } from '@prisma/client';
import { config, chainConfig } from './config';
import { env } from '~/env';

// Initialize Prisma client directly since @repo/db exports aren't working in Next.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma?.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// ABI for SoulaaniCoin contract (only the functions we need)
const soulaaniCoinAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isActiveMember',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Create a public client for reading from the blockchain
function createClient() {
  return createPublicClient({
    chain: chainConfig as any,
    transport: http(config.chain.rpcUrl),
  });
}

/**
 * Check if a wallet has SoulaaniCoin and is an active member
 * @param address - The wallet address to check
 * @returns Boolean indicating if the wallet has SoulaaniCoin and is an active member
 */
export async function checkSoulaaniCoinBalance(address: string): Promise<boolean> {
  try {
    // If blockchain checks are disabled (test/dev mode without contract), return true
    if (config.features.skipBlockchainChecks) {
      console.warn('⚠️ Blockchain checks disabled - allowing access for development/testing');
      return true;
    }
    
    // Check if contract address is configured
    if (!config.contracts.soulaaniCoin) {
      console.error('❌ SoulaaniCoin contract address not configured');
      throw new Error('SoulaaniCoin contract address not configured');
    }

    const publicClient = createClient();

    // Read balance from contract
    const balance = await publicClient.readContract({
      address: config.contracts.soulaaniCoin,
      abi: soulaaniCoinAbi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    // Check if user is an active member
    const isActive = await publicClient.readContract({
      address: config.contracts.soulaaniCoin,
      abi: soulaaniCoinAbi,
      functionName: 'isActiveMember',
      args: [address as `0x${string}`],
    });

    // User must have a non-zero balance and be an active member
    const hasAccess = balance > 0n && isActive;

    console.log(`✅ Balance check for ${address}: balance=${balance}, isActive=${isActive}, hasAccess=${hasAccess}`);

    // Update the last balance check timestamp in the database if the user has a profile
    const profile = await db.userProfile.findUnique({
      where: { walletAddress: address },
    });

    if (profile) {
      await db.userProfile.update({
        where: { walletAddress: address },
        data: { 
          lastBalanceCheck: new Date(),
          // If the user no longer has access, clear their session
          ...(hasAccess ? {} : { sessionToken: null }),
        },
      });
    }

    return hasAccess;
  } catch (error) {
    console.error('❌ Error checking SoulaaniCoin balance:', error);
    
    // In development mode, log the error but allow access
    if (config.features.skipBlockchainChecks) {
      console.warn('⚠️ Error ignored in development mode');
      return true;
    }
    
    // In production, deny access on error
    return false;
  }
}

/**
 * Check balances for all users who haven't been checked recently
 * This function can be called by a cron job or scheduled task
 */
export async function checkAllBalances(): Promise<void> {
  try {
    // Skip in test mode
    if (env.NODE_ENV === 'test') {
      console.log('⏭️  Skipping balance checks in test mode');
      return;
    }
    
    // Find all profiles that haven't been checked in the last day
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const profiles = await db.userProfile.findMany({
      where: {
        OR: [
          { lastBalanceCheck: { lt: oneDayAgo } },
          { lastBalanceCheck: null },
        ],
      },
      select: {
        walletAddress: true,
      },
    });

    console.log(`🔍 Checking balances for ${profiles.length} users`);

    // Check each profile's balance
    for (const profile of profiles) {
      try {
        await checkSoulaaniCoinBalance(profile.walletAddress);
      } catch (err) {
        console.error(`❌ Error checking balance for ${profile.walletAddress}:`, err);
      }
    }

    console.log('✅ Balance check completed');
  } catch (error) {
    console.error('❌ Error in checkAllBalances:', error);
  }
}