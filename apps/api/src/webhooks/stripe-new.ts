/**
 * New Stripe Webhook Handler - Hybrid Architecture
 * 
 * This is the new webhook handler that follows the bounded context architecture:
 * 1. Verify and persist webhook event (idempotency)
 * 2. Process payment confirmation
 * 3. Record treasury ledger entries
 * 4. Evaluate and execute SC rewards (separate from payment)
 * 
 * Replaces the old direct webhook-to-token flow with proper separation of concerns.
 */

import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import {
  verifyAndPersistWebhook,
  markEventAsProcessed,
} from '@repo/trpc/services/payment-webhook-service';
import {
  processSuccessfulPayment,
  processFailedPayment,
} from '@repo/trpc/services/payment-orchestration-service';
import { recordFeeCollection } from '@repo/trpc/services/treasury-ledger-service';
import { evaluateAndMintCommerceReward } from '@repo/trpc/services/reward-policy-service';
import { db } from '@repo/db';

/**
 * New Stripe webhook handler
 * 
 * Webhook URL: POST /webhooks/stripe-new
 */
export async function handleStripeWebhookNew(req: Request, res: Response) {
  console.log('\n🔷 STRIPE WEBHOOK (NEW) - START');

  try {
    // Step 1: Verify and persist webhook event
    const signature = req.headers['stripe-signature'] as string | undefined;
    const hookdeckSignature = req.headers['x-hookdeck-signature'] as string | undefined;

    const { event, eventRecord, isNewEvent } = await verifyAndPersistWebhook({
      payload: req.body,
      signature,
      hookdeckSignature,
    });

    // If already processed, return early
    if (!isNewEvent && eventRecord.processed) {
      console.log(`⚠️ [Stripe Webhook] Event already processed: ${eventRecord.id}`);
      return res.json({ received: true, message: 'Already processed' });
    }

    console.log(`📨 [Stripe Webhook] Processing event: ${event.type}`);

    // Step 2: Handle event based on type
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event);
          break;

        case 'account.updated':
          await handleAccountUpdated(event);
          break;

        default:
          console.log(`⚠️ [Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await markEventAsProcessed(eventRecord.id);

      console.log(`✅ [Stripe Webhook] Event processed successfully: ${eventRecord.id}`);
      return res.json({ received: true });
    } catch (processingError) {
      console.error(`❌ [Stripe Webhook] Error processing event:`, processingError);

      // Don't mark as processed - allow retry
      return res.status(500).json({
        error: 'Event processing failed',
        message: processingError instanceof Error ? processingError.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error(`💥 [Stripe Webhook] Fatal error:`, error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`💳 [Stripe Webhook] Payment succeeded: ${paymentIntent.id}`);
  console.log(`💰 [Stripe Webhook] Amount: $${paymentIntent.amount / 100}`);

  // Step 2a: Process payment confirmation
  const paymentResult = await processSuccessfulPayment({
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: paymentIntent.latest_charge as string,
  });

  console.log(`✅ [Stripe Webhook] Payment processed: transaction ${paymentResult.transactionId}`);

  // Step 2b: Record treasury ledger entry
  await recordFeeCollection({
    sourceTransactionId: paymentResult.transactionId,
    amount: paymentResult.treasuryFeeUSD,
    currency: 'USD',
    metadata: {
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: paymentIntent.latest_charge as string,
    },
  });

  console.log(`✅ [Stripe Webhook] Treasury fee recorded: $${paymentResult.treasuryFeeUSD}`);

  // Step 2c: Evaluate and execute SC rewards
  // Get business and customer wallet addresses
  const transaction = await db.commerceTransaction.findUnique({
    where: { id: paymentResult.transactionId },
    include: {
      customer: {
        include: {
          wallets: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
      business: {
        include: {
          owner: {
            include: {
              wallets: {
                where: { isPrimary: true },
                take: 1,
              },
              stores: {
                select: { isScVerified: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!transaction) {
    console.error(`❌ [Stripe Webhook] Transaction not found: ${paymentResult.transactionId}`);
    return;
  }

  const customerWallet = transaction.customer.wallets[0];
  const businessOwnerWallet = transaction.business.owner.wallets[0];
  const isScVerified = transaction.business.owner.stores?.[0]?.isScVerified || false;

  // Fallback to legacy walletAddress if no Wallet records exist yet
  const customerWalletAddress = customerWallet?.address || transaction.customer.walletAddress;
  const businessOwnerWalletAddress = businessOwnerWallet?.address || transaction.business.owner.walletAddress;

  if (!customerWalletAddress || !businessOwnerWalletAddress) {
    console.warn(`⚠️ [Stripe Webhook] Missing wallet addresses, skipping rewards`);
    return;
  }

  // Step 2c: Evaluate and execute SC rewards (with explicit mismatch handling)
  let rewardResult;
  try {
    rewardResult = await evaluateAndMintCommerceReward({
      transactionId: paymentResult.transactionId,
      customerId: paymentResult.customerId,
      customerWalletAddress,
      businessId: paymentResult.businessId,
      businessOwnerId: transaction.business.ownerId,
      businessOwnerWalletAddress,
      amountUSD: paymentResult.amountUSD,
      isScVerifiedBusiness: isScVerified,
    });

    if (rewardResult.customerReward.eligible) {
      if (rewardResult.customerReward.status === 'COMPLETED') {
        console.log(`✅ [Stripe Webhook] Customer reward: ${rewardResult.customerReward.amount} SC (tx: ${rewardResult.customerReward.txHash})`);
      } else if (rewardResult.customerReward.status === 'PENDING') {
        console.warn(`⚠️ [MISMATCH] Customer reward PENDING: Payment completed but SC mint still processing`);
      } else if (rewardResult.customerReward.status === 'FAILED') {
        console.error(`❌ [MISMATCH] Customer reward FAILED: Payment completed but SC mint failed - ${rewardResult.customerReward.reason}`);
      }
    } else {
      console.log(`⚠️ [Stripe Webhook] Customer not eligible for reward: ${rewardResult.customerReward.reason}`);
    }

    if (rewardResult.merchantReward.eligible) {
      if (rewardResult.merchantReward.status === 'COMPLETED') {
        console.log(`✅ [Stripe Webhook] Merchant reward: ${rewardResult.merchantReward.amount} SC (tx: ${rewardResult.merchantReward.txHash})`);
      } else if (rewardResult.merchantReward.status === 'PENDING') {
        console.warn(`⚠️ [MISMATCH] Merchant reward PENDING: Payment completed but SC mint still processing`);
      } else if (rewardResult.merchantReward.status === 'FAILED') {
        console.error(`❌ [MISMATCH] Merchant reward FAILED: Payment completed but SC mint failed - ${rewardResult.merchantReward.reason}`);
      }
    } else {
      console.log(`⚠️ [Stripe Webhook] Merchant not eligible for reward: ${rewardResult.merchantReward.reason}`);
    }
  } catch (rewardError) {
    console.error(`❌ [MISMATCH] SC reward processing failed entirely:`, rewardError);
    console.error(`⚠️ [MISMATCH] Payment COMPLETED but rewards FAILED - manual intervention may be required`);
  }

  console.log(`🎉 [Stripe Webhook] Payment processing complete!`);
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`❌ [Stripe Webhook] Payment failed: ${paymentIntent.id}`);

  await processFailedPayment({
    stripePaymentIntentId: paymentIntent.id,
    failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
  });

  console.log(`✅ [Stripe Webhook] Payment failure recorded`);
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  console.log(`💸 [Stripe Webhook] Charge refunded: ${charge.id}`);

  // Find transaction by charge ID
  const transaction = await db.commerceTransaction.findFirst({
    where: { stripeChargeId: charge.id },
  });

  if (!transaction) {
    console.warn(`⚠️ [Stripe Webhook] Transaction not found for refunded charge: ${charge.id}`);
    return;
  }

  // Update transaction status
  await db.commerceTransaction.update({
    where: { id: transaction.id },
    data: {
      status: charge.amount_refunded === charge.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
    },
  });

  // TODO: Record treasury ledger reversal
  // TODO: Consider SC burn for refunded rewards (future enhancement)

  console.log(`✅ [Stripe Webhook] Refund recorded for transaction: ${transaction.id}`);
}

/**
 * Handle account.updated event (Stripe Connect account status changes)
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  console.log(`🔄 [Stripe Webhook] Account updated: ${account.id}`);

  // Find StripeAccount record
  const stripeAccount = await db.stripeAccount.findUnique({
    where: { stripeAccountId: account.id },
  });

  if (!stripeAccount) {
    console.warn(`⚠️ [Stripe Webhook] StripeAccount not found: ${account.id}`);
    return;
  }

  // Update account status
  await db.stripeAccount.update({
    where: { id: stripeAccount.id },
    data: {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      requirementsPastDue: account.requirements?.past_due || [],
      verificationStatus: account.charges_enabled ? 'VERIFIED' : 'PENDING',
    },
  });

  // Record onboarding event
  await db.businessOnboardingEvent.create({
    data: {
      businessId: stripeAccount.businessId,
      status: account.charges_enabled ? 'CHARGES_ENABLED' : 'SUBMITTED',
      metadata: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      },
    },
  });

  console.log(`✅ [Stripe Webhook] Account status updated: ${account.id}`);
}
