/**
 * Payment processor types and interfaces
 */

export type PaymentProcessor = 'stripe' | 'paypal' | 'square';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  processor: PaymentProcessor;
  amountUSD: number;
  status: 'pending' | 'succeeded' | 'failed';
  metadata?: Record<string, string>;
}

export interface PaymentWebhookEvent {
  type: 'payment.success' | 'payment.failed' | 'payment.refunded';
  paymentId: string;
  processor: PaymentProcessor;
  amountUSD: number;
  chargeId?: string;
  userId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentServiceInterface {
  /**
   * The name of the payment processor
   */
  readonly name: PaymentProcessor;

  /**
   * Check if the processor is available/configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Create a payment intent
   */
  createPaymentIntent(params: {
    amountUSD: number;
    userId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent>;

  /**
   * Verify webhook signature and parse event
   */
  verifyWebhook(params: {
    payload: any;
    signature: string;
  }): Promise<PaymentWebhookEvent>;

  /**
   * Refund a payment
   */
  refund(params: {
    paymentId: string;
    amountUSD?: number;
    reason?: string;
  }): Promise<{ success: boolean; refundId: string }>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public processor: PaymentProcessor,
    public code?: string
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
