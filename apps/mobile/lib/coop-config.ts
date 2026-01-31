/**
 * Coop-specific configuration for the mobile app
 *
 * The mobile app supports MULTIPLE coops - users can be members of different coops.
 * The active coop config comes from the user's authenticated session/membership.
 *
 * Default values are used for unauthenticated states (login, signup, etc.)
 */

export interface CoopConfig {
  // Identity
  id: string;
  name: string;
  shortName: string;
  tagline: string;

  // URLs
  apiUrl: string;
  webUrl: string;

  // Branding (Tailwind color names or hex values)
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;

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

  // Features
  enableWithdrawals: boolean;
  enableP2P: boolean;
}

// Default config for unauthenticated state
const defaultConfig: CoopConfig = {
  id: 'default',
  name: process.env.EXPO_PUBLIC_DEFAULT_COOP_NAME || 'Soulaan',
  shortName: process.env.EXPO_PUBLIC_DEFAULT_COOP_SHORT_NAME || 'Soulaan',
  tagline: process.env.EXPO_PUBLIC_DEFAULT_COOP_TAGLINE || 'Building Generational Wealth Together',

  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.soulaan.app',
  webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://soulaan.coop',

  primaryColor: 'amber-600',
  accentColor: 'green-600',

  minPaymentAmount: 0.01,
  maxPaymentAmount: 10000,
  claimExpirationDays: 7,
  withdrawalMinAmount: 1,

  currencySymbol: '$',
  currencyCode: 'USD',

  supportEmail: 'support@soulaan.coop',
  supportPhone: '',

  enableWithdrawals: true,
  enableP2P: true,
};

// Active coop config - set when user authenticates
let activeCoopConfig: CoopConfig = defaultConfig;

/**
 * Set the active coop config based on user's membership
 * Called after authentication with coop data from the backend
 */
export function setActiveCoopConfig(config: Partial<CoopConfig>): void {
  activeCoopConfig = {
    ...defaultConfig,
    ...config,
  };
}

/**
 * Reset to default config (on logout)
 */
export function resetCoopConfig(): void {
  activeCoopConfig = defaultConfig;
}

/**
 * Get the current coop config
 */
export function coopConfig(): CoopConfig {
  return activeCoopConfig;
}

/**
 * Get default config (for unauthenticated screens)
 */
export function defaultCoopConfig(): CoopConfig {
  return defaultConfig;
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  return `${activeCoopConfig.currencySymbol}${amount.toFixed(2)}`;
}

// Helper to get coop name
export function coopName(): string {
  return activeCoopConfig.name;
}

export function coopShortName(): string {
  return activeCoopConfig.shortName;
}
