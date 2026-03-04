import { db } from "@repo/db";
import { getTreasuryReserveFromTransaction } from "./uc-event-parser.js";

/**
 * Get active treasury reserve policy for a coop
 */
export async function getActiveReservePolicy(coopId: string = "soulaan"): Promise<{
  defaultReserveBps: number;
  badgeReserveBps?: number;
  programReserveBps?: Record<string, number>;
}> {
  const policy = await db.treasuryReservePolicy.findFirst({
    where: { coopId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!policy) {
    return { defaultReserveBps: 500 }; // Default 5%
  }

  return {
    defaultReserveBps: policy.defaultReserveBps,
    badgeReserveBps: policy.badgeReserveBps ?? undefined,
    programReserveBps: (policy.programReserveBps as Record<string, number>) ?? undefined,
  };
}

/**
 * Calculate reserve amount from transaction
 */
export function calculateReserveAmount(
  transactionAmountUC: number,
  reserveBps: number
): number {
  return (transactionAmountUC * reserveBps) / 10000;
}


/**
 * Track treasury reserve from on-chain event
 * The reserve transfer happens automatically in the UC contract when payment is made to SC-verified store
 */
export async function trackReserveFromTransaction(params: {
  sourceType: string;
  sourceRecordId: string;
  sourceUcTxHash: string;
  transactionAmountUC: number;
  relatedScRewardIds: string[];
}): Promise<{
  reserveEntryId: string;
  reserveAmountUC: number;
} | null> {
  const { sourceType, sourceRecordId, sourceUcTxHash, transactionAmountUC, relatedScRewardIds } = params;

  // Parse reserve event from the UC transaction (reads on-chain data)
  const reserveEvent = await getTreasuryReserveFromTransaction(sourceUcTxHash);

  if (!reserveEvent) {
    console.log(`💰 No reserve event found in tx ${sourceUcTxHash} (store may not be SC-verified)`);
    return null;
  }

  const { reserveAmount, reserveBps } = reserveEvent;

  // Idempotency: skip if we already tracked this source tx
  const existing = await db.treasuryReserveEntry.findFirst({
    where: { sourceUcTxHash },
  });
  if (existing) {
    console.log(`💰 Treasury reserve already tracked for tx ${sourceUcTxHash} (entry ${existing.id})`);
    return { reserveEntryId: existing.id, reserveAmountUC: existing.reserveAmountUC };
  }

  console.log(`💰 Tracking on-chain treasury reserve: ${reserveAmount} UC (${reserveBps / 100}% of ${transactionAmountUC} UC)`);

  // Create settled reserve entry (already transferred on-chain)
  const reserveEntry = await db.treasuryReserveEntry.create({
    data: {
      sourceType,
      sourceRecordId,
      sourceUcTxHash,
      transactionAmountUC,
      reservePercentBps: reserveBps,
      reserveAmountUC: reserveAmount,
      relatedScRewardIds,
      treasuryTxHash: sourceUcTxHash, // Same tx contains the reserve transfer
      status: 'SETTLED',
      settledAt: new Date(),
    },
  });

  console.log(`✅ Treasury reserve tracked: ${reserveAmount} UC from tx ${sourceUcTxHash}`);

  return {
    reserveEntryId: reserveEntry.id,
    reserveAmountUC: reserveAmount,
  };
}

/**
 * Get treasury reserve statistics
 */
export async function getTreasuryReserveStats(): Promise<{
  totalReservedUC: number;
  settledUC: number;
  pendingUC: number;
  failedUC: number;
  totalEntries: number;
  settledCount: number;
  pendingCount: number;
  failedCount: number;
  last30dReservedUC: number;
  currentReserveBps: number;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalSettled,
    totalPending,
    totalFailed,
    settledCount,
    pendingCount,
    failedCount,
    last30dSettled,
    policy,
  ] = await Promise.all([
    db.treasuryReserveEntry.aggregate({
      where: { status: 'SETTLED' },
      _sum: { reserveAmountUC: true },
    }),
    db.treasuryReserveEntry.aggregate({
      where: { status: { in: ['PENDING', 'SETTLING'] } },
      _sum: { reserveAmountUC: true },
    }),
    db.treasuryReserveEntry.aggregate({
      where: { status: 'FAILED' },
      _sum: { reserveAmountUC: true },
    }),
    db.treasuryReserveEntry.count({ where: { status: 'SETTLED' } }),
    db.treasuryReserveEntry.count({ where: { status: { in: ['PENDING', 'SETTLING'] } } }),
    db.treasuryReserveEntry.count({ where: { status: 'FAILED' } }),
    db.treasuryReserveEntry.aggregate({
      where: { 
        status: 'SETTLED',
        settledAt: { gte: thirtyDaysAgo },
      },
      _sum: { reserveAmountUC: true },
    }),
    getActiveReservePolicy(),
  ]);

  const settledUC = totalSettled._sum.reserveAmountUC || 0;
  const pendingUC = totalPending._sum.reserveAmountUC || 0;
  const failedUC = totalFailed._sum.reserveAmountUC || 0;

  return {
    totalReservedUC: settledUC + pendingUC,
    settledUC,
    pendingUC,
    failedUC,
    totalEntries: settledCount + pendingCount + failedCount,
    settledCount,
    pendingCount,
    failedCount,
    last30dReservedUC: last30dSettled._sum.reserveAmountUC || 0,
    currentReserveBps: policy.defaultReserveBps,
  };
}

/**
 * Manually mark a reserve entry as settled (for admin correction)
 */
export async function markReserveAsSettled(entryId: string, txHash: string): Promise<void> {
  const entry = await db.treasuryReserveEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    throw new Error('Reserve entry not found');
  }

  await db.treasuryReserveEntry.update({
    where: { id: entryId },
    data: {
      treasuryTxHash: txHash,
      status: 'SETTLED',
      settledAt: new Date(),
      failureReason: null,
    },
  });

  console.log(`✅ Reserve entry ${entryId} marked as settled`);
}
