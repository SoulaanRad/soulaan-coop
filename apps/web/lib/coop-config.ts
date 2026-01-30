/* eslint-disable no-restricted-properties */
/**
 * Coop-specific configuration for the web app
 * These values are loaded from environment variables
 * Note: Uses process.env directly for NEXT_PUBLIC_ vars which are client-accessible
 */

export interface CoopConfig {
  // Identity
  name: string;
  shortName: string;
  tagline: string;

  // URLs
  appUrl: string;
  webUrl: string;
  iosAppStoreUrl: string;
  androidPlayStoreUrl: string;

  // Branding
  primaryColor: string;
  accentColor: string;
  logoUrl: string;

  // Payment settings
  minPaymentAmount: number;
  maxPaymentAmount: number;
  claimExpirationDays: number;
  withdrawalMinAmount: number;

  // Currency display
  currencySymbol: string;
  currencyCode: string;

  // Support
  supportEmail: string;
  supportPhone: string;

  // Legal
  termsUrl: string;
  privacyUrl: string;
}

// Load configuration - works on both server and client
function loadConfig(): CoopConfig {
  return {
    // Identity
    name: process.env.NEXT_PUBLIC_COOP_NAME || 'Soulaan',
    shortName: process.env.NEXT_PUBLIC_COOP_SHORT_NAME || 'Soulaan',
    tagline: process.env.NEXT_PUBLIC_COOP_TAGLINE || 'Building Generational Wealth Together',

    // URLs
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://soulaan.app',
    webUrl: process.env.NEXT_PUBLIC_WEB_URL || 'https://soulaan.coop',
    iosAppStoreUrl: process.env.NEXT_PUBLIC_IOS_APP_STORE_URL || 'https://apps.apple.com/app/soulaan',
    androidPlayStoreUrl: process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.soulaan',

    // Branding
    primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#2563eb',
    accentColor: process.env.NEXT_PUBLIC_ACCENT_COLOR || '#16a34a',
    logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png',

    // Payment settings
    minPaymentAmount: parseFloat(process.env.NEXT_PUBLIC_MIN_PAYMENT_AMOUNT || '0.01'),
    maxPaymentAmount: parseFloat(process.env.NEXT_PUBLIC_MAX_PAYMENT_AMOUNT || '10000'),
    claimExpirationDays: parseInt(process.env.NEXT_PUBLIC_CLAIM_EXPIRATION_DAYS || '7', 10),
    withdrawalMinAmount: parseFloat(process.env.NEXT_PUBLIC_WITHDRAWAL_MIN_AMOUNT || '1'),

    // Currency
    currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$',
    currencyCode: process.env.NEXT_PUBLIC_CURRENCY_CODE || 'USD',

    // Support
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@soulaan.coop',
    supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',

    // Legal
    termsUrl: process.env.NEXT_PUBLIC_TERMS_URL || '/terms',
    privacyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL || '/privacy',
  };
}

// Singleton
let cachedConfig: CoopConfig | null = null;

export function coopConfig(): CoopConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  const config = coopConfig();
  return `${config.currencySymbol}${amount.toFixed(2)}`;
}

// Helper to get coop name
export function coopName(): string {
  return coopConfig().name;
}

export function coopShortName(): string {
  return coopConfig().shortName;
}
