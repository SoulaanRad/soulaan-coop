/**
 * Stripe Connect Service - Business onboarding and account lifecycle
 * 
 * Responsibilities:
 * - Create and link Stripe Connect accounts
 * - Generate onboarding links
 * - Sync account status and capabilities
 * - Track KYC/verification state
 * - Manage account lifecycle events
 */

import { db } from '@repo/db';
import type Stripe from 'stripe';
import { TRPCError } from '@trpc/server';

/**
 * Create a Stripe Connect account for a business
 * 
 * @param params - Business parameters
 * @returns Created Stripe account
 */
export async function createConnectAccount(params: {
  businessId: string;
  email: string;
  businessType: 'individual' | 'company';
  country?: string;
}): Promise<{
  stripeAccountId: string;
  onboardingUrl: string;
}> {
  const { businessId, email, businessType, country = 'US' } = params;

  console.log(`🔗 [Stripe Connect] Creating Connect account for business ${businessId}`);

  // Check if business already has a Stripe account
  const existingAccount = await db.stripeAccount.findUnique({
    where: { businessId },
  });

  if (existingAccount) {
    console.log(`⚠️ [Stripe Connect] Business already has Stripe account: ${existingAccount.stripeAccountId}`);

    // Generate new onboarding link for existing account
    const onboardingUrl = await generateOnboardingLink({
      accountId: existingAccount.stripeAccountId,
      refreshUrl: `${process.env.APP_URL}/business/onboarding`,
      returnUrl: `${process.env.APP_URL}/business/dashboard`,
    });

    return {
      stripeAccountId: existingAccount.stripeAccountId,
      onboardingUrl,
    };
  }

  // Create Stripe Connect account
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });

  const account = await stripe.accounts.create({
    type: 'express', // Express accounts for faster onboarding
    country,
    email,
    business_type: businessType,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      businessId,
    },
  });

  console.log(`✅ [Stripe Connect] Stripe account created: ${account.id}`);

  // Store in database
  const stripeAccount = await db.stripeAccount.create({
    data: {
      businessId,
      stripeAccountId: account.id,
      accountType: 'express',
      country,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      requirementsPastDue: account.requirements?.past_due || [],
      verificationStatus: 'UNVERIFIED',
      onboardingStatus: 'DRAFT',
    },
  });

  // Record onboarding event
  await db.businessOnboardingEvent.create({
    data: {
      businessId,
      status: 'DRAFT',
      metadata: {
        accountCreated: true,
        accountType: 'express',
      },
    },
  });

  console.log(`✅ [Stripe Connect] Database record created: ${stripeAccount.id}`);

  // Generate onboarding link
  const onboardingUrl = await generateOnboardingLink({
    accountId: account.id,
    refreshUrl: `${process.env.APP_URL}/business/onboarding`,
    returnUrl: `${process.env.APP_URL}/business/dashboard`,
  });

  return {
    stripeAccountId: account.id,
    onboardingUrl,
  };
}

/**
 * Generate Stripe Connect onboarding link
 * 
 * @param params - Link parameters
 * @returns Onboarding URL
 */
export async function generateOnboardingLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<string> {
  const { accountId, refreshUrl, returnUrl } = params;

  console.log(`🔗 [Stripe Connect] Generating onboarding link for account ${accountId}`);

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  console.log(`✅ [Stripe Connect] Onboarding link generated`);

  return accountLink.url;
}

/**
 * Sync Stripe account status from Stripe API
 * 
 * @param accountId - Stripe account ID
 * @returns Updated account status
 */
