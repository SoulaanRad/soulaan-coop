import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

dotenv.config();

/**
 * Sync Database to Blockchain
 * 
 * This script syncs active users from the database to the SoulaaniCoin contract.
 * Use this script to:
 * 1. Initial setup: Award SC to all existing active users
 * 2. Periodic sync: Add new active users and award them SC
 * 
 * The script:
 * 1. Reads active users from the database (UserStatus.ACTIVE)
 * 2. Adds them as members to the SC contract
 * 3. Awards SC based on their role
 * 
 * Default award amounts (can be customized):
 * - Regular members: 100 SC
 * - Business owners: 200 SC
 * - Admins/Governors: 500 SC
 * 
 * Usage:
 *   npx hardhat run scripts/sync-db-to-blockchain.ts --network baseSepolia
 */

const BATCH_SIZE = 50;

// Get SC contract address from environment variable
const SC_CONTRACT_ADDRESS = process.env.SOULAANI_COIN_ADDRESS;

if (!SC_CONTRACT_ADDRESS) {
  throw new Error(
    "SOULAANI_COIN_ADDRESS not found in .env file. " +
    "Please add it or run full-deployment.ts first."
  );
}

// Award amounts by role
const AWARD_AMOUNTS = {
  member: "100",      // Regular members get 100 SC
  business: "200",    // Business owners get 200 SC
  admin: "500",       // Admins get 500 SC
  governor: "500",    // Governors get 500 SC
};

interface UserToAward {
  id: string;
  walletAddress: string;
  roles: string[];
  amount: string;
  name?: string;
  email: string;
}

async function waitForTx(tx: any, description: string) {
  console.log(`   ⏳ ${description}...`);
  const receipt = await tx.wait();
  await new Promise(resolve => setTimeout(resolve, 2000));
  return receipt;
}

