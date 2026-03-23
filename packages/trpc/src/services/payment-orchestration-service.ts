/**
 * Payment Orchestration Service - Commerce transaction creation and Stripe Connect charges
 * 
 * Responsibilities:
 * - Create commerce transaction intents
 * - Calculate fee splits from FeeConfig
 * - Create Stripe payment intents with destination charges
 * - Link Stripe payment to internal commerce transaction
 * 
 * Uses Stripe Connect "Destination Charges" model:
 * - Platform charges customer
 * - Platform routes merchant share to connected account
 * - Platform retains treasury/platform fees automatically
 */

import { db } from '@repo/db';
import type Stripe from 'stripe';
import { TRPCError } from '@trpc/server';

/**
 * Get active fee configuration
 * 
 * @returns Active fee config
 */
export async function getActiveFeeConfig(): Promise<{
  id: string;
  platformMarkupBps: number;
  merchantFeeBps: number;
  treasuryFeeBps: number;
}> {
  const config = await db.feeConfig.findFirst({
    where: {
      isActive: true,
      effectiveFrom: {
        lte: new Date(),
      },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gt: new Date() } },
      ],
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  });

  if (!config) {
    // Default fallback config
    console.warn(`⚠️ [Payment Orchestration] No active fee config found, using defaults`);
    return {
      id: 'default',
      platformMarkupBps: 400, // 4%
      merchantFeeBps: 0,
      treasuryFeeBps: 400, // 4%
    };
  }

  return {
    id: config.id,
    platformMarkupBps: config.platformMarkupBps,
    merchantFeeBps: config.merchantFeeBps,
    treasuryFeeBps: config.treasuryFeeBps,
  };
}

/**
 * Calculate price breakdown for a transaction
 * 
 * @param listedAmount - Original item price in cents
 * @param feeConfig - Fee configuration
 * @returns Price breakdown
 */
export function calculatePriceBreakdown(
  listedAmount: number,
  feeConfig: {
    platformMarkupBps: number;
    merchantFeeBps: number;
    treasuryFeeBps: number;
  }
): {
  listedAmount: number;
  chargedAmount: number;
  merchantSettlementAmount: number;
  treasuryFeeAmount: number;
  platformFeeAmount: number;
} {
  // All amounts in cents

  // Platform markup (added to customer charge)
  const platformMarkup = Math.round((listedAmount * feeConfig.platformMarkupBps) / 10000);

  // Total charged to customer
  const chargedAmount = listedAmount + platformMarkup;

  // Treasury fee (deducted from merchant settlement)
  const treasuryFee = Math.round((listedAmount * feeConfig.treasuryFeeBps) / 10000);

  // Merchant fee (future use, currently 0)
  const merchantFee = Math.round((listedAmount * feeConfig.merchantFeeBps) / 10000);

  // Merchant receives: listed amount - treasury fee - merchant fee
  const merchantSettlementAmount = listedAmount - treasuryFee - merchantFee;

  // Platform retains: platform markup + treasury fee + merchant fee
  const platformFeeAmount = platformMarkup + treasuryFee + merchantFee;

  return {
    listedAmount,
    chargedAmount,
    merchantSettlementAmount,
    treasuryFeeAmount: treasuryFee,
    platformFeeAmount,
  };
}

/**
 * Create a commerce transaction and Stripe payment intent
 * 
 * @param params - Transaction parameters
 * @returns Created transaction and payment intent
 */
export async function createCommerceTransaction(params: {
  customerId: string;
  businessId: string;
  listedAmountCents: number;
  coopId: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  transaction: {
    id: string;
    listedAmount: number;
    chargedAmount: number;
    merchantSettlementAmount: number;
    treasuryFeeAmount: number;
  };
  paymentIntent: {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
  };
}> {
  const { customerId, businessId, listedAmountCents, currency = 'usd', metadata } = params;

  console.log(`💳 [Payment Orchestration] Creating commerce transaction: $${listedAmountCents / 100} for business ${businessId}`);

  // Get business and connected account
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      stripeAccount: true,
    },
  });

  if (!business) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Business not found',
    });
  }

  if (!business.stripeAccount) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Business does not have a Stripe Connect account',
    });
  }

  if (!business.stripeAccount.chargesEnabled) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Business is not yet enabled to accept charges',
    });
  }

  // Get active fee config
  const feeConfig = await getActiveFeeConfig();

  // Calculate price breakdown
  const breakdown = calculatePriceBreakdown(listedAmountCents, feeConfig);

  console.log(`💰 [Payment Orchestration] Price breakdown:`, {
    listed: `$${breakdown.listedAmount / 100}`,
    charged: `$${breakdown.chargedAmount / 100}`,
    merchantSettlement: `$${breakdown.merchantSettlementAmount / 100}`,
    treasuryFee: `$${breakdown.treasuryFeeAmount / 100}`,
    platformFee: `$${breakdown.platformFeeAmount / 100}`,
  });

  // Create commerce transaction record
  const transaction = await db.commerceTransaction.create({
    data: {
      customerId,
      businessId,
      coopId: params.coopId,
      listedAmount: breakdown.listedAmount / 100, // Store as dollars
      chargedAmount: breakdown.chargedAmount / 100,
      merchantSettlementAmount: breakdown.merchantSettlementAmount / 100,
      treasuryFeeAmount: breakdown.treasuryFeeAmount / 100,
      currency: currency.toUpperCase(),
      status: 'PENDING',
      metadata: metadata as any,
      // Store fee snapshot for historical accuracy
      platformMarkupBps: feeConfig.platformMarkupBps,
      treasuryFeeBps: feeConfig.treasuryFeeBps,
    },
  });

  console.log(`✅ [Payment Orchestration] Transaction created: ${transaction.id}`);

  // Create Stripe payment intent with destination charge
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: breakdown.chargedAmount, // Total charged to customer
    currency,
    // Destination charge: route merchant share to connected account
    transfer_data: {
      destination: business.stripeAccount.stripeAccountId,
      amount: breakdown.merchantSettlementAmount, // Amount merchant receives
    },
    metadata: {
      commerceTransactionId: transaction.id,
      customerId,
      businessId,
    },
  });

  console.log(`✅ [Payment Orchestration] Payment intent created: ${paymentIntent.id}`);

  // Update transaction with payment intent ID
  await db.commerceTransaction.update({
    where: { id: transaction.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
      stripeDestinationAccountId: business.stripeAccount.stripeAccountId,
      status: 'PROCESSING',
    },
  });

  return {
    transaction: {
      id: transaction.id,
      listedAmount: breakdown.listedAmount / 100,
      chargedAmount: breakdown.chargedAmount / 100,
      merchantSettlementAmount: breakdown.merchantSettlementAmount / 100,
      treasuryFeeAmount: breakdown.treasuryFeeAmount / 100,
    },
    paymentIntent: {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    },
  };
}

