import Stripe from 'stripe';
import { db } from '@repo/db';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripe) {
    stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripe;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, name: true, phone: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Return existing customer if available
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name || undefined,
    phone: user.phone || undefined,
    metadata: {
      userId,
    },
  });

  // Save customer ID to user
  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  console.log(`✅ Created Stripe customer ${customer.id} for user ${userId}`);
  return customer.id;
}

/**
 * Save a payment method to a user's account
 */
export async function savePaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<{ id: string; last4: string; brand: string }> {
  const stripeCustomerId = await getOrCreateStripeCustomer(userId);

  // Attach payment method to customer
  await getStripe().paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId,
  });

  // Get payment method details
  const paymentMethod = await getStripe().paymentMethods.retrieve(paymentMethodId);

  if (paymentMethod.type !== 'card' || !paymentMethod.card) {
    throw new Error('Only card payment methods are supported');
  }

  // Check if user has any existing payment methods
  const existingMethods = await db.paymentMethod.count({
    where: { userId },
  });

  // Save to database
  const savedMethod = await db.paymentMethod.create({
    data: {
      userId,
      stripePaymentMethodId: paymentMethodId,
      type: 'card',
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      expiryMonth: paymentMethod.card.exp_month,
      expiryYear: paymentMethod.card.exp_year,
      isDefault: existingMethods === 0, // First card is default
    },
  });

  // If this is the first card, set it as default on the user
  if (existingMethods === 0) {
    await db.user.update({
      where: { id: userId },
      data: { defaultPaymentMethodId: savedMethod.id },
    });
  }

  console.log(`✅ Saved payment method ${savedMethod.id} for user ${userId}`);
  return {
    id: savedMethod.id,
    last4: savedMethod.last4,
    brand: savedMethod.brand,
  };
}

/**
 * Remove a payment method from a user's account
 */
export async function removePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
  const method = await db.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId },
  });

  if (!method) {
    throw new Error('Payment method not found');
  }

  // Detach from Stripe
  await getStripe().paymentMethods.detach(method.stripePaymentMethodId);

  // Delete from database
  await db.paymentMethod.delete({
    where: { id: paymentMethodId },
  });

  // If this was the default, set another one as default
  if (method.isDefault) {
    const nextMethod = await db.paymentMethod.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (nextMethod) {
      await db.paymentMethod.update({
        where: { id: nextMethod.id },
        data: { isDefault: true },
      });
      await db.user.update({
        where: { id: userId },
        data: { defaultPaymentMethodId: nextMethod.id },
      });
    } else {
      await db.user.update({
        where: { id: userId },
        data: { defaultPaymentMethodId: null },
      });
    }
  }

  console.log(`✅ Removed payment method ${paymentMethodId} for user ${userId}`);
}

/**
 * Set a payment method as default
 */
export async function setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
  // Unset current default
  await db.paymentMethod.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });

  // Set new default
  await db.paymentMethod.update({
    where: { id: paymentMethodId, userId },
    data: { isDefault: true },
  });

  await db.user.update({
    where: { id: userId },
    data: { defaultPaymentMethodId: paymentMethodId },
  });

  console.log(`✅ Set payment method ${paymentMethodId} as default for user ${userId}`);
}

/**
 * Charge a saved payment method (for JIT funding)
 */
export async function chargePaymentMethod(
  userId: string,
  amountCents: number,
  description: string,
  metadata?: Record<string, string>
): Promise<{ paymentIntentId: string; chargeId: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, defaultPaymentMethodId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error('User does not have a Stripe customer');
  }

  // Get default payment method
  const defaultMethod = user.defaultPaymentMethodId
    ? await db.paymentMethod.findUnique({
        where: { id: user.defaultPaymentMethodId },
      })
    : await db.paymentMethod.findFirst({
        where: { userId, isDefault: true },
      });

  if (!defaultMethod) {
    throw new Error('No payment method on file. Please add a card first.');
  }

  // Create and confirm payment intent (off-session charge)
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: user.stripeCustomerId,
    payment_method: defaultMethod.stripePaymentMethodId,
    off_session: true,
    confirm: true,
    description,
    metadata: {
      userId,
      type: 'p2p_funding',
      ...metadata,
    },
  });

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Payment failed with status: ${paymentIntent.status}`);
  }

  console.log(`✅ Charged ${amountCents} cents from user ${userId}`);
  return {
    paymentIntentId: paymentIntent.id,
    chargeId: paymentIntent.latest_charge as string,
  };
}

/**
 * Refund a payment (for failed transfers)
 */
export async function refundPayment(
  paymentIntentId: string,
  amountCents?: number
): Promise<{ refundId: string }> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
  };

  // If amount specified, do partial refund; otherwise full refund
  if (amountCents) {
    refundParams.amount = amountCents;
  }

  const refund = await getStripe().refunds.create(refundParams);

  console.log(`✅ Created refund ${refund.id} for payment ${paymentIntentId}`);
  return {
    refundId: refund.id,
  };
}

/**
 * Create a Stripe payout to a bank account
 */
export async function createPayout(
  amountCents: number,
  bankAccountId: string,
  metadata?: Record<string, string>
): Promise<string> {
  // Note: Payouts require Stripe Connect or Treasury
  // For now, this creates a payout from the platform account
  // In production, you'd use Stripe Connect for user-specific payouts

  const payout = await getStripe().payouts.create({
    amount: amountCents,
    currency: 'usd',
    metadata: {
      bankAccountId,
      ...metadata,
    },
  });

  console.log(`✅ Created payout ${payout.id} for ${amountCents} cents`);
  return payout.id;
}

/**
 * Create a SetupIntent for adding a new payment method
 */
export async function createSetupIntent(userId: string): Promise<{ clientSecret: string }> {
  const stripeCustomerId = await getOrCreateStripeCustomer(userId);

  const setupIntent = await getStripe().setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    metadata: {
      userId,
    },
  });

  return {
    clientSecret: setupIntent.client_secret!,
  };
}
