import { createPublicClient, http, type Address } from 'viem';
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

// ABI for Safe (Gnosis Safe) multisig
const safeAbi = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'isOwner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// AccessControl role hashes
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

// ABI for contracts with AccessControl (Unity/Soulaani Coin)
const accessControlAbi = [
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    name: 'hasRole',
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
 * Check if a wallet is a Treasury Safe owner or has admin roles
 * @param address - The wallet address to check
 * @returns Object with admin status and role
 */
export async function checkAdminStatus(address: string): Promise<{ isAdmin: boolean; role?: string }> {
  console.log('\n🔍 ========== ADMIN CHECK START ==========');
  console.log(`   Address: ${address}`);

  try {
    // If blockchain checks are disabled, return false
    if (config.features.skipBlockchainChecks) {
      console.log('⚠️  Blockchain checks are DISABLED - skipping admin check');
      console.log('🔍 ========== ADMIN CHECK END (DISABLED) ==========\n');
      return { isAdmin: false };
    }

    const publicClient = createClient();

    // PRIORITY 1: Check if address is owner of Treasury Safe multisig
    console.log('\n📋 PRIORITY 1: Treasury Safe Owner Check');
    console.log(`   Treasury Safe Address: ${env.NEXT_PUBLIC_TREASURY_SAFE_ADDRESS || 'NOT SET'}`);

    if (env.NEXT_PUBLIC_TREASURY_SAFE_ADDRESS) {
      try {
        console.log(`   Calling isOwner(${address})...`);
        const isSafeOwner = await publicClient.readContract({
          address: env.NEXT_PUBLIC_TREASURY_SAFE_ADDRESS as Address,
          abi: safeAbi,
          functionName: 'isOwner',
          args: [address as Address],
        });

        console.log(`   Result: ${isSafeOwner}`);

        if (isSafeOwner) {
          console.log(`✅ ${address} is Treasury Safe owner (ADMIN)`);
          console.log('🔍 ========== ADMIN CHECK END (ADMIN FOUND) ==========\n');
          return { isAdmin: true, role: 'Treasury Safe Owner' };
        } else {
          console.log(`❌ ${address} is NOT a Treasury Safe owner`);
        }
      } catch (error) {
        console.error('❌ Error checking Treasury Safe ownership:', error);
        console.error('   Error details:', error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log('⚠️  NEXT_PUBLIC_TREASURY_SAFE_ADDRESS not set - skipping check');
    }

    // PRIORITY 2: Check if address has DEFAULT_ADMIN_ROLE on Soulaani Coin
    console.log('\n📋 PRIORITY 2: Soulaani Coin Admin Check');
    console.log(`   Soulaani Coin Address: ${config.contracts.soulaaniCoin || 'NOT SET'}`);

    if (config.contracts.soulaaniCoin) {
      try {
        console.log(`   Calling hasRole(DEFAULT_ADMIN_ROLE, ${address})...`);
        const isDefaultAdmin = await publicClient.readContract({
          address: config.contracts.soulaaniCoin,
          abi: accessControlAbi,
          functionName: 'hasRole',
          args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address as Address],
        });

        console.log(`   Result: ${isDefaultAdmin}`);

        if (isDefaultAdmin) {
          console.log(`✅ ${address} has DEFAULT_ADMIN_ROLE on Soulaani Coin`);
          console.log('🔍 ========== ADMIN CHECK END (ADMIN FOUND) ==========\n');
          return { isAdmin: true, role: 'Soulaani Coin Admin' };
        } else {
          console.log(`❌ ${address} does NOT have DEFAULT_ADMIN_ROLE on Soulaani Coin`);
        }
      } catch (error) {
        console.error('❌ Error checking Soulaani Coin admin role:', error);
        console.error('   Error details:', error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log('⚠️  Soulaani Coin address not set - skipping check');
    }

    console.log('\n❌ No admin roles found for this address');
    console.log('🔍 ========== ADMIN CHECK END (NOT ADMIN) ==========\n');
    return { isAdmin: false };
  } catch (error) {
    console.error('❌ FATAL ERROR in checkAdminStatus:', error);
    console.error('   Error details:', error instanceof Error ? error.message : String(error));
    console.log('🔍 ========== ADMIN CHECK END (ERROR) ==========\n');
    return { isAdmin: false };
  }
}

/**
 * Check if a wallet has portal access (either admin or SoulaaniCoin holder)
 * @param address - The wallet address to check
 * @returns Boolean indicating if the wallet has portal access
 */
export async function checkSoulaaniCoinBalance(address: string): Promise<boolean> {
  try {
    // If blockchain checks are disabled (test/dev mode without contract), return true
    if (config.features.skipBlockchainChecks) {
      console.warn('⚠️ Blockchain checks disabled - allowing access for development/testing');
      return true;
    }

    // FIRST: Check if user is an admin (Treasury Safe owner or contract admin)
    const adminStatus = await checkAdminStatus(address);
    if (adminStatus.isAdmin) {
      console.log(`✅ ${address} has admin access via ${adminStatus.role}`);

      // Update the user's role in database
      const profile = await db.userProfile.findUnique({
        where: { walletAddress: address },
      });

      if (profile) {
        await db.userProfile.update({
          where: { walletAddress: address },
          data: {
            lastBalanceCheck: new Date(),
            // Could add role field to profile if needed
          },
        });
      }

      return true;
    }

    // SECOND: Check SoulaaniCoin balance for regular members
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