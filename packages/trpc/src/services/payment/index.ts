import type {
  PaymentServiceInterface,
  PaymentIntent,
  PaymentWebhookEvent,
  PaymentProcessor,
} from './types.js';
import { PaymentError } from './types.js';
import { StripePaymentService } from './stripe.js';
import { PayPalPaymentService } from './paypal.js';
import { SquarePaymentService } from './square.js';

export * from './types.js';

/**
 * Payment Service Manager
 * Handles multiple payment processors with automatic failover
 */
export class PaymentServiceManager {
  private processors: Map<PaymentProcessor, PaymentServiceInterface>;
  private primaryProcessor: PaymentProcessor = 'stripe';

  constructor() {
    this.processors = new Map<PaymentProcessor, PaymentServiceInterface>([
      ['stripe', new StripePaymentService()],
      ['paypal', new PayPalPaymentService()],
      ['square', new SquarePaymentService()],
    ]);
  }

  /**
   * Get all available processors
   */
  async getAvailableProcessors(): Promise<PaymentProcessor[]> {
    const available: PaymentProcessor[] = [];

    for (const [name, processor] of this.processors) {
      try {
        const isAvailable = await processor.isAvailable();
        if (isAvailable) {
          available.push(name);
        }
      } catch (error) {
        console.warn(`❌ Processor ${name} check failed:`, error);
      }
    }

    console.log('✅ Available processors:', available.join(', '));
    return available;
  }

  /**
   * Get a specific processor
   */
  getProcessor(name: PaymentProcessor): PaymentServiceInterface {
    const processor = this.processors.get(name);
    if (!processor) {
      throw new Error(`Unknown payment processor: ${name}`);
    }
    return processor;
  }

  /**
   * Create payment intent with automatic failover
   */
  async createPaymentIntent(params: {
    amountUSD: number;
    userId: string;
    preferredProcessor?: PaymentProcessor;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    const availableProcessors = await this.getAvailableProcessors();

    if (availableProcessors.length === 0) {
      throw new PaymentError(
        'No payment processors available',
        'stripe',
        'ALL_PROCESSORS_DOWN'
      );
    }

    // Try preferred processor first, then fall back to available ones
    const processorOrder = params.preferredProcessor
      ? [params.preferredProcessor, ...availableProcessors.filter(p => p !== params.preferredProcessor)]
      : availableProcessors;

    const errors: Array<{ processor: PaymentProcessor; error: Error }> = [];

    for (const processorName of processorOrder) {
      try {
        const processor = this.getProcessor(processorName);

        console.log(`💳 Attempting to create payment intent with ${processorName}...`);
        const paymentIntent = await processor.createPaymentIntent({
          amountUSD: params.amountUSD,
          userId: params.userId,
          metadata: params.metadata,
        });

        console.log(`✅ Successfully created payment intent with ${processorName}`);
        return paymentIntent;
      } catch (error) {
        console.error(`❌ ${processorName} failed:`, error);
        errors.push({
          processor: processorName,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Continue to next processor
        continue;
      }
    }

    // All processors failed
    console.error('💥 All payment processors failed:', errors);
    throw new PaymentError(
      `Failed to create payment intent. Tried: ${errors.map(e => e.processor).join(', ')}`,
      errors[0]!.processor,
      'ALL_PROCESSORS_FAILED'
    );
  }

  /**
   * Verify webhook from any processor
   */
  async verifyWebhook(
    processor: PaymentProcessor,
    params: {
      payload: any;
      signature: string;
    }
  ): Promise<PaymentWebhookEvent> {
    const service = this.getProcessor(processor);
    return service.verifyWebhook(params);
  }

  /**
   * Refund a payment
   */
  async refund(
    processor: PaymentProcessor,
    params: {
      paymentId: string;
      amountUSD?: number;
      reason?: string;
    }
  ): Promise<{ success: boolean; refundId: string }> {
    const service = this.getProcessor(processor);
    return service.refund(params);
  }
}

// Export singleton instance
export const paymentService = new PaymentServiceManager();
