import { describe, expect, it } from 'vitest';
import {
  convertUCToUSD,
  convertUSDToUC,
  createParityAmounts,
  validateParity,
} from '../utils/currency-converter.js';

describe('currency-converter', () => {
  it('converts USD to UC at 1:1', () => {
    expect(convertUSDToUC(10)).toBe(10);
    expect(convertUSDToUC(42.37)).toBe(42.37);
  });

  it('converts UC to USD at 1:1', () => {
    expect(convertUCToUSD(10)).toBe(10);
    expect(convertUCToUSD(99.99)).toBe(99.99);
  });

  it('creates parity amounts with matched values', () => {
    expect(createParityAmounts(25.5)).toEqual({
      amountUSD: 25.5,
      amountUC: 25.5,
    });
  });

  it('throws when parity does not match', () => {
    expect(() => validateParity(10, 9.5)).toThrow(/parity mismatch/i);
    expect(() => validateParity(10, 10)).not.toThrow();
  });
});
