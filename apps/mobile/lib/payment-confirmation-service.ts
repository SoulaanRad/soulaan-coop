/**
 * Global service for payment confirmation modals
 * Allows non-React code to trigger confirmation modals
 */

type ConfirmationHandler = (amount: string) => Promise<boolean>;

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
   * @param amount - The payment amount to display
   * @returns Promise that resolves to true if confirmed, false if cancelled
   */
  async confirm(amount: string): Promise<boolean> {
    if (!this.handler) {
      console.warn('PaymentConfirmationService: No handler registered, defaulting to true');
      return true;
    }

    return this.handler(amount);
  }
}

export const paymentConfirmationService = new PaymentConfirmationService();
