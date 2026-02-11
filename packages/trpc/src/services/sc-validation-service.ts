import { createPublicClient, http, type Address, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { db } from '@repo/db';

// Environment configuration
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const SOULAANI_COIN_ADDRESS = (process.env.SOULAANI_COIN_ADDRESS || '') as Address;

// ERC20 ABI for balance and transfer queries
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
] as const;

// Create public client for reading blockchain data
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/**
 * Get user's on-chain SC balance
 * @param userId - User ID to check balance for
 * @returns SC balance as a number
 */
export async function validateSCBalance(userId: string): Promise<number> {
  try {
    // Get user's wallet address from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });

    if (!user?.walletAddress) {
      console.log(`User ${userId} has no wallet address`);
      return 0;
    }

    // Query on-chain balance
    const balance = await publicClient.readContract({
      address: SOULAANI_COIN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [user.walletAddress as Address],
    });

    // Convert from wei to SC (18 decimals)
    const scBalance = parseFloat(formatUnits(balance, 18));
    
    console.log(`✅ SC Balance for user ${userId}: ${scBalance} SC`);
    return scBalance;
  } catch (error) {
    console.error(`❌ Failed to get SC balance for user ${userId}:`, error);
    throw new Error(`Failed to query SC balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify that a transaction exists and succeeded on-chain
 * @param txHash - Transaction hash to verify
 * @returns Transaction details if found and successful
 */
export async function verifySCTransaction(txHash: string): Promise<{
  exists: boolean;
  success: boolean;
  from?: string;
  to?: string;
  amount?: number;
  blockNumber?: bigint;
}> {
  try {
    if (!txHash || !txHash.startsWith('0x')) {
      return { exists: false, success: false };
    }

    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as Address,
    });

    if (!receipt) {
      return { exists: false, success: false };
    }

    // Check if transaction was successful
    const success = receipt.status === 'success';

    // Try to extract transfer details from logs
    let from: string | undefined;
    let to: string | undefined;
    let amount: number | undefined;

    // Look for Transfer event in logs
    const transferLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === SOULAANI_COIN_ADDRESS.toLowerCase()
    );

    if (transferLog && transferLog.topics.length >= 3) {
      // Topics: [event signature, from (indexed), to (indexed)]
      from = `0x${transferLog.topics[1]?.slice(-40)}`;
      to = `0x${transferLog.topics[2]?.slice(-40)}`;
      
      // Data contains the amount
      if (transferLog.data) {
        const amountBigInt = BigInt(transferLog.data);
        amount = parseFloat(formatUnits(amountBigInt, 18));
      }
    }

    console.log(`✅ Transaction ${txHash} verified: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    return {
      exists: true,
      success,
      from,
      to,
      amount,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error(`❌ Failed to verify transaction ${txHash}:`, error);
    // If transaction doesn't exist, return exists: false
    if (error instanceof Error && error.message.includes('not found')) {
      return { exists: false, success: false };
    }
    throw new Error(`Failed to verify transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get total SC minted from the contract
 * @returns Total supply of SC tokens
 */
export async function getTotalSCMinted(): Promise<number> {
  try {
    const totalSupply = await publicClient.readContract({
      address: SOULAANI_COIN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    });

    const scTotal = parseFloat(formatUnits(totalSupply, 18));
    console.log(`✅ Total SC minted: ${scTotal} SC`);
    return scTotal;
  } catch (error) {
    console.error('❌ Failed to get total SC supply:', error);
    throw new Error(`Failed to query total SC supply: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reconcile SC records with blockchain state
 * Compares database records with on-chain balances to identify discrepancies
 * @returns Reconciliation report
 */
export async function reconcileSCRecords(): Promise<{
  totalRecords: number;
  checkedRecords: number;
  discrepancies: Array<{
    recordId: string;
    userId: string;
    dbStatus: string;
    txHash: string | null;
    onChainStatus: 'not_found' | 'failed' | 'success';
    shouldUpdate: boolean;
    suggestedStatus: 'COMPLETED' | 'FAILED';
  }>;
  summary: {
    shouldBeCompleted: number;
    shouldBeFailed: number;
    alreadyCorrect: number;
  };
}> {
  try {
    console.log('🔍 Starting SC records reconciliation...');

    // Get all SC reward records that have a txHash but are not COMPLETED
    const records = await db.sCRewardTransaction.findMany({
      where: {
        OR: [
          { status: 'PENDING', txHash: { not: null } },
          { status: 'FAILED', txHash: { not: null } },
        ],
      },
      select: {
        id: true,
        userId: true,
        status: true,
        txHash: true,
        amountSC: true,
      },
    });

    console.log(`📊 Found ${records.length} records to check`);

    const discrepancies: Array<{
      recordId: string;
      userId: string;
      dbStatus: string;
      txHash: string | null;
      onChainStatus: 'not_found' | 'failed' | 'success';
      shouldUpdate: boolean;
      suggestedStatus: 'COMPLETED' | 'FAILED';
    }> = [];

    let shouldBeCompleted = 0;
    let shouldBeFailed = 0;
    let alreadyCorrect = 0;

    // Check each record against blockchain
    for (const record of records) {
      if (!record.txHash) continue;

      const verification = await verifySCTransaction(record.txHash);

      let onChainStatus: 'not_found' | 'failed' | 'success';
      let shouldUpdate = false;
      let suggestedStatus: 'COMPLETED' | 'FAILED' = 'FAILED';

      if (!verification.exists) {
        onChainStatus = 'not_found';
        // Transaction doesn't exist - should be marked as FAILED
        if (record.status !== 'FAILED') {
          shouldUpdate = true;
          suggestedStatus = 'FAILED';
          shouldBeFailed++;
        } else {
          alreadyCorrect++;
        }
      } else if (verification.success) {
        onChainStatus = 'success';
        // Transaction succeeded - should be marked as COMPLETED
        if (record.status !== 'COMPLETED') {
          shouldUpdate = true;
          suggestedStatus = 'COMPLETED';
          shouldBeCompleted++;
        } else {
          alreadyCorrect++;
        }
      } else {
        onChainStatus = 'failed';
        // Transaction failed - should be marked as FAILED
        if (record.status !== 'FAILED') {
          shouldUpdate = true;
          suggestedStatus = 'FAILED';
          shouldBeFailed++;
        } else {
          alreadyCorrect++;
        }
      }

      if (shouldUpdate || onChainStatus !== 'success') {
        discrepancies.push({
          recordId: record.id,
          userId: record.userId,
          dbStatus: record.status,
          txHash: record.txHash,
          onChainStatus,
          shouldUpdate,
          suggestedStatus,
        });
      }
    }

    console.log('✅ Reconciliation complete');
    console.log(`   - Should be COMPLETED: ${shouldBeCompleted}`);
    console.log(`   - Should be FAILED: ${shouldBeFailed}`);
    console.log(`   - Already correct: ${alreadyCorrect}`);

    return {
      totalRecords: records.length,
      checkedRecords: records.length,
      discrepancies,
      summary: {
        shouldBeCompleted,
        shouldBeFailed,
        alreadyCorrect,
      },
    };
  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    throw new Error(`Failed to reconcile SC records: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a user has received SC for a specific amount (within tolerance)
 * Useful for validating if a reward was already minted
 * @param userId - User ID to check
 * @param expectedAmount - Expected SC amount
 * @param tolerance - Tolerance for amount matching (default 0.01 SC)
 * @returns True if user likely received the SC
 */
export async function hasUserReceivedSC(
  userId: string,
  expectedAmount: number,
  tolerance: number = 0.01
): Promise<boolean> {
  try {
    // Get user's current balance
    const currentBalance = await validateSCBalance(userId);

    // Get sum of all COMPLETED SC rewards for this user
    const completedRewards = await db.sCRewardTransaction.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      select: {
        amountSC: true,
      },
    });

    const totalCompletedSC = completedRewards.reduce((sum, r) => sum + r.amountSC, 0);

    // Check if on-chain balance is at least as much as completed rewards
    // (allowing for some tolerance due to floating point)
    const balanceMatches = currentBalance >= totalCompletedSC - tolerance;

    console.log(`Balance check for user ${userId}:`);
    console.log(`  On-chain: ${currentBalance} SC`);
    console.log(`  DB completed: ${totalCompletedSC} SC`);
    console.log(`  Matches: ${balanceMatches}`);

    return balanceMatches;
  } catch (error) {
    console.error(`Failed to check SC receipt for user ${userId}:`, error);
    return false;
  }
}

/**
 * Check if a user is an active member on-chain
 * @param userId - User ID to check
 * @returns Object with member status and details
 */
export async function checkMemberStatus(userId: string): Promise<{
  isActiveMember: boolean;
  memberStatus: number;
  memberSince: number;
  walletAddress: string;
}> {
  try {
    // Get user's wallet address from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });

    if (!user?.walletAddress) {
      throw new Error(`User ${userId} has no wallet address`);
    }

    // Check member status on-chain
    const [isActiveMember, memberStatus, memberSince] = await Promise.all([
      publicClient.readContract({
        address: SOULAANI_COIN_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'isActiveMember',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'isActiveMember',
        args: [user.walletAddress as Address],
      }),
      publicClient.readContract({
        address: SOULAANI_COIN_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'memberStatus',
            outputs: [{ name: '', type: 'uint8' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'memberStatus',
        args: [user.walletAddress as Address],
      }),
      publicClient.readContract({
        address: SOULAANI_COIN_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'memberSince',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'memberSince',
        args: [user.walletAddress as Address],
      }),
    ]);

    return {
      isActiveMember: isActiveMember as boolean,
      memberStatus: Number(memberStatus),
      memberSince: Number(memberSince),
      walletAddress: user.walletAddress,
    };
  } catch (error) {
    console.error(`Failed to check member status for user ${userId}:`, error);
    throw error;
  }
}
