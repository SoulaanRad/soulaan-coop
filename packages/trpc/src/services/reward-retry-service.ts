import { db } from "@repo/db";
import { mintSCToUser } from "./wallet-service.js";
import { trackReserveFromTransaction } from "./treasury-reserve-service.js";
import { getTreasuryReserveFromTransaction, getUCTransferFromTransaction } from "./uc-event-parser.js";

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const STUCK_PENDING_THRESHOLD_MS = 10 * 60 * 1000; // pending for >10 min with no txHash = stuck

let retryTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Attempt to mint SC for one FAILED or stuck PENDING record.
 */
async function retryOneReward(recordId: string): Promise<void> {
  const record = await db.sCRewardTransaction.findUnique({
    where: { id: recordId },
  });

  if (!record || record.status === "COMPLETED") return;

  if (record.retryCount >= MAX_RETRIES) {
    console.warn(`⚠️  SC reward ${recordId} at max retries (${MAX_RETRIES}), giving up`);
    return;
  }

  console.log(
    `🔄 Retrying SC reward ${recordId} | user ${record.userId} | ` +
    `attempt ${record.retryCount + 1}/${MAX_RETRIES}`
  );

  try {
    const { txHash, actualAmountSC } = await mintSCToUser(
      record.userId,
      record.amountSC,
      record.reason,
      record.sourceUcTxHash ?? undefined,
      undefined, // treasuryReserveAmountUC
      record.coopId
    );

    await db.sCRewardTransaction.update({
      where: { id: recordId },
      data: {
        status: "COMPLETED",
        txHash,
        amountSC: actualAmountSC, // update to actual minted amount
        completedAt: new Date(),
        failureReason: null,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });

    console.log(`✅ SC reward retry succeeded for ${recordId} — tx: ${txHash} | actual: ${actualAmountSC} SC`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ SC reward retry failed for ${recordId}:`, msg);

    await db.sCRewardTransaction.update({
      where: { id: recordId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: msg,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });
  }
}

/**
 * For every COMPLETED SC reward that has a sourceUcTxHash but no TreasuryReserveEntry:
 * - If the on-chain TreasuryReserveTransferred event exists → create a SETTLED entry.
 * - If the event is missing (store wasn't SC-verified at time of tx) → create a FAILED
 *   entry so the admin can see it and understand what happened.
 */
async function retryMissingReserveTracking(): Promise<{
  settled: number;
  failed: number;
  skipped: number;
}> {
  const completedWithSource = await db.sCRewardTransaction.findMany({
    where: {
      status: "COMPLETED",
      sourceUcTxHash: { not: null },
      sourceType: { not: null },
      sourceRecordId: { not: null },
    },
    select: {
      id: true,
      coopId: true,
      sourceUcTxHash: true,
      sourceType: true,
      sourceRecordId: true,
      amountSC: true,
    },
    distinct: ["sourceUcTxHash"],
  });

  let settled = 0, failed = 0, skipped = 0;

  for (const record of completedWithSource) {
    if (!record.sourceUcTxHash || !record.sourceType || !record.sourceRecordId) continue;

    const existing = await db.treasuryReserveEntry.findFirst({
      where: { sourceUcTxHash: record.sourceUcTxHash },
    });
    if (existing) { skipped++; continue; }

    console.log(`💰 Checking treasury reserve for tx ${record.sourceUcTxHash}`);
    try {
      const relatedRewards = await db.sCRewardTransaction.findMany({
        where: { sourceUcTxHash: record.sourceUcTxHash, status: "COMPLETED" },
        select: { id: true },
      });

      // Try to find the on-chain event first
      const reserveEvent = await getTreasuryReserveFromTransaction(record.sourceUcTxHash, record.coopId);

      if (reserveEvent) {
        // Event exists — track normally as SETTLED
        await trackReserveFromTransaction({
          coopId: record.coopId,
          sourceType: record.sourceType,
          sourceRecordId: record.sourceRecordId,
          sourceUcTxHash: record.sourceUcTxHash,
          transactionAmountUC: reserveEvent.paymentAmount,
          relatedScRewardIds: relatedRewards.map((r) => r.id),
        });
        settled++;
      } else {
        // No on-chain event — store wasn't SC-verified at time of tx.
        // Read the actual UC transfer amount from the blockchain.
        const ucTransfer = await getUCTransferFromTransaction(record.sourceUcTxHash, record.coopId);
        const txAmountUC = ucTransfer?.amountUC ?? 0;
        const defaultBps = 500; // 5% default
        const estimatedReserveUC = txAmountUC * (defaultBps / 10000);

        await db.treasuryReserveEntry.create({
          data: {
            coopId: record.coopId,
            sourceType: record.sourceType,
            sourceRecordId: record.sourceRecordId,
            sourceUcTxHash: record.sourceUcTxHash,
            transactionAmountUC: txAmountUC,
            reservePercentBps: defaultBps,
            reserveAmountUC: estimatedReserveUC,
            status: "FAILED",
            failedAt: new Date(),
            failureReason: "Store was not SC-verified on-chain at time of transaction — no wealth fund transfer occurred",
            relatedScRewardIds: relatedRewards.map((r) => r.id),
          },
        });
        console.log(`⚠️  Created FAILED reserve entry for tx ${record.sourceUcTxHash} (store not verified on-chain)`);
        failed++;
      }
    } catch (error) {
      console.error(
        `❌ Treasury reserve sync failed for tx ${record.sourceUcTxHash}:`,
        error
      );
    }
  }

  return { settled, failed, skipped };
}

/**
 * One retry cycle: pick up to 20 retryable SC rewards and process them,
 * then catch up on any missing treasury reserve entries.
 */
export async function runRetryCycle(): Promise<{
  scRetriedCount: number;
  reserveSettled: number;
  reserveFailed: number;
  reserveSkipped: number;
}> {
  const stuckBefore = new Date(Date.now() - STUCK_PENDING_THRESHOLD_MS);

  const retryable = await db.sCRewardTransaction.findMany({
    where: {
      retryCount: { lt: MAX_RETRIES },
      OR: [
        { status: "FAILED" },
        // PENDING with no txHash older than threshold = stuck
        { status: "PENDING", txHash: null, createdAt: { lt: stuckBefore } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  if (retryable.length > 0) {
    console.log(`🔄 Retry cycle: processing ${retryable.length} SC reward(s)`);
    for (const { id } of retryable) {
      await retryOneReward(id);
      // Small delay to avoid nonce collisions on sequential mints
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const reserveResults = await retryMissingReserveTracking();

  return {
    scRetriedCount: retryable.length,
    reserveSettled: reserveResults.settled,
    reserveFailed: reserveResults.failed,
    reserveSkipped: reserveResults.skipped,
  };
}

/**
 * Start the background retry loop. Call once on server startup.
 */
export function startRewardRetryService(): void {
  if (retryTimer) return;

  console.log(
    `🔄 SC reward retry service started — runs every ${RETRY_INTERVAL_MS / 1000 / 60} min`
  );

  // Run immediately on startup to catch anything stuck from a prior crash
  runRetryCycle().catch((err) => console.error("❌ Initial retry cycle error:", err));

  retryTimer = setInterval(() => {
    runRetryCycle().catch((err) => console.error("❌ Retry cycle error:", err));
  }, RETRY_INTERVAL_MS);
}

export function stopRewardRetryService(): void {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
    console.log("🛑 SC reward retry service stopped");
  }
}