export async function syncAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsCurrentlyDue: string[];
  verificationStatus: string;
  onboardingStatus: string;
}> {
  console.log(`🔄 [Stripe Connect] Syncing account status: ${accountId}`);

  // Fetch account from Stripe
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });

  const account = await stripe.accounts.retrieve(accountId);

  // Find database record
  const stripeAccount = await db.stripeAccount.findUnique({
    where: { stripeAccountId: accountId },
  });

  if (!stripeAccount) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Stripe account not found in database',
    });
  }

  // Determine onboarding status
  let onboardingStatus: 'DRAFT' | 'SUBMITTED' | 'RESTRICTED' | 'CHARGES_ENABLED' | 'PAYOUTS_ENABLED' | 'REJECTED' =
    'DRAFT';

  if (account.charges_enabled && account.payouts_enabled) {
    onboardingStatus = 'PAYOUTS_ENABLED';
  } else if (account.charges_enabled) {
    onboardingStatus = 'CHARGES_ENABLED';
  } else if (account.details_submitted) {
    onboardingStatus = 'SUBMITTED';
  } else if (account.requirements?.disabled_reason) {
    onboardingStatus = 'REJECTED';
  }

  // Determine verification status
  let verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' = 'UNVERIFIED';

  if (account.charges_enabled) {
    verificationStatus = 'VERIFIED';
  } else if (account.details_submitted) {
    verificationStatus = 'PENDING';
  } else if (account.requirements?.disabled_reason) {
    verificationStatus = 'REJECTED';
  }

  // Update database record
  await db.stripeAccount.update({
    where: { id: stripeAccount.id },
    data: {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      requirementsPastDue: account.requirements?.past_due || [],
      verificationStatus,
      onboardingStatus,
    },
  });

  // Record onboarding event if status changed
  if (onboardingStatus !== stripeAccount.onboardingStatus) {
    await db.businessOnboardingEvent.create({
      data: {
        businessId: stripeAccount.businessId,
        status: onboardingStatus,
        metadata: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          syncedAt: new Date().toISOString(),
        },
      },
    });
  }

  console.log(`✅ [Stripe Connect] Account status synced: ${onboardingStatus}`);

  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirementsCurrentlyDue: account.requirements?.currently_due || [],
    verificationStatus,
    onboardingStatus,
  };
}

/**
 * Check if a business can accept payments
 * 
 * @param businessId - Business ID
 * @returns Boolean indicating payment eligibility
 */
export async function canAcceptPayments(businessId: string): Promise<boolean> {
  const stripeAccount = await db.stripeAccount.findUnique({
    where: { businessId },
  });

  if (!stripeAccount) {
    return false;
  }

  return stripeAccount.chargesEnabled;
}

/**
 * Check if a business can receive payouts
 * 
 * @param businessId - Business ID
 * @returns Boolean indicating payout eligibility
 */
export async function canReceivePayouts(businessId: string): Promise<boolean> {
  const stripeAccount = await db.stripeAccount.findUnique({
    where: { businessId },
  });

  if (!stripeAccount) {
    return false;
  }

  return stripeAccount.payoutsEnabled;
}

/**
 * Get business onboarding status
 * 
 * @param businessId - Business ID
 * @returns Onboarding status
 */
export async function getOnboardingStatus(businessId: string): Promise<{
  hasStripeAccount: boolean;
  stripeAccountId?: string;
  onboardingStatus?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsCurrentlyDue: string[];
  requirementsPastDue: string[];
  canAcceptPayments: boolean;
  canReceivePayouts: boolean;
} | null> {
  const stripeAccount = await db.stripeAccount.findUnique({
    where: { businessId },
  });

  if (!stripeAccount) {
    return {
      hasStripeAccount: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsCurrentlyDue: [],
      requirementsPastDue: [],
      canAcceptPayments: false,
      canReceivePayouts: false,
    };
  }

  return {
    hasStripeAccount: true,
    stripeAccountId: stripeAccount.stripeAccountId,
    onboardingStatus: stripeAccount.onboardingStatus,
    chargesEnabled: stripeAccount.chargesEnabled,
    payoutsEnabled: stripeAccount.payoutsEnabled,
    requirementsCurrentlyDue: stripeAccount.requirementsCurrentlyDue,
    requirementsPastDue: stripeAccount.requirementsPastDue,
    canAcceptPayments: stripeAccount.chargesEnabled,
    canReceivePayouts: stripeAccount.payoutsEnabled,
  };
}

/**
 * Get onboarding history for a business
 * 
 * @param businessId - Business ID
 * @returns Array of onboarding events
 */
export async function getOnboardingHistory(businessId: string): Promise<
  Array<{
    id: string;
    status: string;
    metadata: any;
    occurredAt: Date;
  }>
> {
  const events = await db.businessOnboardingEvent.findMany({
    where: { businessId },
    orderBy: { occurredAt: 'desc' },
  });

  return events.map((event) => ({
    id: event.id,
    status: event.status,
    metadata: event.metadata,
    occurredAt: event.occurredAt,
  }));
}

/**
 * Delete Stripe Connect account (admin operation)
 * 
 * @param businessId - Business ID
 */
export async function deleteConnectAccount(businessId: string): Promise<void> {
  console.log(`🗑️ [Stripe Connect] Deleting Connect account for business ${businessId}`);

  const stripeAccount = await db.stripeAccount.findUnique({
    where: { businessId },
  });

  if (!stripeAccount) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Stripe account not found',
    });
  }

  // Delete account from Stripe
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });

  await stripe.accounts.del(stripeAccount.stripeAccountId);

  // Delete from database
  await db.stripeAccount.delete({
    where: { id: stripeAccount.id },
  });

  console.log(`✅ [Stripe Connect] Account deleted: ${stripeAccount.stripeAccountId}`);
}
