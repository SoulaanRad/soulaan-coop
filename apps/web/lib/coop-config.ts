/**
 * Coop-specific configuration for the web app
 * Simple constants for claim pages
 */

// Coop constants
const COOP_SHORT_NAME = 'Soulaan';
const CURRENCY_SYMBOL = '$';
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/soulaan';
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.soulaan';

export interface CoopConfig {
  shortName: string;
  iosAppStoreUrl: string;
  androidPlayStoreUrl: string;
  currencySymbol: string;
}

export function coopConfig(): CoopConfig {
  return {
    shortName: COOP_SHORT_NAME,
    iosAppStoreUrl: IOS_APP_STORE_URL,
    androidPlayStoreUrl: ANDROID_PLAY_STORE_URL,
    currencySymbol: CURRENCY_SYMBOL,
  };
}

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}

export function coopName(): string {
  return COOP_SHORT_NAME;
}

export function coopShortName(): string {
  return COOP_SHORT_NAME;
}