async function main() {
  console.log("\n🔄 SYNC DATABASE TO BLOCKCHAIN\n");
  console.log("=".repeat(70));
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");
  
  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH!");
  }

  console.log("=".repeat(70));
  console.log("");

  // ========== STEP 1: CONNECT TO SC CONTRACT ==========
  console.log("🔗 STEP 1: Connecting to SoulaaniCoin contract");
  console.log("-".repeat(70));
  console.log(`   Address: ${SC_CONTRACT_ADDRESS}\n`);
  
  const soulaaniCoin = await ethers.getContractAt("SoulaaniCoin", SC_CONTRACT_ADDRESS);

  // ========== STEP 2: FETCH ACTIVE USERS FROM DATABASE ==========
  console.log("📊 STEP 2: Fetching active users from database");
  console.log("-".repeat(70));
  
  const prisma = new PrismaClient();
  
  try {
    // Fetch all ACTIVE users with wallet addresses
    const activeUsers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        walletAddress: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        roles: true,
      }
    });
    
    console.log(`   Found ${activeUsers.length} active users with wallets\n`);
    
    if (activeUsers.length === 0) {
      console.log("   ℹ️  No active users found. Exiting.");
      await prisma.$disconnect();
      return;
    }

    // ========== STEP 3: ADD ALL ACTIVE USERS AS MEMBERS ==========
    console.log("\n👥 STEP 3: Adding all active users as members");
    console.log("-".repeat(70));
    
    const allAddresses = activeUsers.map(u => u.walletAddress!);
    let addedCount = 0;
    
    for (let i = 0; i < allAddresses.length; i += BATCH_SIZE) {
      const batch = allAddresses.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      try {
        const tx = await soulaaniCoin.addMembersBatch(batch);
        await waitForTx(tx, `Adding batch ${batchNum} (${batch.length} members)`);
        addedCount += batch.length;
        console.log(`   ✅ Batch ${batchNum} complete (${addedCount}/${allAddresses.length})`);
      } catch (error: any) {
        // Ignore "already a member" errors
        if (error.message.includes("Already a member")) {
          console.log(`   ℹ️  Batch ${batchNum}: Some users already members (${batch.length} processed)`);
          addedCount += batch.length;
        } else {
          console.log(`   ⚠️  Batch ${batchNum} failed: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Processed ${addedCount} members\n`);

    // ========== STEP 4: CHECK SC BALANCES AND PREPARE AWARDS ==========
    console.log("💰 STEP 4: Checking SC balances and preparing awards");
    console.log("-".repeat(70));
    
    const usersToAward: UserToAward[] = [];
    
    for (const user of activeUsers) {
      // Determine expected amount based on highest role
      let expectedAmount = AWARD_AMOUNTS.member;
      
      if (user.roles.includes("governor")) {
        expectedAmount = AWARD_AMOUNTS.governor;
      } else if (user.roles.includes("admin")) {
        expectedAmount = AWARD_AMOUNTS.admin;
      } else if (user.roles.includes("business")) {
        expectedAmount = AWARD_AMOUNTS.business;
      }
      
      // Check current balance on-chain
      const currentBalance = await soulaaniCoin.balanceOf(user.walletAddress!);
      const currentBalanceFormatted = ethers.formatEther(currentBalance);
      
      // Only award if they have less than expected
      const expectedWei = ethers.parseEther(expectedAmount);
      if (currentBalance < expectedWei) {
        const amountToAward = expectedWei - currentBalance;
        usersToAward.push({
          id: user.id,
          walletAddress: user.walletAddress!,
          roles: user.roles,
          amount: ethers.formatEther(amountToAward),
          name: user.name || undefined,
          email: user.email,
        });
        console.log(`   ${user.email}: Has ${currentBalanceFormatted} SC, needs ${ethers.formatEther(amountToAward)} more`);
      } else {
        console.log(`   ${user.email}: Already has ${currentBalanceFormatted} SC ✓`);
      }
    }

    console.log("");
    
    if (usersToAward.length === 0) {
      console.log("   ✅ All users already have sufficient SC balances. Nothing to award.\n");
      await prisma.$disconnect();
      return;
    }
    
    // Display summary
    console.log("   📋 Award Summary:");
    const totalSC = usersToAward.reduce((sum, u) => sum + parseFloat(u.amount), 0);
    console.log(`   - Users needing SC: ${usersToAward.length}`);
    console.log(`   - Total SC to award: ${totalSC.toFixed(2)} SC\n`);

    // ========== STEP 5: AWARD SC ==========
    console.log("\n💎 STEP 5: Awarding SC to members");
    console.log("-".repeat(70));
    
    const awardReason = ethers.keccak256(ethers.toUtf8Bytes("DATABASE_MIGRATION"));
    let totalAwarded = 0n;
    let successCount = 0;
    
    for (let i = 0; i < usersToAward.length; i++) {
      const user = usersToAward[i];
      const amountWei = ethers.parseEther(user.amount);
      
      try {
        const tx = await soulaaniCoin["mintReward(address,uint256,bytes32)"](
          user.walletAddress,
          amountWei,
          awardReason
        );
        await waitForTx(tx, `Awarding ${user.amount} SC to ${user.walletAddress.slice(0, 10)}...`);
        
        totalAwarded += amountWei;
        successCount++;
        
        const roleStr = user.roles.join(", ");
        console.log(`   ✅ [${i + 1}/${usersToAward.length}] ${user.email} (${roleStr}): ${user.amount} SC`);
      } catch (error: any) {
        console.log(`   ❌ [${i + 1}/${usersToAward.length}] ${user.email}: Failed - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Awarded SC to ${successCount}/${usersToAward.length} users`);
    console.log(`📊 Total SC awarded: ${ethers.formatEther(totalAwarded)} SC\n`);

    // ========== SUMMARY ==========
    console.log("\n🎉 AWARD PROCESS COMPLETE!");
    console.log("=".repeat(70));
    console.log("📊 SUMMARY:");
    console.log("=".repeat(70));
    console.log("Active users found:  ", activeUsers.length);
    console.log("Members added:       ", addedCount);
    console.log("SC awards successful:", successCount);
    console.log("Total SC awarded:    ", ethers.formatEther(totalAwarded), "SC");
    console.log("=".repeat(70));
    console.log("");
    console.log("🔗 View contract on BaseScan:");
    console.log(`   https://sepolia.basescan.org/address/${SC_CONTRACT_ADDRESS}`);
    console.log("");

    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      contractAddress: SC_CONTRACT_ADDRESS,
      activeUsersFound: activeUsers.length,
      membersAdded: addedCount,
      awardsSuccessful: successCount,
      totalAwarded: ethers.formatEther(totalAwarded),
      users: usersToAward.map((u, i) => ({
        email: u.email,
        walletAddress: u.walletAddress,
        roles: u.roles,
        requestedAmount: u.amount,
        success: i < successCount
      }))
    };

    const dataDir = path.join(__dirname, "../data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const summaryFile = path.join(dataDir, `award-summary-${Date.now()}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`💾 Summary saved to: ${summaryFile}\n`);

    await prisma.$disconnect();
    
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Award process failed:", error);
    process.exit(1);
  });
