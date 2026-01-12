import Stripe from 'stripe';
import type {
  PaymentServiceInterface,
  PaymentIntent,
  PaymentWebhookEvent,
  PaymentProcessor,
} from './types.js';
import { PaymentError } from './types.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export class StripePaymentService implements PaymentServiceInterface {
  readonly name: PaymentProcessor = 'stripe';
  private stripe: Stripe | null = null;

  constructor() {
    if (STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.stripe || !STRIPE_SECRET_KEY) {
      console.warn('⚠️ Stripe not configured');
      return false;
    }

    try {
      // Test API connection
      await this.stripe.customers.list({ limit: 1 });
      console.log('✅ Stripe is available');
      return true;
    } catch (error) {
      console.error('❌ Stripe unavailable:', error);
      return false;
    }
  }

  async createPaymentIntent(params: {
    amountUSD: number;
    userId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    if (!this.stripe) {
      throw new PaymentError('Stripe not configured', 'stripe', 'NOT_CONFIGURED');
    }

    try {
      console.log(`💳 Creating Stripe payment intent for $${params.amountUSD}`);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amountUSD * 100), // Stripe uses cents
        currency: 'usd',
        metadata: {
          userId: params.userId,
          type: 'uc_onramp',
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log('✅ Stripe payment intent created:', paymentIntent.id);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        processor: 'stripe',
        amountUSD: params.amountUSD,
        status: 'pending',
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error('💥 Stripe payment intent creation failed:', error);
      throw new PaymentError(
        'Failed to create Stripe payment intent',
        'stripe',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }

  async verifyWebhook(params: {
    payload: any;
    signature: string;
  }): Promise<PaymentWebhookEvent> {
    if (!this.stripe || !STRIPE_WEBHOOK_SECRET) {
      throw new PaymentError('Stripe webhook secret not configured', 'stripe', 'NOT_CONFIGURED');
    }

    try {
      // Verify signature
      const event = this.stripe.webhooks.constructEvent(
        params.payload,
        params.signature,
        STRIPE_WEBHOOK_SECRET
      );

      console.log('✅ Stripe webhook verified:', event.type);

      // Parse event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        return {
          type: 'payment.success',
          paymentId: paymentIntent.id,
          processor: 'stripe',
          amountUSD: paymentIntent.amount / 100, // Convert cents to dollars
          chargeId: paymentIntent.latest_charge as string,
          userId: paymentIntent.metadata.userId,
          metadata: paymentIntent.metadata,
        };
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        return {
          type: 'payment.failed',
          paymentId: paymentIntent.id,
          processor: 'stripe',
          amountUSD: paymentIntent.amount / 100,
          userId: paymentIntent.metadata.userId,
          metadata: paymentIntent.metadata,
        };
      } else if (event.type === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge;

        return {
          type: 'payment.refunded',
          paymentId: charge.payment_intent as string,
          processor: 'stripe',
          amountUSD: charge.amount_refunded / 100,
          chargeId: charge.id,
          metadata: charge.metadata,
        };
      }

      throw new PaymentError(`Unhandled Stripe webhook event: ${event.type}`, 'stripe', 'UNKNOWN_EVENT');
    } catch (error) {
      console.error('💥 Stripe webhook verification failed:', error);
      throw new PaymentError(
        'Failed to verify Stripe webhook',
        'stripe',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }

  async refund(params: {
    paymentId: string;
    amountUSD?: number;
    reason?: string;
  }): Promise<{ success: boolean; refundId: string }> {
    if (!this.stripe) {
      throw new PaymentError('Stripe not configured', 'stripe', 'NOT_CONFIGURED');
    }

    try {
      console.log(`💸 Creating Stripe refund for payment ${params.paymentId}`);

      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentId,
        amount: params.amountUSD ? Math.round(params.amountUSD * 100) : undefined,
        reason: params.reason as Stripe.RefundCreateParams.Reason,
      });

      console.log('✅ Stripe refund created:', refund.id);

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      console.error('💥 Stripe refund failed:', error);
      throw new PaymentError(
        'Failed to create Stripe refund',
        'stripe',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }
}
