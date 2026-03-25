/**
 * Reward Policy Service - Business rules for SC minting
 * 
 * This service evaluates when and how much SC should be minted based on:
 * - Payment verification (Stripe webhook confirmed)
 * - Business eligibility (SC-verified merchants)
 * - User eligibility (active SC members)
 * - Reward calculation rules
 * 
 * Acts as orchestrator between payment events and SC token service.
 */

import { db } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { mintSC } from './sc-token-service.js';
import { isActiveMember } from './blockchain.js';

// Reward configuration
const SC_REWARD_RATE = 10; // 10 SC per $1 spent
const MIN_REWARD_THRESHOLD = 1; // Minimum 1 SC to mint (avoid dust)

/**
 * Calculate SC reward for a transaction amount
 * 
 * @param amountUSD - Transaction amount in USD
 * @returns SC reward amount (whole number)
 */
export function calculateSCReward(amountUSD: number): number {
  return Math.round(amountUSD * SC_REWARD_RATE);
}

/**
 * Evaluate and execute SC rewards for a completed commerce transaction
 * 
 * @param params - Transaction parameters
 * @returns Reward result
 */
export async function evaluateAndMintCommerceReward(params: {
  transactionId: string;
  customerId: string;
  customerWalletAddress: string;
  businessId: string;
  businessOwnerId: string;
  businessOwnerWalletAddress: string;
  amountUSD: number;
  isScVerifiedBusiness: boolean;
  coopId: string;
}): Promise<{
  customerReward: {
    eligible: boolean;
    amount: number;
    commandId?: string;
    txHash?: string;
    reason?: string;
  };
  merchantReward: {
    eligible: boolean;
    amount: number;
    commandId?: string;
    txHash?: string;
    reason?: string;
  };
}> {
  const {
    transactionId,
    customerId,
    customerWalletAddress,
    businessId,
    businessOwnerId,
    businessOwnerWalletAddress,
    amountUSD,
    isScVerifiedBusiness,
    coopId,
  } = params;

  console.log(`🎁 [Reward Policy] Evaluating rewards for transaction ${transactionId}`);

  const result: {
    customerReward: {
      eligible: boolean;
      amount: number;
      commandId?: string;
      txHash?: string;
      reason?: string;
    };
    merchantReward: {
      eligible: boolean;
      amount: number;
      commandId?: string;
      txHash?: string;
      reason?: string;
    };
  } = {
    customerReward: {
      eligible: false,
      amount: 0,
      reason: undefined,
    },
    merchantReward: {
      eligible: false,
      amount: 0,
      reason: undefined,
    },
  };

  // Rule 1: Only SC-verified businesses earn rewards
  if (!isScVerifiedBusiness) {
    console.log(`❌ [Reward Policy] Business ${businessId} is not SC-verified, no rewards`);
    result.customerReward.reason = 'Business not SC-verified';
    result.merchantReward.reason = 'Business not SC-verified';
    return result;
  }

  // Calculate reward amount
  const scReward = calculateSCReward(amountUSD);

  // Rule 2: Minimum reward threshold
  if (scReward < MIN_REWARD_THRESHOLD) {
    console.log(`❌ [Reward Policy] Reward too small (${scReward} SC), below threshold`);
    result.customerReward.reason = 'Reward below minimum threshold';
    result.merchantReward.reason = 'Reward below minimum threshold';
    return result;
  }

  // Check customer eligibility
  const customerEligibility = await checkUserEligibility(customerId, customerWalletAddress);
  if (customerEligibility.eligible) {
    result.customerReward.eligible = true;
    result.customerReward.amount = scReward;

    try {
      // Mint SC to customer
      const mintResult = await mintSC({
        idempotencyKey: `commerce-customer-${transactionId}`,
        userId: customerId,
        walletAddress: customerWalletAddress,
        coopTokenClass: coopId,
        amount: scReward,
        sourceTransactionId: transactionId,
        sourceType: 'COMMERCE_REWARD',
        metadata: {
          role: 'customer',
          businessId,
          amountUSD,
        },
      });

      result.customerReward.commandId = mintResult.commandId;
      result.customerReward.txHash = mintResult.txHash;
      result.customerReward.amount = mintResult.actualAmount;

      console.log(`✅ [Reward Policy] Customer reward: ${mintResult.actualAmount} SC (tx: ${mintResult.txHash})`);
    } catch (error) {
      console.error(`❌ [Reward Policy] Failed to mint customer reward:`, error);
      result.customerReward.reason = error instanceof Error ? error.message : 'Mint failed';
    }
  } else {
    result.customerReward.reason = customerEligibility.reason;
    console.log(`❌ [Reward Policy] Customer not eligible: ${customerEligibility.reason}`);
  }

  // Check merchant eligibility
  const merchantEligibility = await checkUserEligibility(businessOwnerId, businessOwnerWalletAddress);
  if (merchantEligibility.eligible) {
    result.merchantReward.eligible = true;
    result.merchantReward.amount = scReward;

    try {
      // Mint SC to merchant
      const mintResult = await mintSC({
        idempotencyKey: `commerce-merchant-${transactionId}`,
        userId: businessOwnerId,
        walletAddress: businessOwnerWalletAddress,
        coopTokenClass: coopId,
        amount: scReward,
        sourceTransactionId: transactionId,
        sourceType: 'COMMERCE_REWARD',
        metadata: {
          role: 'merchant',
          businessId,
          amountUSD,
        },
      });

      result.merchantReward.commandId = mintResult.commandId;
      result.merchantReward.txHash = mintResult.txHash;
      result.merchantReward.amount = mintResult.actualAmount;

      console.log(`✅ [Reward Policy] Merchant reward: ${mintResult.actualAmount} SC (tx: ${mintResult.txHash})`);
    } catch (error) {
      console.error(`❌ [Reward Policy] Failed to mint merchant reward:`, error);
      result.merchantReward.reason = error instanceof Error ? error.message : 'Mint failed';
    }
  } else {
    result.merchantReward.reason = merchantEligibility.reason;
    console.log(`❌ [Reward Policy] Merchant not eligible: ${merchantEligibility.reason}`);
  }

  return result;
}

