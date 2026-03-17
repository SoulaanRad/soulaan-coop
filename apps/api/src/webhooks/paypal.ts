import type { Request, Response } from 'express';
import { db } from '@repo/db';
import { mintUCToUser } from '@repo/trpc/services/wallet-service';
import { env } from '../env.js';

const PAYPAL_WEBHOOK_ID = env.PAYPAL_WEBHOOK_ID;
const PAYPAL_CLIENT_ID = env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = env.PAYPAL_CLIENT_SECRET;

/**
 * PayPal webhook handler
 * Processes payment completion events and mints UC tokens
 *
 * Webhook URL: POST /webhooks/paypal
 */
export async function handlePayPalWebhook(req: Request, res: Response) {
  console.log('\n🔷 PAYPAL WEBHOOK - START');

  try {
    if (!PAYPAL_WEBHOOK_ID || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('❌ PayPal credentials not configured');
      return res.status(500).json({ error: 'PayPal not configured' });
    }

    const event = req.body;
    console.log('📨 Event type:', event.event_type);

    // TODO: Verify webhook signature using PayPal SDK
    // For now, we'll trust the webhook (INSECURE - fix in production)
    console.log('⚠️ Warning: Webhook signature verification not implemented');

    // Handle PAYMENT.CAPTURE.COMPLETED event
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      const captureId = resource.id;
      const customId = resource.custom_id; // This is the userId we stored

      console.log('💳 Payment captured:', captureId);
      console.log('💰 Amount:', resource.amount.value, resource.amount.currency_code);
      console.log('👤 Custom ID (userId):', customId);

      // Find onramp transaction by userId and pending status
      // Note: We're using custom_id as userId since PayPal doesn't have payment intent IDs
      const transaction = await db.onrampTransaction.findFirst({
        where: {
          userId: customId,
          status: 'PENDING',
          processor: 'paypal',
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: { user: true },
      });

      if (!transaction) {
        console.error('❌ Transaction not found for capture:', captureId);
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
            processorChargeId: captureId,
            completedAt: new Date(),
          },
        });

        console.log('✅ Transaction marked as COMPLETED');
        console.log('🎉 Onramp successful!');

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

        // TODO: Initiate refund via PayPal

        return res.status(500).json({ error: 'Minting failed' });
      }
    }

    // Handle PAYMENT.CAPTURE.DENIED or PAYMENT.CAPTURE.FAILED
    else if (
      event.event_type === 'PAYMENT.CAPTURE.DENIED' ||
      event.event_type === 'PAYMENT.CAPTURE.FAILED'
    ) {
      const resource = event.resource;
      const customId = resource.custom_id;

      console.log('❌ Payment failed:', resource.id);

      const transaction = await db.onrampTransaction.findFirst({
        where: {
          userId: customId,
          status: 'PENDING',
          processor: 'paypal',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (transaction) {
        await db.onrampTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: resource.status_details?.reason || 'Payment failed',
          },
        });

        console.log('✅ Transaction marked as FAILED');
      }

      return res.json({ received: true });
    }

    // Handle PAYMENT.CAPTURE.REFUNDED
    else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      const resource = event.resource;
      const customId = resource.custom_id;

      console.log('💸 Payment refunded:', resource.id);

      const transaction = await db.onrampTransaction.findFirst({
        where: {
          userId: customId,
          processor: 'paypal',
          status: 'COMPLETED',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (transaction) {
        await db.onrampTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'REFUNDED',
          },
        });

        console.log('✅ Transaction marked as REFUNDED');
        // TODO: Handle UC token burn/reversal
      }

      return res.json({ received: true });
    }

    // Unhandled event type
    else {
      console.log('⚠️ Unhandled event type:', event.event_type);
      return res.json({ received: true });
    }
  } catch (error) {
    console.error('💥 ERROR in PayPal webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
