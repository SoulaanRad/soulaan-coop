/**
 * Centralized UC/USD parity conversions.
 * Keep all conversions in one place to avoid drift.
 */
export const UC_USD_RATE = 1.0;

export function convertUSDToUC(amountUSD: number): number {
  if (!Number.isFinite(amountUSD) || amountUSD < 0) {
    throw new Error(`Invalid USD amount: ${amountUSD}`);
  }
  return round(amountUSD / UC_USD_RATE, 8);
}

export function convertUCToUSD(amountUC: number): number {
  if (!Number.isFinite(amountUC) || amountUC < 0) {
    throw new Error(`Invalid UC amount: ${amountUC}`);
  }
  return round(amountUC * UC_USD_RATE, 2);
}

export function validateParity(amountUSD: number, amountUC: number, tolerance = 0.01): void {
  const expectedUC = convertUSDToUC(amountUSD);
  if (Math.abs(expectedUC - amountUC) > tolerance) {
    throw new Error(
      `UC/USD parity mismatch: expected ${expectedUC} UC for $${amountUSD}, got ${amountUC} UC`
    );
  }
}

export function createParityAmounts(amountUSD: number): { amountUSD: number; amountUC: number } {
  return { amountUSD, amountUC: convertUSDToUC(amountUSD) };
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