/**
 * Check if a user is eligible for SC rewards
 * 
 * @param userId - User ID
 * @param walletAddress - User's wallet address
 * @returns Eligibility result
 */
async function checkUserEligibility(
  userId: string,
  walletAddress: string
): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  // Check if user exists
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  });

  if (!user) {
    return { eligible: false, reason: 'User not found' };
  }

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    return { eligible: false, reason: `User status: ${user.status}` };
  }

  // Check if user is an active SC member on-chain
  try {
    const isActive = await isActiveMember(walletAddress);
    if (!isActive) {
      return { eligible: false, reason: 'Not an active SC member' };
    }
  } catch (error) {
    console.error(`❌ [Reward Policy] Failed to check membership for ${walletAddress}:`, error);
    return { eligible: false, reason: 'Failed to verify membership' };
  }

  return { eligible: true };
}

/**
 * Evaluate and execute manual SC grant (admin operation)
 * 
 * @param params - Grant parameters
 * @returns Grant result
 */
export async function evaluateAndMintManualGrant(params: {
  userId: string;
  walletAddress: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  coopId: string;
  approvalRequestId?: string;
}): Promise<{
  eligible: boolean;
  commandId?: string;
  txHash?: string;
  actualAmount?: number;
  reason?: string;
}> {
  const { userId, walletAddress, amount, reason, authorizedBy, coopId, approvalRequestId } = params;

  console.log(`🎁 [Reward Policy] Evaluating manual grant: ${amount} SC to ${userId} (coop: ${coopId})`);

  // Check user eligibility
  const eligibility = await checkUserEligibility(userId, walletAddress);
  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
    };
  }

  try {
    // Mint SC
    const mintResult = await mintSC({
      idempotencyKey: approvalRequestId || `manual-grant-${userId}-${Date.now()}`,
      userId,
      walletAddress,
      coopTokenClass: coopId,
      amount,
      sourceType: 'MANUAL_GRANT',
      metadata: {
        reason,
        authorizedBy,
        approvalRequestId,
      },
    });

    console.log(`✅ [Reward Policy] Manual grant: ${mintResult.actualAmount} SC (tx: ${mintResult.txHash})`);

    return {
      eligible: true,
      commandId: mintResult.commandId,
      txHash: mintResult.txHash,
      actualAmount: mintResult.actualAmount,
    };
  } catch (error) {
    console.error(`❌ [Reward Policy] Failed to mint manual grant:`, error);
    return {
      eligible: false,
      reason: error instanceof Error ? error.message : 'Mint failed',
    };
  }
}

/**
 * Evaluate and execute onboarding reward (new member bonus)
 * 
 * @param params - Onboarding parameters
 * @returns Reward result
 */
