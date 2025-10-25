import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Check for inactive members and apply SC decay
 * 
 * Per charter: "SC decays for inactivity: If not active for 12 months,
 * power decays and is redistributed."
 * 
 * This script:
 * 1. Finds members inactive for 12+ months
 * 2. Calculates decay amount
 * 3. Proposes slashing via Treasury Safe
 * 
 * Run monthly via cron or manually.
 */

// Configuration
const INACTIVITY_THRESHOLD = 365 * 24 * 60 * 60; // 12 months in seconds
const DECAY_POLICY = {
  // Choose one:
  
  // Option A: Full decay after 12 months
  type: 'full',
  
  // Option B: Gradual decay (10% per month after 12 months)
  // type: 'gradual',
  // percentPerMonth: 10,
  
  // Option C: Fixed amount per month
  // type: 'fixed',
  // amountPerMonth: ethers.parseEther('10'),
};

async function main() {
  console.log("\n🕐 SC Inactivity Decay Check");
  console.log("=" .repeat(60));
  console.log("Time:", new Date().toISOString());
  console.log("Threshold: 12 months (365 days)");
  console.log("Policy:", DECAY_POLICY.type);
  console.log("");

  const SC_ADDRESS = process.env.SC_CONTRACT_ADDRESS || "";
  if (!SC_ADDRESS) {
    console.log("❌ Please set SC_CONTRACT_ADDRESS in .env");
    process.exit(1);
  }

  const scContract = await ethers.getContractAt("SoulaaniCoin", SC_ADDRESS);
  const currentTime = Math.floor(Date.now() / 1000);

  // In production, get this from your database
  // For now, we'll check a list of known addresses
  const membersToCheck: string[] = [
    // Add member addresses here, or fetch from database
    // Example:
    // "0x1234567890123456789012345678901234567890",
    // "0x2345678901234567890123456789012345678901",
  ];

  if (membersToCheck.length === 0) {
    console.log("ℹ️  No members to check. Add addresses to the script or connect a database.");
    console.log("");
    console.log("In production, you would:");
    console.log("1. Query your database for all member wallet addresses");
    console.log("2. Check each one for inactivity");
    console.log("3. Propose decay transactions to Treasury Safe");
    console.log("");
    return;
  }

  console.log(`📋 Checking ${membersToCheck.length} members...\n`);

  const inactiveMembers: Array<{
    address: string;
    balance: bigint;
    timeSinceActive: number;
    daysSinceActive: number;
    decayAmount: bigint;
  }> = [];

  for (const address of membersToCheck) {
    try {
      // Check time since last activity
      const timeSinceActive = await scContract.getTimeSinceLastActivity(address);
      
      // Skip if active recently or never active
      if (timeSinceActive === 0n || timeSinceActive < INACTIVITY_THRESHOLD) {
        continue;
      }

      // Get SC balance
      const balance = await scContract.balanceOf(address);
      
      // Skip if no SC to decay
      if (balance === 0n) {
        continue;
      }

      // Calculate decay amount based on policy
      let decayAmount = 0n;
      const daysSinceActive = Number(timeSinceActive) / 86400;

      if (DECAY_POLICY.type === 'full') {
        // Decay all SC after 12 months
        decayAmount = balance;
      } else if (DECAY_POLICY.type === 'gradual') {
        // Gradual decay: X% per month after 12 months
        const monthsInactive = Math.floor(Number(timeSinceActive) / (30 * 86400));
        const monthsOverThreshold = monthsInactive - 12;
        if (monthsOverThreshold > 0) {
          const decayPercent = Math.min(
            monthsOverThreshold * (DECAY_POLICY.percentPerMonth || 10),
            100
          );
          decayAmount = (balance * BigInt(decayPercent)) / 100n;
        }
      } else if (DECAY_POLICY.type === 'fixed') {
        // Fixed amount per month
        const monthsInactive = Math.floor(Number(timeSinceActive) / (30 * 86400));
        const monthsOverThreshold = monthsInactive - 12;
        if (monthsOverThreshold > 0) {
          decayAmount = (DECAY_POLICY.amountPerMonth || 0n) * BigInt(monthsOverThreshold);
          // Don't decay more than balance
          if (decayAmount > balance) {
            decayAmount = balance;
          }
        }
      }

      if (decayAmount > 0) {
        inactiveMembers.push({
          address,
          balance,
          timeSinceActive: Number(timeSinceActive),
          daysSinceActive,
          decayAmount,
        });
      }
    } catch (error) {
      console.log(`⚠️  Error checking ${address}:`, error);
    }
  }

  // Display results
  if (inactiveMembers.length === 0) {
    console.log("✅ No inactive members requiring decay.\n");
    return;
  }

  console.log(`⚠️  Found ${inactiveMembers.length} inactive members:\n`);
  console.log("=" .repeat(60));

  let totalDecay = 0n;
  for (const member of inactiveMembers) {
    console.log(`Address: ${member.address}`);
    console.log(`  Balance: ${ethers.formatEther(member.balance)} SC`);
    console.log(`  Days since active: ${member.daysSinceActive.toFixed(1)}`);
    console.log(`  Decay amount: ${ethers.formatEther(member.decayAmount)} SC`);
    console.log(`  Remaining: ${ethers.formatEther(member.balance - member.decayAmount)} SC`);
    console.log("");
    totalDecay += member.decayAmount;
  }

  console.log("=" .repeat(60));
  console.log(`Total SC to decay: ${ethers.formatEther(totalDecay)} SC`);
  console.log("=" .repeat(60));
  console.log("");

  console.log("📝 NEXT STEPS:");
  console.log("1. Review the list above");
  console.log("2. Verify these members are actually inactive");
  console.log("3. Create slash transactions via Treasury Safe:");
  console.log("");
  console.log("   For each member, call:");
  console.log("   SC.slash(memberAddress, decayAmount, keccak256('INACTIVITY_DECAY'))");
  console.log("");
  console.log("4. Execute via Safe (requires 3/5 signatures)");
  console.log("5. Optional: Redistribute to active members");
  console.log("");

  // Generate Safe transaction batch (for convenience)
  console.log("💡 SAFE TRANSACTION DATA:");
  console.log("=" .repeat(60));
  console.log("Copy this to Safe UI for batch execution:\n");
  
  for (const member of inactiveMembers) {
    console.log(`{`);
    console.log(`  "to": "${SC_ADDRESS}",`);
    console.log(`  "value": "0",`);
    console.log(`  "data": "${scContract.interface.encodeFunctionData('slash', [
      "${member.address}",
      "${member.decayAmount}",
      "${ethers.id('INACTIVITY_DECAY')}"
    ])},"`);
    console.log("");
  }
  console.log("=" .repeat(60));
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

