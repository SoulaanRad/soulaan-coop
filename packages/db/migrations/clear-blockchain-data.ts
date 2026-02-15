import { PrismaClient } from "@prisma/client";

/**
 * Clear Blockchain Data Migration
 * 
 * Run this when deploying fresh SC/UC contracts to clear old blockchain data.
 * 
 * This will:
 * - Clear all SC balances
 * - Clear all UC balances
 * - Clear transaction history
 * - Clear store verification status
 * - Keep user accounts and profiles
 * 
 * Usage:
 *   npx tsx packages/db/migrations/clear-blockchain-data.ts
 */

const prisma = new PrismaClient();

async function main() {
  console.log("\n🗑️  CLEARING BLOCKCHAIN-RELATED DATABASE RECORDS\n");
  console.log("=".repeat(70));
  console.log("⚠️  WARNING: This will delete:");
  console.log("   - P2P transactions");
  console.log("   - Withdrawals");
  console.log("   - Orders");
  console.log("   - Governance proposals");
  console.log("   - Store SC verification status");
  console.log("");
  console.log("   KEPT:");
  console.log("   ✅ User accounts");
  console.log("   ✅ Store profiles");
  console.log("   ✅ Wallet addresses");
  console.log("");
  console.log("   NOTE: SC/UC balances are on-chain, not in database.");
  console.log("   Deploying new contracts will reset all on-chain balances.");
  console.log("=".repeat(70));
  console.log("");

  // Wait 5 seconds to allow cancellation
  console.log("⏳ Starting in 5 seconds... (Press Ctrl+C to cancel)");
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log("");

  try {
    let clearedCount = 0;

    // 1. Clear P2P Transactions
    console.log("1️⃣  Clearing P2P transactions...");
    try {
      const p2pResult = await prisma.p2PTransaction.deleteMany({});
      console.log(`   ✅ Deleted ${p2pResult.count} P2P transactions`);
      clearedCount += p2pResult.count;
    } catch (error) {
      console.log("   ⚠️  No P2P transactions table (skipping)");
    }

    // 2. Clear Withdrawals
    console.log("\n2️⃣  Clearing withdrawals...");
    try {
      const withdrawalResult = await prisma.withdrawal.deleteMany({});
      console.log(`   ✅ Deleted ${withdrawalResult.count} withdrawals`);
      clearedCount += withdrawalResult.count;
    } catch (error) {
      console.log("   ⚠️  No withdrawals table (skipping)");
    }

    // 3. Clear Orders
    console.log("\n3️⃣  Clearing orders...");
    try {
      const orderResult = await prisma.order.deleteMany({});
      console.log(`   ✅ Deleted ${orderResult.count} orders`);
      clearedCount += orderResult.count;
    } catch (error) {
      console.log("   ⚠️  No orders table (skipping)");
    }

    // 4. Clear Store SC Verification
    console.log("\n4️⃣  Clearing store SC verification status...");
    try {
      const storeResult = await prisma.store.updateMany({
        where: {
          isScVerified: true,
        },
        data: {
          isScVerified: false,
          scVerifiedAt: null,
        },
      });
      console.log(`   ✅ Cleared SC verification for ${storeResult.count} stores`);
    } catch (error) {
      console.log("   ⚠️  Error clearing store verification:", error);
    }

    // 5. Clear Governance Proposals (optional)
    console.log("\n5️⃣  Clearing governance proposals...");
    try {
      const proposalResult = await prisma.proposal.deleteMany({});
      console.log(`   ✅ Deleted ${proposalResult.count} proposals`);
      clearedCount += proposalResult.count;
    } catch (error) {
      console.log("   ⚠️  No proposals table (skipping)");
    }

    // 6. Note about balances
    console.log("\n6️⃣  Note about balances...");
    console.log("   ℹ️  SC/UC balances are stored on-chain, not in database");
    console.log("   ℹ️  Deploying new contracts will reset all on-chain balances to 0")

    console.log("\n\n✅ DATABASE CLEARED SUCCESSFULLY!\n");
    console.log("=".repeat(70));
    console.log("📋 SUMMARY:");
    console.log("=".repeat(70));
    console.log(`✅ Total records deleted: ${clearedCount}`);
    console.log("✅ Store SC verification reset");
    console.log("✅ User accounts kept");
    console.log("✅ Store profiles kept");
    console.log("=".repeat(70));
    console.log("");
    console.log("ℹ️  IMPORTANT:");
    console.log("   SC/UC balances are stored on-chain, not in the database.");
    console.log("   When you deploy new contracts, all on-chain balances will be 0.");
    console.log("");
    console.log("📝 NEXT STEPS:");
    console.log("1. Deploy new contracts: cd packages/contracts && pnpm deploy:complete:sepolia");
    console.log("2. Update .env with new contract addresses");
    console.log("3. Re-add SC members: Run your member sync script");
    console.log("4. Seed verified stores: pnpm seed-stores:sepolia");
    console.log("");

  } catch (error) {
    console.error("\n❌ Error clearing data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
