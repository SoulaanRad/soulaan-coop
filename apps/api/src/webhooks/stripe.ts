import type { Request, Response } from 'express';
import { db } from '@repo/db';
import { mintUCToUser } from '@repo/trpc/services/wallet-service';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe webhook handler
 * Processes payment completion events and mints UC tokens
 *
 * Webhook URL: POST /webhooks/stripe
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  console.log('\n🔷 STRIPE WEBHOOK - START');

  try {
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
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
    });

    // Verify webhook signature
    // req.body is a Buffer when using express.raw()
    let event;
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

    console.log('📨 Event type:', event.type);

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;

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

        // TODO: Initiate refund via Stripe

        return res.status(500).json({ error: 'Minting failed' });
      }
    }

    // Handle payment_intent.payment_failed event
    else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as any;

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
