import type { Request, Response } from 'express';
import { db } from '@repo/db';
import { mintUCToUser } from '@repo/trpc/services/wallet-service';

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

/**
 * Square webhook handler
 * Processes payment completion events and mints UC tokens
 *
 * Webhook URL: POST /webhooks/square
 */
export async function handleSquareWebhook(req: Request, res: Response) {
  console.log('\n🔷 SQUARE WEBHOOK - START');

  try {
    const signature = req.headers['x-square-signature'];

    if (!signature) {
      console.error('❌ Missing Square signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    if (!SQUARE_WEBHOOK_SIGNATURE_KEY) {
      console.error('❌ SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
      return res.status(500).json({ error: 'Webhook signature key not configured' });
    }

    // TODO: Verify webhook signature using Square SDK
    // For now, we'll trust the webhook (INSECURE - fix in production)
    console.log('⚠️ Warning: Webhook signature verification not implemented');

    const event = req.body;
    console.log('📨 Event type:', event.type);

    // Handle payment.updated event with COMPLETED status
    if (event.type === 'payment.updated' && event.data?.object?.payment?.status === 'COMPLETED') {
      const payment = event.data.object.payment;
      const paymentId = payment.id;
      const referenceId = payment.reference_id; // This is the userId we stored

      console.log('💳 Payment completed:', paymentId);
      console.log('💰 Amount:', payment.amount_money.amount / 100, payment.amount_money.currency);
      console.log('👤 Reference ID (userId):', referenceId);

      // Find onramp transaction by userId and pending status
      const transaction = await db.onrampTransaction.findFirst({
        where: {
          userId: referenceId,
          status: 'PENDING',
          processor: 'square',
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: { user: true },
      });

      if (!transaction) {
        console.error('❌ Transaction not found for payment:', paymentId);
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
            processorChargeId: paymentId,
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

        // TODO: Initiate refund via Square

        return res.status(500).json({ error: 'Minting failed' });
      }
    }

    // Handle payment.updated event with FAILED status
    else if (event.type === 'payment.updated' && event.data?.object?.payment?.status === 'FAILED') {
      const payment = event.data.object.payment;
      const referenceId = payment.reference_id;

      console.log('❌ Payment failed:', payment.id);

      const transaction = await db.onrampTransaction.findFirst({
        where: {
          userId: referenceId,
          status: 'PENDING',
          processor: 'square',
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
            failureReason: 'Payment failed',
          },
        });

        console.log('✅ Transaction marked as FAILED');
      }

      return res.json({ received: true });
    }

    // Handle refund.updated event with COMPLETED status
    else if (event.type === 'refund.updated' && event.data?.object?.refund?.status === 'COMPLETED') {
      const refund = event.data.object.refund;
      const paymentId = refund.payment_id;

      console.log('💸 Refund completed:', refund.id);

      const transaction = await db.onrampTransaction.findFirst({
        where: {
          processorChargeId: paymentId,
          processor: 'square',
          status: 'COMPLETED',
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
      console.log('⚠️ Unhandled event type:', event.type);
      return res.json({ received: true });
    }
  } catch (error) {
    console.error('💥 ERROR in Square webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
