import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Helper function to wait between transactions
 */
async function waitForTx(tx: any, description: string) {
  console.log(`   ⏳ Waiting for: ${description}...`);
  const receipt = await tx.wait();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between txs
  return receipt;
}

/**
 * Deploy trustless SC reward system to Base Sepolia
 *
 * This script deploys the new trustless architecture:
 * 1. VerifiedStoreRegistry - On-chain store verification registry
 * 2. SCRewardEngine - Deterministic reward calculation and minting
 * 3. StorePaymentRouter - Canonical store purchase entry point
 *
 * Prerequisites:
 * - UnityCoin (UC) must already be deployed
 * - SoulaaniCoin (SC) must already be deployed
 * - Deployer must have admin roles on both contracts
 *
 * This script will:
 * - Deploy new trustless contracts
 * - Grant GOVERNANCE_AWARD role to SCRewardEngine
 * - Grant REWARD_EXECUTOR role to StorePaymentRouter
 * - Configure initial reward policies
 * - Save deployment info for backend integration
 */
async function main() {
  console.log("\n🚀 Starting Trustless SC Reward System Deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    throw new Error(
      "❌ Deployer account has no ETH! Get test ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
    );
  }

  // Get existing contract addresses from environment
  const unityCoinAddress = process.env.UNITY_COIN_ADDRESS;
  const soulaaniCoinAddress = process.env.SOULAANI_COIN_ADDRESS;
  const treasurySafe = process.env.TREASURY_SAFE_ADDRESS || deployer.address;
  const governanceBot = process.env.GOVERNANCE_BOT_ADDRESS || deployer.address;

  if (!unityCoinAddress || !soulaaniCoinAddress) {
    throw new Error(
      "❌ Missing required environment variables: UNITY_COIN_ADDRESS and SOULAANI_COIN_ADDRESS\n" +
      "   Please set these in your .env file with the addresses of your deployed contracts."
    );
  }

  console.log("🏛️  Existing UnityCoin (UC):", unityCoinAddress);
  console.log("🏛️  Existing SoulaaniCoin (SC):", soulaaniCoinAddress);
  console.log("🏛️  Treasury Safe address:", treasurySafe);
  console.log("🤖 Governance Bot address:", governanceBot);
  console.log("");

  if (treasurySafe === deployer.address || governanceBot === deployer.address) {
    console.log("⚠️  WARNING: Using deployer address for roles. You should update these later!\n");
  }

  // ========== DEPLOY VERIFIEDSTOREREGISTRY ==========
  console.log("1️⃣  Deploying VerifiedStoreRegistry...");
  const VerifiedStoreRegistry = await ethers.getContractFactory("VerifiedStoreRegistry");
  const storeRegistry = await VerifiedStoreRegistry.deploy(treasurySafe);
  await storeRegistry.waitForDeployment();
  const registryAddress = await storeRegistry.getAddress();
  console.log("✅ VerifiedStoreRegistry deployed to:", registryAddress);

  // ========== DEPLOY SCREWARDENGINE ==========
  console.log("\n2️⃣  Deploying SCRewardEngine...");
  const SCRewardEngine = await ethers.getContractFactory("SCRewardEngine");
  const rewardEngine = await SCRewardEngine.deploy(
    treasurySafe,           // admin
    soulaaniCoinAddress,    // SoulaaniCoin address
    registryAddress         // VerifiedStoreRegistry address
  );
  await rewardEngine.waitForDeployment();
  const engineAddress = await rewardEngine.getAddress();
  console.log("✅ SCRewardEngine deployed to:", engineAddress);

  // ========== DEPLOY STOREPAYMENTROUTER ==========
  console.log("\n3️⃣  Deploying StorePaymentRouter...");
  const StorePaymentRouter = await ethers.getContractFactory("StorePaymentRouter");
  const paymentRouter = await StorePaymentRouter.deploy(
    treasurySafe,           // admin
    unityCoinAddress,       // UnityCoin address
    registryAddress,        // VerifiedStoreRegistry address
    engineAddress           // SCRewardEngine address
  );
  await paymentRouter.waitForDeployment();
  const routerAddress = await paymentRouter.getAddress();
  console.log("✅ StorePaymentRouter deployed to:", routerAddress);

  // ========== GRANT ROLES ==========
  console.log("\n4️⃣  Granting roles...");

  // Grant GOVERNANCE_AWARD role to SCRewardEngine on SoulaaniCoin
  console.log("   Granting GOVERNANCE_AWARD to SCRewardEngine on SoulaaniCoin...");
  const soulaaniCoin = await ethers.getContractAt("SoulaaniCoin", soulaaniCoinAddress);
  const GOVERNANCE_AWARD = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_AWARD"));
  
  try {
    const grantAwardTx = await soulaaniCoin.grantRole(GOVERNANCE_AWARD, engineAddress);
    await waitForTx(grantAwardTx, "grantRole(GOVERNANCE_AWARD)");
    console.log("   ✅ SCRewardEngine can now mint SC rewards");
  } catch (error: any) {
    console.log("   ⚠️  Failed to grant GOVERNANCE_AWARD role:", error.message);
    console.log("   ⚠️  You may need to grant this role manually if deployer doesn't have admin rights");
  }

  // Grant REWARD_EXECUTOR role to StorePaymentRouter on SCRewardEngine
  console.log("   Granting REWARD_EXECUTOR to StorePaymentRouter on SCRewardEngine...");
  const REWARD_EXECUTOR = ethers.keccak256(ethers.toUtf8Bytes("REWARD_EXECUTOR"));
  const grantExecutorTx = await rewardEngine.grantRole(REWARD_EXECUTOR, routerAddress);
  await waitForTx(grantExecutorTx, "grantRole(REWARD_EXECUTOR)");
  console.log("   ✅ StorePaymentRouter can now execute rewards");

  // Grant REGISTRY_MANAGER role to governance bot (if different from deployer)
  if (governanceBot !== deployer.address) {
    console.log("   Granting REGISTRY_MANAGER to governance bot...");
    const REGISTRY_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_MANAGER"));
    const grantRegistryTx = await storeRegistry.grantRole(REGISTRY_MANAGER, governanceBot);
    await waitForTx(grantRegistryTx, "grantRole(REGISTRY_MANAGER)");
    console.log("   ✅ Governance bot can now manage store registry");
  }

  // Grant POLICY_MANAGER role to governance bot (if different from deployer)
  if (governanceBot !== deployer.address) {
    console.log("   Granting POLICY_MANAGER to governance bot...");
    const POLICY_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("POLICY_MANAGER"));
    const grantPolicyTx = await rewardEngine.grantRole(POLICY_MANAGER, governanceBot);
    await waitForTx(grantPolicyTx, "grantRole(POLICY_MANAGER)");
    console.log("   ✅ Governance bot can now manage reward policies");
  }

  // ========== VERIFY DEFAULT POLICY ==========
  console.log("\n5️⃣  Verifying default reward policy...");
  const globalPolicy = await rewardEngine.globalPolicy();
  console.log("   Default Policy:");
  console.log("   - Percentage:", globalPolicy.percentageBps.toString(), "bps (", (Number(globalPolicy.percentageBps) / 100).toFixed(2), "%)");
  console.log("   - Fixed Amount:", ethers.formatEther(globalPolicy.fixedAmount), "SC");
  console.log("   - Min Purchase:", ethers.formatEther(globalPolicy.minPurchase), "UC");
  console.log("   - Max Reward/Tx:", globalPolicy.maxRewardPerTx === 0n ? "Unlimited" : ethers.formatEther(globalPolicy.maxRewardPerTx) + " SC");
  console.log("   - Active:", globalPolicy.isActive);

  // ========== SETUP COMPLETE ==========
  console.log("\n\n🎉 TRUSTLESS SYSTEM DEPLOYMENT COMPLETE!\n");
  console.log("=".repeat(60));
  console.log("📋 NEW CONTRACT ADDRESSES:");
  console.log("=".repeat(60));
  console.log("VerifiedStoreRegistry: ", registryAddress);
  console.log("SCRewardEngine:        ", engineAddress);
  console.log("StorePaymentRouter:    ", routerAddress);
  console.log("=".repeat(60));
  console.log("");
  console.log("🔗 EXISTING CONTRACTS:");
  console.log("=".repeat(60));
  console.log("UnityCoin (UC):        ", unityCoinAddress);
  console.log("SoulaaniCoin (SC):     ", soulaaniCoinAddress);
  console.log("=".repeat(60));
  console.log("");
  console.log("🔑 ROLE ASSIGNMENTS:");
  console.log("=".repeat(60));
  console.log("Registry Admin/Manager:        ", treasurySafe);
  console.log("Engine Admin/Policy Manager:   ", treasurySafe);
  console.log("Router Admin/Pauser:           ", treasurySafe);
  console.log("SC GOVERNANCE_AWARD (engine):  ", engineAddress);
  console.log("Engine REWARD_EXECUTOR (router):", routerAddress);
  console.log("=".repeat(60));
  console.log("");
  console.log("📝 NEXT STEPS:");
  console.log("1. Verify contracts on BaseScan:");
  console.log("   npx hardhat verify --network baseSepolia", registryAddress, treasurySafe);
  console.log("   npx hardhat verify --network baseSepolia", engineAddress, treasurySafe, soulaaniCoinAddress, registryAddress);
  console.log("   npx hardhat verify --network baseSepolia", routerAddress, treasurySafe, unityCoinAddress, registryAddress, engineAddress);
  console.log("");
  console.log("2. Register verified stores:");
  console.log("   - Use storeRegistry.verifyStore() or verifyStoresBatch()");
  console.log("   - Category keys: keccak256('FOOD_BEVERAGE'), keccak256('FOUNDER_BADGES'), etc.");
  console.log("");
  console.log("3. Update backend to use StorePaymentRouter:");
  console.log("   - Store checkouts: router.payVerifiedStore()");
  console.log("   - Personal transfers: UC.transfer() (unchanged)");
  console.log("");
  console.log("4. Set up event indexing:");
  console.log("   - Index VerifiedStorePurchase events");
  console.log("   - Index RewardExecuted/RewardSkipped events");
  console.log("   - Sync to database for operational dashboard");
  console.log("");
  console.log("5. Configure custom reward policies (optional):");
  console.log("   - Use rewardEngine.setCategoryPolicy() for category overrides");
  console.log("   - Use rewardEngine.setStorePolicy() for specific store overrides");
  console.log("");
  console.log("6. View on BaseScan:");
  console.log(`   https://sepolia.basescan.org/address/${registryAddress}`);
  console.log(`   https://sepolia.basescan.org/address/${engineAddress}`);
  console.log(`   https://sepolia.basescan.org/address/${routerAddress}`);
  console.log("");

  // Save deployment info to JSON file
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    trustlessContracts: {
      VerifiedStoreRegistry: {
        address: registryAddress,
        admin: treasurySafe,
      },
      SCRewardEngine: {
        address: engineAddress,
        admin: treasurySafe,
        soulaaniCoin: soulaaniCoinAddress,
        storeRegistry: registryAddress,
      },
      StorePaymentRouter: {
        address: routerAddress,
        admin: treasurySafe,
        unityCoin: unityCoinAddress,
        storeRegistry: registryAddress,
        rewardEngine: engineAddress,
      },
    },
    existingContracts: {
      UnityCoin: unityCoinAddress,
      SoulaaniCoin: soulaaniCoinAddress,
    },
    roles: {
      treasurySafe,
      governanceBot,
    },
    defaultPolicy: {
      percentageBps: globalPolicy.percentageBps.toString(),
      fixedAmount: ethers.formatEther(globalPolicy.fixedAmount),
      minPurchase: ethers.formatEther(globalPolicy.minPurchase),
      maxRewardPerTx: globalPolicy.maxRewardPerTx === 0n ? "unlimited" : ethers.formatEther(globalPolicy.maxRewardPerTx),
      isActive: globalPolicy.isActive,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `trustless-baseSepolia-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