/**
 * Process successful payment (called from webhook handler)
 * 
 * @param params - Payment parameters
 * @returns Processing result
 */
export async function processSuccessfulPayment(params: {
  stripePaymentIntentId: string;
  stripeChargeId: string;
}): Promise<{
  transactionId: string;
  customerId: string;
  businessId: string;
  amountUSD: number;
  treasuryFeeUSD: number;
}> {
  const { stripePaymentIntentId, stripeChargeId } = params;

  console.log(`✅ [Payment Orchestration] Processing successful payment: ${stripePaymentIntentId}`);

  // Find transaction
  const transaction = await db.commerceTransaction.findUnique({
    where: { stripePaymentIntentId },
    include: {
      customer: true,
      business: true,
    },
  });

  if (!transaction) {
    throw new Error(`Transaction not found for payment intent: ${stripePaymentIntentId}`);
  }

  // Check if already completed (idempotency)
  if (transaction.status === 'COMPLETED') {
    console.log(`⚠️ [Payment Orchestration] Transaction already completed: ${transaction.id}`);
    return {
      transactionId: transaction.id,
      customerId: transaction.customerId,
      businessId: transaction.businessId,
      amountUSD: transaction.listedAmount,
      treasuryFeeUSD: transaction.treasuryFeeAmount,
    };
  }

  // Update transaction as completed
  await db.commerceTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'COMPLETED',
      stripeChargeId,
      completedAt: new Date(),
    },
  });

  console.log(`✅ [Payment Orchestration] Transaction completed: ${transaction.id}`);

  return {
    transactionId: transaction.id,
    customerId: transaction.customerId,
    businessId: transaction.businessId,
    amountUSD: transaction.listedAmount,
    treasuryFeeUSD: transaction.treasuryFeeAmount,
  };
}

/**
 * Process failed payment (called from webhook handler)
 * 
 * @param params - Payment parameters
 */
export async function processFailedPayment(params: {
  stripePaymentIntentId: string;
  failureReason: string;
}): Promise<void> {
  const { stripePaymentIntentId, failureReason } = params;

  console.log(`❌ [Payment Orchestration] Processing failed payment: ${stripePaymentIntentId}`);

  const transaction = await db.commerceTransaction.findUnique({
    where: { stripePaymentIntentId },
  });

  if (!transaction) {
    console.warn(`⚠️ [Payment Orchestration] Transaction not found for failed payment: ${stripePaymentIntentId}`);
    return;
  }

  await db.commerceTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      failureReason,
    },
  });

  console.log(`✅ [Payment Orchestration] Transaction marked as failed: ${transaction.id}`);
}

/**
 * Get transaction by Stripe payment intent ID
 * 
 * @param stripePaymentIntentId - Stripe payment intent ID
 * @returns Transaction data or null
 */
export async function getTransactionByPaymentIntent(
  stripePaymentIntentId: string
): Promise<{
  id: string;
  customerId: string;
  businessId: string;
  status: string;
  listedAmount: number;
  chargedAmount: number;
  merchantSettlementAmount: number;
  treasuryFeeAmount: number;
} | null> {
  const transaction = await db.commerceTransaction.findUnique({
    where: { stripePaymentIntentId },
  });

  if (!transaction) {
    return null;
  }

  return {
    id: transaction.id,
    customerId: transaction.customerId,
    businessId: transaction.businessId,
    status: transaction.status,
    listedAmount: transaction.listedAmount,
    chargedAmount: transaction.chargedAmount,
    merchantSettlementAmount: transaction.merchantSettlementAmount,
    treasuryFeeAmount: transaction.treasuryFeeAmount,
  };
}
