/**
 * Reconciliation Service
 * 
 * Compares on-chain events with database records to detect drift and anomalies.
 * Provides alerts and reports for operational monitoring.
 */

import { PrismaClient, Prisma } from "@repo/db";
import { ethers } from "ethers";

// Reconciliation result types
export interface ReconciliationResult {
  timestamp: Date;
  period: string;
  checks: ReconciliationCheck[];
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    failures: number;
  };
  alerts: Alert[];
}

export interface ReconciliationCheck {
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  expected: number | string;
  actual: number | string;
  drift: number;
  threshold: number;
  message: string;
}

export interface Alert {
  severity: "INFO" | "WARNING" | "CRITICAL";
  category: string;
  message: string;
  details: any;
}

// Thresholds for alerts
const THRESHOLDS = {
  PURCHASE_COUNT_DRIFT: 0.05, // 5% drift allowed
  REWARD_AMOUNT_DRIFT: 0.1, // 10% drift allowed for amounts
  MISSING_EVENTS_CRITICAL: 10, // Missing more than 10 events is critical
  FAILED_REWARD_RATE: 0.2, // 20% failed reward rate is concerning
};

/**
 * Reconcile purchase events with database orders
 */
async function reconcilePurchases(
  db: PrismaClient,
  startDate: Date,
  endDate: Date
): Promise<ReconciliationCheck> {
  try {
    // Count on-chain purchase events
    const onChainPurchases = await db.sCRewardTransaction.count({
      where: {
        reason: "STORE_PURCHASE_REWARD",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        txHash: {
          not: null,
        },
      },
    });

    // Count database store orders
    const dbOrders = await db.storeOrder.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        paymentStatus: "COMPLETED",
      },
    });

    const drift = Math.abs(onChainPurchases - dbOrders) / Math.max(dbOrders, 1);
    const status = drift > THRESHOLDS.PURCHASE_COUNT_DRIFT ? "WARN" : "PASS";

    return {
      name: "Purchase Count Reconciliation",
      status,
      expected: dbOrders,
      actual: onChainPurchases,
      drift: drift * 100,
      threshold: THRESHOLDS.PURCHASE_COUNT_DRIFT * 100,
      message: `On-chain purchases: ${onChainPurchases}, DB orders: ${dbOrders}, Drift: ${(drift * 100).toFixed(2)}%`,
    };
  } catch (error) {
    return {
      name: "Purchase Count Reconciliation",
      status: "FAIL",
      expected: 0,
      actual: 0,
      drift: 0,
      threshold: 0,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Reconcile reward execution rates
 */
async function reconcileRewardExecution(
  db: PrismaClient,
  startDate: Date,
  endDate: Date
): Promise<ReconciliationCheck> {
  try {
    const totalPurchases = await db.sCRewardTransaction.count({
      where: {
        reason: "STORE_PURCHASE_REWARD",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const completedRewards = await db.sCRewardTransaction.count({
      where: {
        reason: "STORE_PURCHASE_REWARD",
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const failedRewards = await db.sCRewardTransaction.count({
      where: {
        reason: "STORE_PURCHASE_REWARD",
        status: "FAILED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const failureRate = totalPurchases > 0 ? failedRewards / totalPurchases : 0;
    const successRate = totalPurchases > 0 ? completedRewards / totalPurchases : 0;

    let status: "PASS" | "WARN" | "FAIL" = "PASS";
    if (failureRate > THRESHOLDS.FAILED_REWARD_RATE) {
      status = "WARN";
    }
    if (failureRate > 0.5) {
      status = "FAIL";
    }

    return {
      name: "Reward Execution Rate",
      status,
      expected: `>${((1 - THRESHOLDS.FAILED_REWARD_RATE) * 100).toFixed(0)}%`,
      actual: `${(successRate * 100).toFixed(2)}%`,
      drift: failureRate * 100,
      threshold: THRESHOLDS.FAILED_REWARD_RATE * 100,
      message: `Success: ${completedRewards}/${totalPurchases} (${(successRate * 100).toFixed(2)}%), Failed: ${failedRewards} (${(failureRate * 100).toFixed(2)}%)`,
    };
  } catch (error) {
    return {
      name: "Reward Execution Rate",
      status: "FAIL",
      expected: "N/A",
      actual: "N/A",
      drift: 0,
      threshold: 0,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Check for missing or orphaned events
 */
async function checkMissingEvents(
  db: PrismaClient,
  startDate: Date,
  endDate: Date
): Promise<ReconciliationCheck> {
  try {
    // Find purchases without reward execution
    const pendingRewards = await db.sCRewardTransaction.count({
      where: {
        reason: "STORE_PURCHASE_REWARD",
        status: "PENDING",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Find purchases older than 1 hour still pending
    const stalePending = await db.sCRewardTransaction.count({
      where: {
        reason: "STORE_PURCHASE_REWARD",
        status: "PENDING",
        createdAt: {
          lte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
    });

    let status: "PASS" | "WARN" | "FAIL" = "PASS";
    if (stalePending > 0) {
      status = "WARN";
    }
    if (stalePending > THRESHOLDS.MISSING_EVENTS_CRITICAL) {
      status = "FAIL";
    }

    return {
      name: "Missing/Stale Events",
      status,
      expected: 0,
      actual: stalePending,
      drift: stalePending,
      threshold: THRESHOLDS.MISSING_EVENTS_CRITICAL,
      message: `Pending rewards: ${pendingRewards}, Stale (>1h): ${stalePending}`,
    };
  } catch (error) {
    return {
      name: "Missing/Stale Events",
      status: "FAIL",
      expected: 0,
      actual: 0,
      drift: 0,
      threshold: 0,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Reconcile SC reward amounts
 */
async function reconcileRewardAmounts(
  db: PrismaClient,
  startDate: Date,
  endDate: Date
): Promise<ReconciliationCheck> {
  try {
    // Sum of SC rewards from completed transactions
    const rewardRecords = await db.sCRewardTransaction.findMany({
      where: {
        reason: "STORE_PURCHASE_REWARD",
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amountSC: true,
        metadata: true,
      },
    });

    let dbTotal = 0;
    let onChainTotal = 0;

    for (const record of rewardRecords) {
      dbTotal += record.amountSC;
      
      if (record.metadata && typeof record.metadata === 'object') {
        const metadata = record.metadata as Prisma.JsonObject;
        const buyerReward = metadata.buyerReward;
        if (typeof buyerReward === 'string') {
          onChainTotal += parseFloat(buyerReward);
        } else if (typeof buyerReward === 'number') {
          onChainTotal += buyerReward;
        } else {
          // Fallback to amountSC if metadata doesn't have buyerReward
          onChainTotal += record.amountSC;
        }
      } else {
        // Fallback to amountSC if no metadata
        onChainTotal += record.amountSC;
      }
    }

    const drift = Math.abs(dbTotal - onChainTotal) / Math.max(onChainTotal, 1);
    const status = drift > THRESHOLDS.REWARD_AMOUNT_DRIFT ? "WARN" : "PASS";

    return {
      name: "SC Reward Amount Reconciliation",
      status,
      expected: onChainTotal.toFixed(4),
      actual: dbTotal.toFixed(4),
      drift: drift * 100,
      threshold: THRESHOLDS.REWARD_AMOUNT_DRIFT * 100,
      message: `On-chain total: ${onChainTotal.toFixed(4)} SC, DB total: ${dbTotal.toFixed(4)} SC, Drift: ${(drift * 100).toFixed(2)}%`,
    };
  } catch (error) {
    return {
      name: "SC Reward Amount Reconciliation",
      status: "FAIL",
      expected: "0",
      actual: "0",
      drift: 0,
      threshold: 0,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Generate alerts from reconciliation checks
 */
function generateAlerts(checks: ReconciliationCheck[]): Alert[] {
  const alerts: Alert[] = [];

  for (const check of checks) {
    if (check.status === "FAIL") {
      alerts.push({
        severity: "CRITICAL",
        category: check.name,
        message: `CRITICAL: ${check.name} failed`,
        details: check,
      });
    } else if (check.status === "WARN") {
      alerts.push({
        severity: "WARNING",
        category: check.name,
        message: `WARNING: ${check.name} drift detected`,
        details: check,
      });
    }
  }

  return alerts;
}

/**
 * Run full reconciliation for a time period
 */
export async function runReconciliation(
  db: PrismaClient,
  startDate: Date,
  endDate: Date,
  period: string = "daily"
): Promise<ReconciliationResult> {
  console.log(`\n🔍 Running reconciliation for ${period} (${startDate.toISOString()} to ${endDate.toISOString()})...`);

  const checks: ReconciliationCheck[] = [];

  // Run all reconciliation checks
  checks.push(await reconcilePurchases(db, startDate, endDate));
  checks.push(await reconcileRewardExecution(db, startDate, endDate));
  checks.push(await checkMissingEvents(db, startDate, endDate));
  checks.push(await reconcileRewardAmounts(db, startDate, endDate));

  // Calculate summary
  const summary = {
    totalChecks: checks.length,
    passed: checks.filter(c => c.status === "PASS").length,
    warnings: checks.filter(c => c.status === "WARN").length,
    failures: checks.filter(c => c.status === "FAIL").length,
  };

  // Generate alerts
  const alerts = generateAlerts(checks);

  const result: ReconciliationResult = {
    timestamp: new Date(),
    period,
    checks,
    summary,
    alerts,
  };

  // Log results
  console.log("\n📊 Reconciliation Results:");
  console.log(`   Total Checks: ${summary.totalChecks}`);
  console.log(`   ✅ Passed: ${summary.passed}`);
  console.log(`   ⚠️  Warnings: ${summary.warnings}`);
  console.log(`   ❌ Failures: ${summary.failures}`);

  if (alerts.length > 0) {
    console.log("\n🚨 Alerts:");
    for (const alert of alerts) {
      console.log(`   [${alert.severity}] ${alert.message}`);
    }
  }

  console.log("");

  return result;
}

/**
 * Run daily reconciliation
 */
export async function runDailyReconciliation(db: PrismaClient): Promise<ReconciliationResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  return runReconciliation(db, startDate, endDate, "daily");
}

/**
 * Run hourly reconciliation
 */
export async function runHourlyReconciliation(db: PrismaClient): Promise<ReconciliationResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // 1 hour ago
  return runReconciliation(db, startDate, endDate, "hourly");
}

/**
 * Start continuous reconciliation monitoring
 */
export async function startReconciliationMonitoring(
  db: PrismaClient,
  hourlyIntervalMs: number = 60 * 60 * 1000, // 1 hour
  dailyIntervalMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<void> {
  console.log("🚀 Starting reconciliation monitoring...");

  // Run hourly reconciliation
  setInterval(async () => {
    try {
      const result = await runHourlyReconciliation(db);
      
      // Send alerts if critical issues found
      if (result.summary.failures > 0) {
        console.error("🚨 CRITICAL: Reconciliation failures detected!");
        // TODO: Send to alerting service (e.g., PagerDuty, Slack)
      }
    } catch (error) {
      console.error("❌ Hourly reconciliation failed:", error);
    }
  }, hourlyIntervalMs);

  // Run daily reconciliation
  setInterval(async () => {
    try {
      const result = await runDailyReconciliation(db);
      
      // Log daily summary
      console.log("📈 Daily Reconciliation Summary:");
      console.log(JSON.stringify(result.summary, null, 2));
      
      // TODO: Save to database for historical tracking
    } catch (error) {
      console.error("❌ Daily reconciliation failed:", error);
    }
  }, dailyIntervalMs);

  console.log("✅ Reconciliation monitoring started");
}

/**
 * Export reconciliation report to JSON
 */
export function exportReconciliationReport(result: ReconciliationResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Export reconciliation report to CSV
 */
export function exportReconciliationReportCSV(result: ReconciliationResult): string {
  const lines: string[] = [];
  
  // Header
  lines.push("Check Name,Status,Expected,Actual,Drift %,Threshold %,Message");
  
  // Data rows
  for (const check of result.checks) {
    lines.push([
      check.name,
      check.status,
      check.expected,
      check.actual,
      check.drift.toFixed(2),
      check.threshold.toFixed(2),
      `"${check.message}"`,
    ].join(","));
  }
  
  return lines.join("\n");
}
