/**
 * Payment Processor Fee Calculator
 * 
 * Calculates fees for various payment processors (Stripe, Square, PayPal, etc.)
 * All fees are in USD
 */

export interface ProcessorFee {
  processor: 'stripe' | 'square' | 'paypal' | 'cashapp';
  percentageFee: number; // e.g., 0.029 for 2.9%
  fixedFee: number; // e.g., 0.30 for $0.30
  name: string;
}

export interface FeeBreakdown {
  subtotal: number;
  processorFee: number;
  total: number;
  processor: string;
  feePercentage: number;
  feeFixed: number;
}

/**
 * Standard payment processor fees
 * Source: Public pricing pages as of 2024
 */
export const PROCESSOR_FEES: Record<string, ProcessorFee> = {
  stripe: {
    processor: 'stripe',
    name: 'Stripe',
    percentageFee: 0.029, // 2.9%
    fixedFee: 0.30,
  },
  square: {
    processor: 'square',
    name: 'Square',
    percentageFee: 0.029, // 2.9%
    fixedFee: 0.30,
  },
  paypal: {
    processor: 'paypal',
    name: 'PayPal',
    percentageFee: 0.0349, // 3.49%
    fixedFee: 0.49,
  },
  cashapp: {
    processor: 'cashapp',
    name: 'Cash App',
    percentageFee: 0.0275, // 2.75%
    fixedFee: 0.00,
  },
};

/**
 * Calculate payment processor fee for a given amount
 * @param amount The transaction amount in USD
 * @param processor The payment processor being used
 * @returns Fee breakdown with processor fee and total
 */
export function calculateProcessorFee(
  amount: number,
  processor: keyof typeof PROCESSOR_FEES = 'stripe'
): FeeBreakdown {
  const feeConfig = PROCESSOR_FEES[processor];
  
  if (!feeConfig) {
    throw new Error(`Unknown processor: ${processor}`);
  }

  // Calculate fee: (amount * percentage) + fixed fee
  const processorFee = (amount * feeConfig.percentageFee) + feeConfig.fixedFee;
  
  // Total includes the original amount + processor fee
  const total = amount + processorFee;

  return {
    subtotal: amount,
    processorFee: Math.round(processorFee * 100) / 100, // Round to 2 decimals
    total: Math.round(total * 100) / 100,
    processor: feeConfig.name,
    feePercentage: feeConfig.percentageFee,
    feeFixed: feeConfig.fixedFee,
  };
}

/**
 * Calculate the amount needed to be charged to net a specific amount after fees
 * Useful when you want the recipient to receive exactly $X after fees
 * 
 * Formula: netAmount = (grossAmount * (1 - percentageFee)) - fixedFee
 * Solving for grossAmount: grossAmount = (netAmount + fixedFee) / (1 - percentageFee)
 * 
 * @param netAmount The desired net amount after fees
 * @param processor The payment processor being used
 * @returns The gross amount needed to charge
 */
export function calculateGrossAmount(
  netAmount: number,
  processor: keyof typeof PROCESSOR_FEES = 'stripe'
): number {
  const feeConfig = PROCESSOR_FEES[processor];
  
  if (!feeConfig) {
    throw new Error(`Unknown processor: ${processor}`);
  }

  const grossAmount = (netAmount + feeConfig.fixedFee) / (1 - feeConfig.percentageFee);
  
  return Math.round(grossAmount * 100) / 100; // Round to 2 decimals
}

/**
 * Format fee breakdown as human-readable string
 * @param breakdown Fee breakdown object
 * @returns Formatted string
 */
export function formatFeeBreakdown(breakdown: FeeBreakdown): string {
  return `Amount: $${breakdown.subtotal.toFixed(2)} + ${breakdown.processor} Fee: $${breakdown.processorFee.toFixed(2)} = Total: $${breakdown.total.toFixed(2)}`;
}

/**
 * Get all available processors with their fees for a given amount
 * @param amount The transaction amount
 * @returns Array of fee breakdowns for all processors
 */
export function compareProcessorFees(amount: number): FeeBreakdown[] {
  return Object.keys(PROCESSOR_FEES).map(processor =>
    calculateProcessorFee(amount, processor as keyof typeof PROCESSOR_FEES)
  );
}