export async function evaluateAndMintOnboardingReward(params: {
  userId: string;
  walletAddress: string;
  onboardingAmount: number;
  coopId: string;
}): Promise<{
  eligible: boolean;
  commandId?: string;
  txHash?: string;
  actualAmount?: number;
  reason?: string;
}> {
  const { userId, walletAddress, onboardingAmount, coopId } = params;

  console.log(`🎁 [Reward Policy] Evaluating onboarding reward: ${onboardingAmount} SC to ${userId} (coop: ${coopId})`);

  // Check if user already received onboarding reward for this coop
  const existingReward = await db.sCMintEvent.findFirst({
    where: {
      userId,
      coopTokenClass: coopId,
      sourceType: 'ONBOARDING',
      status: 'COMPLETED',
    },
  });

  if (existingReward) {
    return {
      eligible: false,
      reason: 'User already received onboarding reward for this coop',
    };
  }

  // Check user eligibility
  const eligibility = await checkUserEligibility(userId, walletAddress);
  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
    };
  }

  try {
    // Mint SC
    const mintResult = await mintSC({
      idempotencyKey: `onboarding-${userId}-${coopId}`,
      userId,
      walletAddress,
      coopTokenClass: coopId,
      amount: onboardingAmount,
      sourceType: 'ONBOARDING',
      metadata: {
        reason: 'New member onboarding bonus',
      },
    });

    console.log(`✅ [Reward Policy] Onboarding reward: ${mintResult.actualAmount} SC (tx: ${mintResult.txHash})`);

    return {
      eligible: true,
      commandId: mintResult.commandId,
      txHash: mintResult.txHash,
      actualAmount: mintResult.actualAmount,
    };
  } catch (error) {
    console.error(`❌ [Reward Policy] Failed to mint onboarding reward:`, error);
    return {
      eligible: false,
      reason: error instanceof Error ? error.message : 'Mint failed',
    };
  }
}

/**
 * Get reward policy configuration
 * 
 * @returns Current reward policy settings
 */
export function getRewardPolicyConfig(): {
  scRewardRate: number;
  minRewardThreshold: number;
  description: string;
} {
  return {
    scRewardRate: SC_REWARD_RATE,
    minRewardThreshold: MIN_REWARD_THRESHOLD,
    description: `${SC_REWARD_RATE} SC per $1 spent at SC-verified businesses`,
  };
}

/**
 * Validate reward eligibility without executing mint
 * Useful for UI preview/estimation
 * 
 * @param params - Validation parameters
 * @returns Eligibility result with estimated rewards
 */
export async function validateRewardEligibility(params: {
  customerId: string;
  customerWalletAddress: string;
  businessId: string;
  businessOwnerId: string;
  businessOwnerWalletAddress: string;
  amountUSD: number;
}): Promise<{
  customerEligible: boolean;
  customerEstimatedReward: number;
  customerReason?: string;
  merchantEligible: boolean;
  merchantEstimatedReward: number;
  merchantReason?: string;
  businessScVerified: boolean;
}> {
  const { customerId, customerWalletAddress, businessId, businessOwnerId, businessOwnerWalletAddress, amountUSD } =
    params;

  // Check if business is SC-verified
  const business = await db.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    return {
      customerEligible: false,
      customerEstimatedReward: 0,
      customerReason: 'Business not found',
      merchantEligible: false,
      merchantEstimatedReward: 0,
      merchantReason: 'Business not found',
      businessScVerified: false,
    };
  }

  // Get store verification status separately
  const store = await db.store.findFirst({
    where: { ownerId: business.ownerId },
    select: { isScVerified: true },
  });

  const businessScVerified = store?.isScVerified || false;

  if (!businessScVerified) {
    return {
      customerEligible: false,
      customerEstimatedReward: 0,
      customerReason: 'Business not SC-verified',
      merchantEligible: false,
      merchantEstimatedReward: 0,
      merchantReason: 'Business not SC-verified',
      businessScVerified: false,
    };
  }

  const scReward = calculateSCReward(amountUSD);

  if (scReward < MIN_REWARD_THRESHOLD) {
    return {
      customerEligible: false,
      customerEstimatedReward: 0,
      customerReason: 'Reward below minimum threshold',
      merchantEligible: false,
      merchantEstimatedReward: 0,
      merchantReason: 'Reward below minimum threshold',
      businessScVerified: true,
    };
  }

  // Check customer eligibility
  const customerEligibility = await checkUserEligibility(customerId, customerWalletAddress);

  // Check merchant eligibility
  const merchantEligibility = await checkUserEligibility(businessOwnerId, businessOwnerWalletAddress);

  return {
    customerEligible: customerEligibility.eligible,
    customerEstimatedReward: customerEligibility.eligible ? scReward : 0,
    customerReason: customerEligibility.reason,
    merchantEligible: merchantEligibility.eligible,
    merchantEstimatedReward: merchantEligibility.eligible ? scReward : 0,
    merchantReason: merchantEligibility.reason,
    businessScVerified: true,
  };
}
