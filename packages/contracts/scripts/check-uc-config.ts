import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Check UnityCoin contract configuration
 * Shows which SoulaaniCoin contract it's using and other important settings
 */
async function main() {
  console.log("\n🔍 Checking UnityCoin Configuration");
  console.log("=".repeat(60));

  // Get environment variables
  const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS;
  const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS;
  const BACKEND_WALLET = process.env.GOVERNANCE_BOT_ADDRESS || process.env.BACKEND_WALLET_ADDRESS;

  if (!UNITY_COIN_ADDRESS) {
    throw new Error("UNITY_COIN_ADDRESS not set in .env");
  }

  console.log(`\n📍 Contract Addresses:`);
  console.log(`   UnityCoin: ${UNITY_COIN_ADDRESS}`);
  console.log(`   Expected SC: ${SOULAANI_COIN_ADDRESS || 'NOT SET IN .ENV'}`);
  console.log(`   Backend Wallet: ${BACKEND_WALLET || 'NOT SET IN .ENV'}`);

  // Connect to UnityCoin contract
  const UnityCoin = await ethers.getContractAt("UnityCoin", UNITY_COIN_ADDRESS);

  // Get SoulaaniCoin address from contract
  const actualSCAddress = await UnityCoin.soulaaniCoin();
  console.log(`\n💎 SoulaaniCoin Address (from UC contract):`);
  console.log(`   ${actualSCAddress}`);

  // Check if it matches .env
  if (SOULAANI_COIN_ADDRESS) {
    if (actualSCAddress.toLowerCase() === SOULAANI_COIN_ADDRESS.toLowerCase()) {
      console.log(`   ✅ MATCHES .env file`);
    } else {
      console.log(`   ❌ MISMATCH with .env file!`);
      console.log(`   Expected: ${SOULAANI_COIN_ADDRESS}`);
      console.log(`   Actual:   ${actualSCAddress}`);
      console.log(`\n⚠️  WARNING: Your .env file has the wrong SOULAANI_COIN_ADDRESS!`);
      console.log(`   Update your .env to: SOULAANI_COIN_ADDRESS=${actualSCAddress}`);
    }
  }

  // Check backend wallet configuration
  if (BACKEND_WALLET) {
    console.log(`\n🤖 Backend Wallet Configuration:`);
    
    // Check BACKEND role
    const BACKEND_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));
    const hasBackendRole = await UnityCoin.hasRole(BACKEND_ROLE, BACKEND_WALLET);
    console.log(`   BACKEND role: ${hasBackendRole ? '✅ Granted' : '❌ NOT granted'}`);

    // Check daily limit
    const dailyLimit = await UnityCoin.dailyMintLimit(BACKEND_WALLET);
    console.log(`   Daily mint limit: ${ethers.formatEther(dailyLimit)} UC`);
    
    if (dailyLimit === 0n) {
      console.log(`   ⚠️  WARNING: Daily limit not set! Run 'pnpm set-daily-limit'`);
    }

    // Check remaining capacity
    const remaining = await UnityCoin.getRemainingDailyMint(BACKEND_WALLET);
    console.log(`   Remaining today: ${ethers.formatEther(remaining)} UC`);
  }

  // Check if contract is paused
  const isPaused = await UnityCoin.paused();
  console.log(`\n⏸️  Contract Status: ${isPaused ? '❌ PAUSED' : '✅ Active'}`);

  // Check coop ID
  const coopId = await UnityCoin.coopId();
  console.log(`\n🏢 Coop ID: ${coopId}`);

  // Check fee configuration
  const feePercent = await UnityCoin.transferFeePercent();
  const feeRecipient = await UnityCoin.feeRecipient();
  console.log(`\n💰 Transfer Fee:`);
  console.log(`   Fee: ${feePercent} basis points (${(Number(feePercent) / 100).toFixed(2)}%)`);
  console.log(`   Recipient: ${feeRecipient}`);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Configuration check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
