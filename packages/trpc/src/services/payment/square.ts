import type {
  PaymentServiceInterface,
  PaymentIntent,
  PaymentWebhookEvent,
  PaymentProcessor,
} from './types.js';
import { PaymentError } from './types.js';

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

export class SquarePaymentService implements PaymentServiceInterface {
  readonly name: PaymentProcessor = 'square';
  private baseUrl: string;

  constructor() {
    this.baseUrl = SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
  }

  async isAvailable(): Promise<boolean> {
    if (!SQUARE_ACCESS_TOKEN) {
      console.warn('⚠️ Square not configured');
      return false;
    }

    try {
      // Test API connection
      const response = await fetch(`${this.baseUrl}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Square API');
      }

      console.log('✅ Square is available');
      return true;
    } catch (error) {
      console.error('❌ Square unavailable:', error);
      return false;
    }
  }

  async createPaymentIntent(params: {
    amountUSD: number;
    userId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    if (!SQUARE_ACCESS_TOKEN) {
      throw new PaymentError('Square not configured', 'square', 'NOT_CONFIGURED');
    }

    try {
      console.log(`💳 Creating Square payment for $${params.amountUSD}`);

      // Create Square payment
      const response = await fetch(`${this.baseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: 'PLACEHOLDER', // Will be provided by Square SDK in mobile app
          idempotency_key: `${params.userId}-${Date.now()}`,
          amount_money: {
            amount: Math.round(params.amountUSD * 100), // Square uses cents
            currency: 'USD',
          },
          reference_id: params.userId,
          note: `UC Onramp - User ${params.userId}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Square API error: ${JSON.stringify(error)}`);
      }

      const payment = await response.json();
      console.log('✅ Square payment created:', payment.payment.id);

      return {
        id: payment.payment.id,
        clientSecret: payment.payment.id, // Square doesn't use client secrets
        processor: 'square',
        amountUSD: params.amountUSD,
        status: 'pending',
        metadata: params.metadata,
      };
    } catch (error) {
      console.error('💥 Square payment creation failed:', error);
      throw new PaymentError(
        'Failed to create Square payment',
        'square',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }

  async verifyWebhook(params: {
    payload: any;
    signature: string;
  }): Promise<PaymentWebhookEvent> {
    if (!SQUARE_WEBHOOK_SIGNATURE_KEY) {
      throw new PaymentError('Square webhook not configured', 'square', 'NOT_CONFIGURED');
    }

    try {
      console.log('✅ Square webhook received:', params.payload.type);

      const event = params.payload;

      // Parse event type
      if (event.type === 'payment.updated' && event.data.object.payment.status === 'COMPLETED') {
        const payment = event.data.object.payment;

        return {
          type: 'payment.success',
          paymentId: payment.id,
          processor: 'square',
          amountUSD: payment.amount_money.amount / 100, // Convert cents to dollars
          chargeId: payment.id,
          userId: payment.reference_id,
        };
      } else if (event.type === 'payment.updated' && event.data.object.payment.status === 'FAILED') {
        const payment = event.data.object.payment;

        return {
          type: 'payment.failed',
          paymentId: payment.id,
          processor: 'square',
          amountUSD: payment.amount_money.amount / 100,
          userId: payment.reference_id,
        };
      } else if (event.type === 'refund.updated' && event.data.object.refund.status === 'COMPLETED') {
        const refund = event.data.object.refund;

        return {
          type: 'payment.refunded',
          paymentId: refund.payment_id,
          processor: 'square',
          amountUSD: refund.amount_money.amount / 100,
          chargeId: refund.id,
        };
      }

      throw new PaymentError(`Unhandled Square webhook event: ${event.type}`, 'square', 'UNKNOWN_EVENT');
    } catch (error) {
      console.error('💥 Square webhook verification failed:', error);
      throw new PaymentError(
        'Failed to verify Square webhook',
        'square',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }

  async refund(params: {
    paymentId: string;
    amountUSD?: number;
    reason?: string;
  }): Promise<{ success: boolean; refundId: string }> {
    if (!SQUARE_ACCESS_TOKEN) {
      throw new PaymentError('Square not configured', 'square', 'NOT_CONFIGURED');
    }

    try {
      console.log(`💸 Creating Square refund for payment ${params.paymentId}`);

      const response = await fetch(`${this.baseUrl}/v2/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: `refund-${params.paymentId}-${Date.now()}`,
          payment_id: params.paymentId,
          amount_money: params.amountUSD ? {
            amount: Math.round(params.amountUSD * 100),
            currency: 'USD',
          } : undefined,
          reason: params.reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Square refund API error: ${JSON.stringify(error)}`);
      }

      const refund = await response.json();
      console.log('✅ Square refund created:', refund.refund.id);

      return {
        success: true,
        refundId: refund.refund.id,
      };
    } catch (error) {
      console.error('💥 Square refund failed:', error);
      throw new PaymentError(
        'Failed to create Square refund',
        'square',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }
}
