import type {
  PaymentServiceInterface,
  PaymentIntent,
  PaymentWebhookEvent,
  PaymentProcessor,
} from './types.js';
import { PaymentError } from './types.js';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

export class PayPalPaymentService implements PaymentServiceInterface {
  readonly name: PaymentProcessor = 'paypal';
  private baseUrl: string;

  constructor() {
    this.baseUrl = PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  async isAvailable(): Promise<boolean> {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.warn('⚠️ PayPal not configured');
      return false;
    }

    try {
      // Test API connection by getting access token
      await this.getAccessToken();
      console.log('✅ PayPal is available');
      return true;
    } catch (error) {
      console.error('❌ PayPal unavailable:', error);
      return false;
    }
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  async createPaymentIntent(params: {
    amountUSD: number;
    userId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new PaymentError('PayPal not configured', 'paypal', 'NOT_CONFIGURED');
    }

    try {
      console.log(`💳 Creating PayPal order for $${params.amountUSD}`);

      const accessToken = await this.getAccessToken();

      // Create PayPal order
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'USD',
              value: params.amountUSD.toFixed(2),
            },
            custom_id: params.userId, // Store userId for webhook lookup
          }],
          application_context: {
            return_url: `${process.env.APP_URL}/onramp/success`,
            cancel_url: `${process.env.APP_URL}/onramp/cancel`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const order = await response.json();
      console.log('✅ PayPal order created:', order.id);

      return {
        id: order.id,
        clientSecret: order.id, // PayPal doesn't use client secrets, just order ID
        processor: 'paypal',
        amountUSD: params.amountUSD,
        status: 'pending',
        metadata: params.metadata,
      };
    } catch (error) {
      console.error('💥 PayPal order creation failed:', error);
      throw new PaymentError(
        'Failed to create PayPal order',
        'paypal',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }

  async verifyWebhook(params: {
    payload: any;
    signature: string;
  }): Promise<PaymentWebhookEvent> {
    if (!PAYPAL_WEBHOOK_ID) {
      throw new PaymentError('PayPal webhook not configured', 'paypal', 'NOT_CONFIGURED');
    }

    try {
      console.log('✅ PayPal webhook received:', params.payload.event_type);

      const event = params.payload;

      // Parse event type
      if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = event.resource;

        return {
          type: 'payment.success',
          paymentId: resource.id,
          processor: 'paypal',
          amountUSD: parseFloat(resource.amount.value),
          chargeId: resource.id,
          userId: resource.custom_id, // Retrieved from purchase_units.custom_id
        };
      } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED' || event.event_type === 'PAYMENT.CAPTURE.FAILED') {
        const resource = event.resource;

        return {
          type: 'payment.failed',
          paymentId: resource.id,
          processor: 'paypal',
          amountUSD: parseFloat(resource.amount.value),
          userId: resource.custom_id,
        };
      } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
        const resource = event.resource;

        return {
          type: 'payment.refunded',
          paymentId: resource.id,
          processor: 'paypal',
          amountUSD: parseFloat(resource.amount.value),
          chargeId: resource.id,
        };
      }

      throw new PaymentError(`Unhandled PayPal webhook event: ${event.event_type}`, 'paypal', 'UNKNOWN_EVENT');
    } catch (error) {
      console.error('💥 PayPal webhook verification failed:', error);
      throw new PaymentError(
        'Failed to verify PayPal webhook',
        'paypal',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }

  async refund(params: {
    paymentId: string;
    amountUSD?: number;
    reason?: string;
  }): Promise<{ success: boolean; refundId: string }> {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new PaymentError('PayPal not configured', 'paypal', 'NOT_CONFIGURED');
    }

    try {
      console.log(`💸 Creating PayPal refund for capture ${params.paymentId}`);

      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/payments/captures/${params.paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amountUSD ? {
            currency_code: 'USD',
            value: params.amountUSD.toFixed(2),
          } : undefined,
          note_to_payer: params.reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal refund');
      }

      const refund = await response.json();
      console.log('✅ PayPal refund created:', refund.id);

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      console.error('💥 PayPal refund failed:', error);
      throw new PaymentError(
        'Failed to create PayPal refund',
        'paypal',
        error instanceof Error ? error.message : 'UNKNOWN'
      );
    }
  }
}
