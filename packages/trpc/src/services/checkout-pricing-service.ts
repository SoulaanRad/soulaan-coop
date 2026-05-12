import { SC_REWARD_RATE } from '../constants/sc-rewards.js';

export interface CheckoutFeeConfig {
  platformMarkupBps: number;
  merchantFeeBps: number;
  treasuryFeeBps: number;
}

export interface CheckoutPriceBreakdown {
  listedAmount: number;
  chargedAmount: number;
  merchantSettlementAmount: number;
  platformMarkupAmount: number;
  treasuryFeeAmount: number;
  platformFeeAmount: number;
}

export interface CheckoutPricing {
  appliesTreasuryFee: boolean;
  feeConfig: CheckoutFeeConfig;
  breakdown: CheckoutPriceBreakdown;
  expectedScReward: number;
}

/**
 * Calculate the SC reward shown in checkout previews.
 *
 * Keep this in the shared checkout service so web and mobile display the same
 * reward estimate for the same listed item amount.
 */
export function calculateCheckoutScReward(listedAmountCents: number): number {
  return calculateCheckoutScRewardFromUsd(listedAmountCents / 100);
}

export function calculateCheckoutScRewardFromUsd(amountUSD: number): number {
  return Number((amountUSD * SC_REWARD_RATE).toFixed(6));
}

/**
 * Calculate price breakdown for a transaction.
 *
 * All input and output amounts are in cents.
 */
export function calculatePriceBreakdown(
  listedAmount: number,
  feeConfig: CheckoutFeeConfig
): CheckoutPriceBreakdown {
  const platformMarkup = Math.round((listedAmount * feeConfig.platformMarkupBps) / 10000);
  const chargedAmount = listedAmount + platformMarkup;
  const treasuryFee = Math.round((listedAmount * feeConfig.treasuryFeeBps) / 10000);
  const merchantFee = Math.round((listedAmount * feeConfig.merchantFeeBps) / 10000);
  const merchantSettlementAmount = listedAmount - treasuryFee - merchantFee;
  const platformFeeAmount = platformMarkup + treasuryFee + merchantFee;

  return {
    listedAmount,
    chargedAmount,
    merchantSettlementAmount,
    platformMarkupAmount: platformMarkup,
    treasuryFeeAmount: treasuryFee,
    platformFeeAmount,
  };
}

/**
 * Shared checkout math used by API previews and payment creation.
 */
export function calculateCheckoutPricing(params: {
  listedAmountCents: number;
  feeConfig: CheckoutFeeConfig;
  applyTreasuryFee: boolean;
}): CheckoutPricing {
  const { listedAmountCents, feeConfig, applyTreasuryFee } = params;
  const checkoutFeeConfig = applyTreasuryFee
    ? feeConfig
    : {
        ...feeConfig,
        treasuryFeeBps: 0,
      };

  return {
    appliesTreasuryFee: applyTreasuryFee,
    feeConfig: checkoutFeeConfig,
    breakdown: calculatePriceBreakdown(listedAmountCents, checkoutFeeConfig),
    expectedScReward: calculateCheckoutScReward(listedAmountCents),
  };
}
