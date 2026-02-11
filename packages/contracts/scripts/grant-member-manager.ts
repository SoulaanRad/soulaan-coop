import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Grant MEMBER_MANAGER and GOVERNANCE_AWARD roles to the backend wallet
 * Run this once to fix missing role issues
 */
async function main() {
  console.log("\n🔐 Granting Backend Wallet Roles\n");

  // Get signer (deployer with admin role)
  const [signer] = await ethers.getSigners();
  console.log("Granting roles with account:", signer.address);
  console.log("");

  const SC_ADDRESS = process.env.SOULAANI_COIN_ADDRESS || process.env.SC_CONTRACT_ADDRESS;
  const BACKEND_WALLET = process.env.GOVERNANCE_BOT_ADDRESS;

  if (!SC_ADDRESS) {
    console.log("❌ Please set SOULAANI_COIN_ADDRESS in .env");
    process.exit(1);
  }

  if (!BACKEND_WALLET) {
    console.log("❌ Please set GOVERNANCE_BOT_ADDRESS in .env");
    process.exit(1);
  }

  console.log("SoulaaniCoin address:", SC_ADDRESS);
  console.log("Backend wallet:", BACKEND_WALLET);
  console.log("");

  // Get contract instance
  const scContract = await ethers.getContractAt("SoulaaniCoin", SC_ADDRESS);

  // Define roles
  const MEMBER_MANAGER = ethers.id("MEMBER_MANAGER");
  const GOVERNANCE_AWARD = ethers.id("GOVERNANCE_AWARD");
  
  console.log("MEMBER_MANAGER role hash:", MEMBER_MANAGER);
  console.log("GOVERNANCE_AWARD role hash:", GOVERNANCE_AWARD);
  console.log("");

  let rolesGranted = 0;

  // Check and grant MEMBER_MANAGER role
  console.log("1️⃣  Checking MEMBER_MANAGER role...");
  const hasMemberManager = await scContract.hasRole(MEMBER_MANAGER, BACKEND_WALLET);
  
  if (hasMemberManager) {
    console.log("   ✅ Backend wallet already has MEMBER_MANAGER role");
  } else {
    console.log("   📝 Granting MEMBER_MANAGER role...");
    const tx = await scContract.grantRole(MEMBER_MANAGER, BACKEND_WALLET);
    console.log("   ⏳ Transaction submitted:", tx.hash);
    await tx.wait();
    console.log("   ✅ MEMBER_MANAGER role granted!");
    rolesGranted++;
  }
  console.log("");

  // Check and grant GOVERNANCE_AWARD role
  console.log("2️⃣  Checking GOVERNANCE_AWARD role...");
  const hasGovernanceAward = await scContract.hasRole(GOVERNANCE_AWARD, BACKEND_WALLET);
  
  if (hasGovernanceAward) {
    console.log("   ✅ Backend wallet already has GOVERNANCE_AWARD role");
  } else {
    console.log("   📝 Granting GOVERNANCE_AWARD role...");
    const tx = await scContract.grantRole(GOVERNANCE_AWARD, BACKEND_WALLET);
    console.log("   ⏳ Transaction submitted:", tx.hash);
    await tx.wait();
    console.log("   ✅ GOVERNANCE_AWARD role granted!");
    rolesGranted++;
  }
  console.log("");

  console.log("=".repeat(60));
  if (rolesGranted > 0) {
    console.log(`✅ ${rolesGranted} role(s) granted!`);
  } else {
    console.log("✅ All roles already configured!");
  }
  console.log("=".repeat(60));
  console.log("");
  console.log("The backend wallet can now:");
  console.log("  ✅ Mint SC rewards (GOVERNANCE_AWARD)");
  console.log("  ✅ Add members to the contract (MEMBER_MANAGER)");
  console.log("  ✅ Update member status (MEMBER_MANAGER)");
  console.log("  ✅ Sync membership from the portal (MEMBER_MANAGER)");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
