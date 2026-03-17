import type { Request, Response } from 'express';
import { db } from '@repo/db';
import { mintUCToUser } from '@repo/trpc/services/wallet-service';
import crypto from 'crypto';
import type Stripe from 'stripe';
import { env } from '../env.js';

const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
const HOOKDECK_SIGNATURE_KEY = env.HOOKDECK_SIGNATURE_KEY;
const USE_HOOKDECK = env.USE_HOOKDECK === 'true';

/**
 * Stripe webhook handler
 * Supports both direct Stripe webhooks and Hookdeck proxy
 * 
 * Setup Options:
 * 1. Direct Stripe (default): Set STRIPE_WEBHOOK_SECRET
 * 2. Via Hookdeck: Set USE_HOOKDECK=true and HOOKDECK_SIGNATURE_KEY
 *
 * Webhook URL: POST /webhooks/stripe
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  console.log('\n🔷 STRIPE WEBHOOK - START');
  console.log(`📍 Mode: ${USE_HOOKDECK ? 'Hookdeck' : 'Direct Stripe'}`);

  try {
    let event: any;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Option 1: Hookdeck Proxy (webhook debugging/management)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (USE_HOOKDECK) {
      console.log('🔗 Processing via Hookdeck');

      // Verify Hookdeck signature (optional but recommended)
      if (HOOKDECK_SIGNATURE_KEY) {
        const hookdeckSig = req.headers['x-hookdeck-signature'];
        if (!hookdeckSig) {
          console.error('❌ Missing Hookdeck signature');
          return res.status(400).json({ error: 'Missing Hookdeck signature' });
        }

        // Verify Hookdeck signature
        const payload = req.body.toString('utf8');
        const expectedSig = crypto
          .createHmac('sha256', HOOKDECK_SIGNATURE_KEY)
          .update(payload)
          .digest('hex');

        if (hookdeckSig !== expectedSig) {
          console.error('❌ Invalid Hookdeck signature');
          return res.status(400).json({ error: 'Invalid Hookdeck signature' });
        }

        console.log('✅ Hookdeck signature verified');
      }

      // Hookdeck already verified the Stripe signature
      // Parse the body directly as JSON
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('✅ Event parsed from Hookdeck');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Option 2: Direct Stripe Webhook (default)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else {
      console.log('⚡ Processing direct from Stripe');

      const sig = req.headers['stripe-signature'];

      if (!sig) {
        console.error('❌ Missing Stripe signature');
        return res.status(400).json({ error: 'Missing signature' });
      }

      if (!STRIPE_WEBHOOK_SECRET) {
        console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      // Import Stripe dynamically to avoid issues if not installed
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
      });

      // Verify webhook signature
      // req.body is a Buffer when using express.raw()
      try {
        const payload = req.body.toString('utf8');
        event = stripe.webhooks.constructEvent(
          payload,
          sig as string,
          STRIPE_WEBHOOK_SECRET
        );
        console.log('✅ Stripe webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    console.log('📨 Event type:', event.type);

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('💳 Payment succeeded:', paymentIntent.id);
      console.log('💰 Amount:', paymentIntent.amount / 100, 'USD');

      // Find onramp transaction
      const transaction = await db.onrampTransaction.findUnique({
        where: { paymentIntentId: paymentIntent.id },
        include: { user: true },
      });

      if (!transaction) {
        console.error('❌ Transaction not found for payment:', paymentIntent.id);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      console.log('✅ Found transaction:', transaction.id);
      console.log('👤 User:', transaction.user.email);

      // Check if already processed (idempotency)
      if (transaction.status === 'COMPLETED') {
        console.log('⚠️ Transaction already processed, skipping');
        return res.json({ received: true, message: 'Already processed' });
      }

      try {
        // Mint UC to user's wallet
        console.log('🪙 Minting', transaction.amountUC, 'UC to user...');
        const mintTxHash = await mintUCToUser(transaction.userId, transaction.amountUC);
        console.log('✅ UC minted, tx hash:', mintTxHash);

        // Update transaction status
        await db.onrampTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            mintTxHash,
            processorChargeId: paymentIntent.latest_charge as string,
            completedAt: new Date(),
          },
        });

        console.log('✅ Transaction marked as COMPLETED');
        console.log('🎉 Onramp successful!');

        // TODO: Send confirmation email to user

        return res.json({ received: true });
      } catch (error) {
        console.error('💥 Minting failed:', error);

        // Mark transaction as failed
        await db.onrampTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: error instanceof Error ? error.message : 'Minting failed',
          },
        });

        // Automatically refund the user since minting failed
        console.log('💸 Initiating automatic refund...');
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-12-18.acacia',
          });

          const refund = await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: 'requested_by_customer',
            metadata: {
              original_transaction_id: transaction.id,
              failure_reason: error instanceof Error ? error.message : 'Minting failed',
            },
          });

          console.log('✅ Refund initiated:', refund.id);

          // Update transaction with refund info
          await db.onrampTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'REFUNDED',
              failureReason: `Minting failed, refund issued: ${refund.id}`,
            },
          });

          console.log('✅ Transaction marked as REFUNDED');
        } catch (refundError) {
          // Refund failed - this needs manual intervention
          console.error('💥 CRITICAL: Refund failed:', refundError);
          console.error('🚨 MANUAL INTERVENTION REQUIRED for transaction:', transaction.id);
          console.error('🚨 Payment Intent:', paymentIntent.id);
          console.error('🚨 User:', transaction.user.email);

          // Update with critical failure status
          await db.onrampTransaction.update({
            where: { id: transaction.id },
            data: {
              failureReason: `CRITICAL: Minting failed AND refund failed. Manual refund required. Error: ${refundError instanceof Error ? refundError.message : 'Unknown'}`,
            },
          });
        }

        return res.status(500).json({ error: 'Minting failed, refund initiated' });
      }
    }

    // Handle payment_intent.payment_failed event
    else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('❌ Payment failed:', paymentIntent.id);

      const transaction = await db.onrampTransaction.findUnique({
        where: { paymentIntentId: paymentIntent.id },
      });

      if (transaction) {
        await db.onrampTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
          },
        });

        console.log('✅ Transaction marked as FAILED');
      }

      return res.json({ received: true });
    }

    // Unhandled event type
    else {
      console.log('⚠️ Unhandled event type:', event.type);
      return res.json({ received: true });
    }
  } catch (error) {
    console.error('💥 ERROR in Stripe webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
