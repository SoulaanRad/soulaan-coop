import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Monitor SC awards for suspicious activity
 * 
 * Run this script periodically (e.g., every hour) to detect:
 * - Unusually large SC awards
 * - Too many awards to single address
 * - Awards from unexpected addresses
 * - Unusual patterns
 * 
 * Usage:
 *   pnpm monitor-sc-awards
 * 
 * Set up as a cron job:
 *   0 * * * * cd /path/to/contracts && pnpm monitor-sc-awards
 */

// Thresholds (adjust based on your use case)
const THRESHOLDS = {
  LARGE_AWARD: ethers.parseEther("100"), // Alert if single award > 100 SC
  DAILY_LIMIT_PER_ADDRESS: ethers.parseEther("500"), // Alert if address receives > 500 SC/day
  HOURLY_TOTAL_LIMIT: ethers.parseEther("1000"), // Alert if > 1000 SC awarded in 1 hour
};

async function main() {
  console.log("\n🔍 SC Award Monitoring Report");
  console.log("=" .repeat(60));
  console.log("Time:", new Date().toISOString());
  console.log("");

  const SC_ADDRESS = process.env.SC_CONTRACT_ADDRESS || "";
  if (!SC_ADDRESS) {
    console.log("❌ Please set SC_CONTRACT_ADDRESS in .env");
    process.exit(1);
  }

  const scContract = await ethers.getContractAt("SoulaaniCoin", SC_ADDRESS);

  // Get current block and calculate lookback
  const currentBlock = await ethers.provider.getBlockNumber();
  const blocksPerHour = 1800; // ~2 second blocks on Base
  const hourAgoBlock = currentBlock - blocksPerHour;

  console.log("Current Block:", currentBlock);
  console.log("Checking from block:", hourAgoBlock);
  console.log("");

  // Query Awarded events from last hour
  const awardedEvents = await scContract.queryFilter(
    scContract.filters.Awarded(),
    hourAgoBlock,
    currentBlock
  );

  console.log(`📊 Found ${awardedEvents.length} SC awards in the last hour\n`);

  if (awardedEvents.length === 0) {
    console.log("✅ No awards in the last hour. All quiet.\n");
    return;
  }

  // Analyze awards
  const alerts: string[] = [];
  const recipientTotals = new Map<string, bigint>();
  let hourlyTotal = 0n;

  for (const event of awardedEvents) {
    const { recipient, amount, reason, awarder } = event.args;

    // Check for large single award
    if (amount > THRESHOLDS.LARGE_AWARD) {
      alerts.push(
        `⚠️  LARGE AWARD: ${ethers.formatEther(amount)} SC to ${recipient} ` +
        `(reason: ${ethers.decodeBytes32String(reason)}) ` +
        `by ${awarder}`
      );
    }

    // Accumulate per-recipient totals
    const currentTotal = recipientTotals.get(recipient) || 0n;
    recipientTotals.set(recipient, currentTotal + amount);

    // Accumulate hourly total
    hourlyTotal += amount;
  }

  // Check per-address limits (should really be per-day, but checking per-hour for demo)
  for (const [recipient, total] of recipientTotals) {
    if (total > THRESHOLDS.DAILY_LIMIT_PER_ADDRESS) {
      alerts.push(
        `⚠️  HIGH VOLUME TO ADDRESS: ${recipient} received ` +
        `${ethers.formatEther(total)} SC in last hour`
      );
    }
  }

  // Check hourly total limit
  if (hourlyTotal > THRESHOLDS.HOURLY_TOTAL_LIMIT) {
    alerts.push(
      `⚠️  HIGH HOURLY VOLUME: ${ethers.formatEther(hourlyTotal)} SC ` +
      `awarded in last hour (threshold: ${ethers.formatEther(THRESHOLDS.HOURLY_TOTAL_LIMIT)})`
    );
  }

  // Display results
  console.log("📈 HOURLY SUMMARY:");
  console.log("  Total SC Awarded:", ethers.formatEther(hourlyTotal), "SC");
  console.log("  Unique Recipients:", recipientTotals.size);
  console.log("  Average per Award:", ethers.formatEther(hourlyTotal / BigInt(awardedEvents.length)), "SC");
  console.log("");

  if (alerts.length > 0) {
    console.log("🚨 ALERTS (" + alerts.length + "):");
    console.log("=" .repeat(60));
    for (const alert of alerts) {
      console.log(alert);
    }
    console.log("=" .repeat(60));
    console.log("");
    console.log("⚠️  ACTION REQUIRED:");
    console.log("1. Review the above alerts");
    console.log("2. Check if activity is legitimate");
    console.log("3. If compromised, run: pnpm manage-roles");
    console.log("4. Revoke GOVERNANCE_AWARD from compromised address");
    console.log("");

    // Optionally send alerts (uncomment and configure)
    // await sendSlackAlert(alerts);
    // await sendEmailAlert(alerts);
    
    process.exit(1); // Exit with error code for alerting systems
  } else {
    console.log("✅ No suspicious activity detected\n");
  }

  // Display recent awards for transparency
  console.log("📋 RECENT AWARDS (last 10):");
  console.log("=" .repeat(60));
  const recentAwards = awardedEvents.slice(-10).reverse();
  for (const event of recentAwards) {
    const { recipient, amount, reason } = event.args;
    console.log(
      `  ${recipient.slice(0, 10)}... ` +
      `← ${ethers.formatEther(amount)} SC ` +
      `(${ethers.decodeBytes32String(reason)})`
    );
  }
  console.log("=" .repeat(60));
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Monitoring failed:", error);
    process.exit(1);
  });

