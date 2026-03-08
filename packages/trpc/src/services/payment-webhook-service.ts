/**
 * Payment Webhook Service - Stripe webhook verification and event persistence
 * 
 * Responsibilities:
 * - Verify Stripe webhook signatures
 * - Persist Stripe events for idempotency
 * - Emit domain events for other services to consume
 * 
 * Does NOT directly mint tokens or update treasury - those are separate concerns.
 */

import { db } from '@repo/db';
import type Stripe from 'stripe';
import crypto from 'crypto';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const HOOKDECK_SIGNATURE_KEY = process.env.HOOKDECK_SIGNATURE_KEY;
const USE_HOOKDECK = process.env.USE_HOOKDECK === 'true';

/**
 * Verify and persist a Stripe webhook event
 * 
 * @param params - Webhook parameters
 * @returns Parsed and verified event
 */
export async function verifyAndPersistWebhook(params: {
  payload: string | Buffer;
  signature?: string;
  hookdeckSignature?: string;
}): Promise<{
  event: Stripe.Event;
  eventRecord: {
    id: string;
    stripeEventId: string;
    eventType: string;
    processed: boolean;
  };
  isNewEvent: boolean;
}> {
  const { payload, signature, hookdeckSignature } = params;

  console.log(`🔷 [Payment Webhook] Verifying webhook...`);

  let event: Stripe.Event;

  // Verify signature and parse event
  if (USE_HOOKDECK && hookdeckSignature) {
    // Hookdeck proxy mode
    event = await verifyHookdeckWebhook(payload, hookdeckSignature);
  } else if (signature) {
    // Direct Stripe mode
    event = await verifyStripeWebhook(payload, signature);
  } else {
    throw new Error('No signature provided for webhook verification');
  }

  console.log(`✅ [Payment Webhook] Signature verified for event: ${event.id}`);
  console.log(`📨 [Payment Webhook] Event type: ${event.type}`);

  // Check if event already processed (idempotency)
  const existingEvent = await db.stripePaymentEvent.findUnique({
    where: { stripeEventId: event.id },
  });

  if (existingEvent) {
    console.log(`🔄 [Payment Webhook] Event already exists: ${existingEvent.id} (processed: ${existingEvent.processed})`);
    return {
      event,
      eventRecord: {
        id: existingEvent.id,
        stripeEventId: existingEvent.stripeEventId,
        eventType: existingEvent.eventType,
        processed: existingEvent.processed,
      },
      isNewEvent: false,
    };
  }

  // Persist new event
  const eventRecord = await db.stripePaymentEvent.create({
    data: {
      stripeEventId: event.id,
      eventType: event.type,
      accountId: (event.account as string) || null,
      payload: event as any,
      processed: false,
    },
  });

  console.log(`✅ [Payment Webhook] Event persisted: ${eventRecord.id}`);

  return {
    event,
    eventRecord: {
      id: eventRecord.id,
      stripeEventId: eventRecord.stripeEventId,
      eventType: eventRecord.eventType,
      processed: eventRecord.processed,
    },
    isNewEvent: true,
  };
}

/**
 * Verify Stripe webhook signature (direct mode)
 */
async function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });

  try {
    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
    const event = stripe.webhooks.constructEvent(
      payloadString,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error(`❌ [Payment Webhook] Stripe signature verification failed:`, error);
    throw new Error('Invalid Stripe signature');
  }
}

/**
 * Verify Hookdeck webhook signature (proxy mode)
 */
async function verifyHookdeckWebhook(
  payload: string | Buffer,
  hookdeckSignature: string
): Promise<Stripe.Event> {
  if (!HOOKDECK_SIGNATURE_KEY) {
    throw new Error('HOOKDECK_SIGNATURE_KEY not configured');
  }

  const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;

  // Verify Hookdeck signature
  const expectedSig = crypto
    .createHmac('sha256', HOOKDECK_SIGNATURE_KEY)
    .update(payloadString)
    .digest('hex');

  if (hookdeckSignature !== expectedSig) {
    throw new Error('Invalid Hookdeck signature');
  }

  // Parse event (Hookdeck already verified Stripe signature)
  const event = JSON.parse(payloadString) as Stripe.Event;
  return event;
}

/**
 * Mark event as processed
 * 
 * @param eventId - Database event record ID
 */
export async function markEventAsProcessed(eventId: string): Promise<void> {
  await db.stripePaymentEvent.update({
    where: { id: eventId },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  });

  console.log(`✅ [Payment Webhook] Event marked as processed: ${eventId}`);
}

/**
 * Get unprocessed events
 * For background job to retry failed processing
 * 
 * @param limit - Maximum number of events to return
 * @returns Array of unprocessed events
 */
export async function getUnprocessedEvents(limit: number = 10): Promise<Array<{
  id: string;
  stripeEventId: string;
  eventType: string;
  payload: Stripe.Event;
  createdAt: Date;
}>> {
  const events = await db.stripePaymentEvent.findMany({
    where: {
      processed: false,
      // Only retry events older than 1 minute
      createdAt: {
        lt: new Date(Date.now() - 60000),
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
  });

  return events.map(event => ({
    id: event.id,
    stripeEventId: event.stripeEventId,
    eventType: event.eventType,
    payload: event.payload as unknown as Stripe.Event,
    createdAt: event.createdAt,
  }));
}

/**
 * Retry processing for an event
 * 
 * @param eventId - Database event record ID
 * @returns Event data
 */
export async function getEventForRetry(eventId: string): Promise<{
  id: string;
  stripeEventId: string;
  eventType: string;
  payload: Stripe.Event;
} | null> {
  const event = await db.stripePaymentEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return null;
  }

  return {
    id: event.id,
    stripeEventId: event.stripeEventId,
    eventType: event.eventType,
    payload: event.payload as unknown as Stripe.Event,
  };
}
