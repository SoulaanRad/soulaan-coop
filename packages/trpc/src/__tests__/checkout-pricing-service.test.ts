import { describe, expect, it } from 'vitest';
import {
  calculateCheckoutPricing,
  calculateCheckoutScReward,
  calculatePriceBreakdown,
} from '../services/checkout-pricing-service.js';
import { calculateSCReward } from '../services/reward-policy-service.js';

const activeFeeConfig = {
  platformMarkupBps: 400,
  merchantFeeBps: 0,
  treasuryFeeBps: 400,
};

describe('Checkout pricing service', () => {
  it('uses one shared calculation for web and mobile checkout previews', () => {
    const webPreview = calculateCheckoutPricing({
      listedAmountCents: 1599,
      feeConfig: activeFeeConfig,
      applyTreasuryFee: true,
    });
    const mobilePreview = calculateCheckoutPricing({
      listedAmountCents: 1599,
      feeConfig: activeFeeConfig,
      applyTreasuryFee: true,
    });

    expect(mobilePreview).toEqual(webPreview);
    expect(webPreview).toMatchObject({
      appliesTreasuryFee: true,
      feeConfig: {
        platformMarkupBps: 400,
        merchantFeeBps: 0,
        treasuryFeeBps: 400,
      },
      breakdown: {
        listedAmount: 1599,
        platformMarkupAmount: 64,
        treasuryFeeAmount: 64,
        chargedAmount: 1663,
        merchantSettlementAmount: 1535,
        platformFeeAmount: 128,
      },
      expectedScReward: 1.599,
    });
  });

  it('zeros only the treasury fee when checkout is not eligible for member fees', () => {
    const preview = calculateCheckoutPricing({
      listedAmountCents: 1599,
      feeConfig: activeFeeConfig,
      applyTreasuryFee: false,
    });

    expect(preview.appliesTreasuryFee).toBe(false);
    expect(preview.feeConfig.treasuryFeeBps).toBe(0);
    expect(preview.breakdown.treasuryFeeAmount).toBe(0);
    expect(preview.breakdown.platformMarkupAmount).toBe(64);
    expect(preview.breakdown.chargedAmount).toBe(1663);
    expect(preview.expectedScReward).toBe(1.599);
  });

  it('keeps the lower-level fee and reward helpers consistent for a $15.99 item', () => {
    expect(calculatePriceBreakdown(1599, activeFeeConfig)).toMatchObject({
      treasuryFeeAmount: 64,
      chargedAmount: 1663,
    });
    expect(calculateCheckoutScReward(1599)).toBe(1.599);
    expect(calculateSCReward(15.99)).toBe(1.599);
  });
});
