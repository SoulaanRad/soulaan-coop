/**
 * Payment Processor Fee Calculator (Web)
 * 
 * Calculates fees for various payment processors
 * Mirrors the backend and mobile fee calculator for consistency
 */

export interface FeeBreakdown {
  subtotal: number;
  processorFee: number;
  total: number;
  processor: string;
}

/**
 * Calculate Stripe processing fee
 * Standard rate: 2.9% + $0.30
 */
export function calculateStripeFee(amount: number): FeeBreakdown {
  const processorFee = (amount * 0.029) + 0.30;
  
  return {
    subtotal: amount,
    processorFee: Math.round(processorFee * 100) / 100,
    total: Math.round((amount + processorFee) * 100) / 100,
    processor: 'Stripe',
  };
}

/**
 * Calculate Square processing fee
 * Standard rate: 2.9% + $0.30
 */
export function calculateSquareFee(amount: number): FeeBreakdown {
  const processorFee = (amount * 0.029) + 0.30;
  
  return {
    subtotal: amount,
    processorFee: Math.round(processorFee * 100) / 100,
    total: Math.round((amount + processorFee) * 100) / 100,
    processor: 'Square',
  };
}

/**
 * Calculate PayPal processing fee
 * Standard rate: 3.49% + $0.49
 */
export function calculatePayPalFee(amount: number): FeeBreakdown {
  const processorFee = (amount * 0.0349) + 0.49;
  
  return {
    subtotal: amount,
    processorFee: Math.round(processorFee * 100) / 100,
    total: Math.round((amount + processorFee) * 100) / 100,
    processor: 'PayPal',
  };
}

/**
 * Calculate generic processor fee
 * Defaults to Stripe rates
 */
export function calculateProcessorFee(
  amount: number,
  processor: 'stripe' | 'square' | 'paypal' = 'stripe'
): FeeBreakdown {
  switch (processor) {
    case 'square':
      return calculateSquareFee(amount);
    case 'paypal':
      return calculatePayPalFee(amount);
    case 'stripe':
    default:
      return calculateStripeFee(amount);
  }
}

/**
 * Check if amount requires payment processor
 * (i.e., user doesn't have enough balance)
 */
export function requiresPaymentProcessor(amount: number, balance: number): boolean {
  return balance < amount;
}

/**
 * Calculate partial payment fees
 * When user has some balance but not enough
 */
export function calculatePartialPaymentFee(
  amount: number,
  balance: number,
  processor: 'stripe' | 'square' | 'paypal' = 'stripe'
): FeeBreakdown & { fromBalance: number; fromCard: number } {
  if (balance >= amount) {
    // Full payment from balance - no fees
    return {
      subtotal: amount,
      processorFee: 0,
      total: amount,
      processor: 'None (paid from balance)',
      fromBalance: amount,
      fromCard: 0,
    };
  }

  // Calculate what needs to come from card
  const fromBalance = balance;
  const fromCard = amount - balance;
  
  // Charge processing fee on the full transaction amount.
  // Business rule: fee basis is order/payment subtotal, not the remaining card-only portion.
  const feeBreakdown = calculateProcessorFee(amount, processor);
  
  return {
    subtotal: amount,
    processorFee: feeBreakdown.processorFee,
    total: amount + feeBreakdown.processorFee,
    processor: feeBreakdown.processor,
    fromBalance,
    fromCard,
  };
}
