/**
 * SC tokens awarded per $1 USD spent.
 * Supports decimals — e.g. 0.1 means $1 = 0.1 SC, $50 = 5 SC.
 * With 100,000 SC seeded at deploy, the 2% hard cap = ~2,000 SC per user.
 */
export const SC_REWARD_RATE = .1; // 0.1 SC per $1 USD

/**
 * Minimum SC reward to mint in a single transaction.
 * Supports decimals — e.g. 0.01 allows very small rewards through.
 * Rewards below this threshold are skipped to avoid dust.
 */
export const SC_MIN_REWARD_THRESHOLD = .001;
