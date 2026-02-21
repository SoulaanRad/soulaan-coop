import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Set daily minting limit for the backend wallet on UnityCoin
 * This allows the backend to mint UC tokens for fiat onramp purchases
 */
async function main() {
  console.log("\n🔧 Setting Daily Mint Limit for Backend Wallet");
  console.log("=".repeat(60));

  // Get environment variables
  const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS;
  const BACKEND_WALLET = process.env.GOVERNANCE_BOT_ADDRESS || process.env.BACKEND_WALLET_ADDRESS;

  if (!UNITY_COIN_ADDRESS) {
    throw new Error("UNITY_COIN_ADDRESS not set in .env");
  }

  if (!BACKEND_WALLET) {
    throw new Error("GOVERNANCE_BOT_ADDRESS or BACKEND_WALLET_ADDRESS not set in .env");
  }

  // Get the deployer (must be admin)
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Admin wallet: ${deployer.address}`);
  console.log(`🤖 Backend wallet: ${BACKEND_WALLET}`);

  // Connect to UnityCoin contract
  const UnityCoin = await ethers.getContractAt("UnityCoin", UNITY_COIN_ADDRESS);
  console.log(`\n💰 UnityCoin address: ${UNITY_COIN_ADDRESS}`);

  // Check if backend has BACKEND role
  const BACKEND_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));
  const hasBackendRole = await UnityCoin.hasRole(BACKEND_ROLE, BACKEND_WALLET);
  
  if (!hasBackendRole) {
    console.log("\n❌ Backend wallet does not have BACKEND role!");
    console.log("   Run the deployment script or grant-roles script first.");
    process.exit(1);
  }

  console.log("✅ Backend wallet has BACKEND role");

  // Check current daily limit
  const currentLimit = await UnityCoin.dailyMintLimit(BACKEND_WALLET);
  console.log(`\n📊 Current daily limit: ${ethers.formatEther(currentLimit)} UC`);

  // Set daily limit (default: 10,000 UC per day)
  // This is a reasonable limit for a testnet/development environment
  // Adjust based on your needs:
  // - Small coop: 10,000 UC/day (default)
  // - Medium coop: 100,000 UC/day  
  // - Large coop: 1,000,000 UC/day
  const dailyLimit = ethers.parseEther("10000"); // 10,000 UC
  
  console.log(`\n🔄 Setting daily limit to: ${ethers.formatEther(dailyLimit)} UC`);
  
  const tx = await UnityCoin.setDailyMintLimit(BACKEND_WALLET, dailyLimit);
  console.log(`   Transaction hash: ${tx.hash}`);
  
  await tx.wait();
  console.log("✅ Daily limit set successfully!");

  // Verify the new limit
  const newLimit = await UnityCoin.dailyMintLimit(BACKEND_WALLET);
  console.log(`\n✅ New daily limit: ${ethers.formatEther(newLimit)} UC`);

  // Check remaining capacity
  const remaining = await UnityCoin.getRemainingDailyMint(BACKEND_WALLET);
  console.log(`📈 Remaining capacity today: ${ethers.formatEther(remaining)} UC`);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Daily mint limit configuration complete!");
  console.log("\n💡 The backend can now mint up to", ethers.formatEther(dailyLimit), "UC per day");
  console.log("   This limit resets every 24 hours (based on block timestamp)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
