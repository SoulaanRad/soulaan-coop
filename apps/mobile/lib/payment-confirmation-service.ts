/**
 * Global service for payment confirmation modals
 * Allows non-React code to trigger confirmation modals
 */

export interface PaymentConfirmationData {
  amount: string;
  processorFee?: number;
  fromBalance?: number;
  fromCard?: number;
  total?: number;
}

type ConfirmationHandler = (data: PaymentConfirmationData) => Promise<boolean>;

class PaymentConfirmationService {
  private handler: ConfirmationHandler | null = null;

  /**
   * Register the modal handler (called by the modal provider)
   */
  register(handler: ConfirmationHandler) {
    this.handler = handler;
  }

  /**
   * Unregister the handler
   */
  unregister() {
    this.handler = null;
  }

  /**
   * Request payment confirmation from user
   * @param data - Payment data including amount and optional fee breakdown
   * @returns Promise that resolves to true if confirmed, false if cancelled
   */
  async confirm(data: string | PaymentConfirmationData): Promise<boolean> {
    if (!this.handler) {
      console.warn('PaymentConfirmationService: No handler registered, defaulting to true');
      return true;
    }

    // Support legacy string-only calls
    const confirmationData: PaymentConfirmationData = 
      typeof data === 'string' ? { amount: data } : data;

    return this.handler(confirmationData);
  }
}

export const paymentConfirmationService = new PaymentConfirmationService();
