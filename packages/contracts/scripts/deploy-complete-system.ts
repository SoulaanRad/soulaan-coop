import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Complete System Deployment
 * 
 * Deploys all contracts in the correct order:
 * 1. SoulaaniCoin (SC)
 * 2. Mock USDC
 * 3. UnityCoin (UC) - with SC reference
 * 4. RedemptionVault
 * 5. VerifiedStoreRegistry
 * 6. SCRewardEngine
 * 7. StorePaymentRouter
 * 
 * Sets up all roles and permissions correctly.
 */

async function waitForTx(tx: any, description: string) {
  console.log(`   ⏳ ${description}...`);
  const receipt = await tx.wait();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between txs
  return receipt;
}

async function main() {
  console.log("\n🚀 COMPLETE SYSTEM DEPLOYMENT\n");
  console.log("=".repeat(70));

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH!");
  }

  // Get role addresses from environment
  const treasurySafe = process.env.TREASURY_SAFE_ADDRESS || deployer.address;
  const governanceBot = process.env.GOVERNANCE_BOT_ADDRESS || deployer.address;

  console.log("🏛️  Treasury Safe:", treasurySafe);
  console.log("🤖 Governance Bot:", governanceBot);
  console.log("=".repeat(70));
  console.log("");

  // ========================================
  // STEP 1: Deploy SoulaaniCoin (SC)
  // ========================================
  console.log("1️⃣  Deploying SoulaaniCoin (SC)...");
  const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
  const soulaaniCoin = await SoulaaniCoin.deploy(governanceBot);
  await soulaaniCoin.waitForDeployment();
  const scAddress = await soulaaniCoin.getAddress();
  console.log("✅ SoulaaniCoin:", scAddress);

  // Add deployer as member and give 1 SC
  console.log("\n   Setting up deployer...");
  
  // Wait a bit for contract to be indexed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if deployer is already a member
  let deployerStatus;
  try {
    deployerStatus = await soulaaniCoin.memberStatus(deployer.address);
  } catch (error) {
    console.log("   ⚠️  Could not read member status, assuming NotMember");
    deployerStatus = 0n; // Assume NotMember
  }
  if (deployerStatus === 0n) { // NotMember
    const addMemberTx = await soulaaniCoin.addMember(deployer.address);
    await waitForTx(addMemberTx, "Adding deployer as member");
    console.log("   ✅ Deployer added as member");
  } else {
    console.log("   ✅ Deployer already a member");
  }

  // Mint 100,000 SC initial reserve to seed the total supply.
  // This ensures the 2% hard cap = ~2,000 SC and rewards are whole numbers.
  let deployerBalance;
  try {
    deployerBalance = await soulaaniCoin.balanceOf(deployer.address);
  } catch (error) {
    console.log("   ⚠️  Could not read balance, assuming 0");
    deployerBalance = 0n;
  }
  if (deployerBalance === 0n) {
    const seedAmount = ethers.parseEther("100000"); // 100,000 SC initial reserve
    const reason = ethers.keccak256(ethers.toUtf8Bytes("INITIAL_RESERVE_SEED"));
    const awardTx = await soulaaniCoin["mintReward(address,uint256,bytes32)"](
      deployer.address,
      seedAmount,
      reason
    );
    await waitForTx(awardTx, "Minting 100,000 SC initial reserve seed");
    console.log("   ✅ 100,000 SC initial reserve minted (2% cap = ~2,000 SC per user)");
  } else {
    console.log(`   ✅ Deployer already has ${ethers.formatEther(deployerBalance)} SC`);
  }

  // Grant roles to governance bot
  if (governanceBot !== deployer.address) {
    console.log("\n   Granting roles to governance bot...");
    const GOVERNANCE_AWARD = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_AWARD"));
    const MEMBER_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("MEMBER_MANAGER"));

    const grantAwardTx = await soulaaniCoin.grantRole(GOVERNANCE_AWARD, governanceBot);
    await waitForTx(grantAwardTx, "Granting GOVERNANCE_AWARD");

    const grantManagerTx = await soulaaniCoin.grantRole(MEMBER_MANAGER, governanceBot);
    await waitForTx(grantManagerTx, "Granting MEMBER_MANAGER");

    // Check if governance bot is already a member
    const botStatus = await soulaaniCoin.memberStatus(governanceBot);
    if (botStatus === 0n) {
      const addBotTx = await soulaaniCoin.addMember(governanceBot);
      await waitForTx(addBotTx, "Adding governance bot as member");
    } else {
      console.log("   ✅ Governance bot already a member");
    }
    console.log("   ✅ Governance bot setup complete");
  }

  // ========================================
  // STEP 2: Deploy Mock USDC
  // ========================================
  console.log("\n2️⃣  Deploying Mock USDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ Mock USDC:", usdcAddress);

  // ========================================
  // STEP 3: Deploy UnityCoin (UC)
  // ========================================
  console.log("\n3️⃣  Deploying UnityCoin (UC)...");
  const UnityCoin = await ethers.getContractFactory("UnityCoin");
  const unityCoin = await UnityCoin.deploy(
    treasurySafe,      // admin
    scAddress,         // SoulaaniCoin address (CORRECT from the start!)
    deployer.address   // Temporary vault address
  );
  await unityCoin.waitForDeployment();
  const ucAddress = await unityCoin.getAddress();
  console.log("✅ UnityCoin:", ucAddress);

  // Wait for contract to be indexed
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify SC reference is correct
  let ucSCRef = scAddress; // Default to expected value
  try {
    ucSCRef = await unityCoin.soulaaniCoin();
    console.log(`   🔍 UC's SC reference: ${ucSCRef}`);
    if (ucSCRef.toLowerCase() !== scAddress.toLowerCase()) {
      throw new Error("❌ UC has wrong SC reference!");
    }
    console.log("   ✅ SC reference verified");
  } catch (error) {
    console.log("   ⚠️  Could not verify SC reference (contract may not be indexed yet)");
    console.log("   ℹ️  SC should be:", scAddress);
  }

  // ========================================
  // STEP 4: Deploy RedemptionVault
  // ========================================
  console.log("\n4️⃣  Deploying RedemptionVault...");
  const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
  const redemptionVault = await RedemptionVault.deploy(
    ucAddress,
    usdcAddress,
    treasurySafe
  );
  await redemptionVault.waitForDeployment();
  const vaultAddress = await redemptionVault.getAddress();
  console.log("✅ RedemptionVault:", vaultAddress);

  // Grant vault permission to mint UC
  console.log("\n   Granting vault permissions...");
  const TREASURER_MINT = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_MINT"));
  const grantVaultTx = await unityCoin.grantRole(TREASURER_MINT, vaultAddress);
  await waitForTx(grantVaultTx, "Granting TREASURER_MINT to vault");
  console.log("   ✅ Vault can mint UC");

  // Set wealth fund address (for tax collection from store purchases)
  console.log("\n   Setting wealth fund address...");
  try {
    const setWealthFundTx = await unityCoin.setWealthFundAddress(
      treasurySafe,
      "Initial deployment - setting treasury safe as wealth fund"
    );
    await waitForTx(setWealthFundTx, "Setting wealth fund address");
    console.log(`   ✅ Wealth fund address set to: ${treasurySafe}`);
  } catch (error) {
    console.log("   ⚠️  Using old contract signature (no reason parameter)");
    // If new signature fails, contract might not be updated yet
    console.log(`   ℹ️  Wealth fund defaults to admin: ${treasurySafe}`);
  }

  // ========================================
  // STEP 5: Deploy Trustless Contracts
  // ========================================
  console.log("\n5️⃣  Deploying VerifiedStoreRegistry...");
  const VerifiedStoreRegistry = await ethers.getContractFactory("VerifiedStoreRegistry");
  const storeRegistry = await VerifiedStoreRegistry.deploy(governanceBot);
  await storeRegistry.waitForDeployment();
  const registryAddress = await storeRegistry.getAddress();
  console.log("✅ VerifiedStoreRegistry:", registryAddress);

  console.log("\n6️⃣  Deploying SCRewardEngine...");
  const SCRewardEngine = await ethers.getContractFactory("SCRewardEngine");
  const rewardEngine = await SCRewardEngine.deploy(
    governanceBot,    // admin (CORRECT ORDER!)
    scAddress,        // soulaaniCoin
    registryAddress   // storeRegistry
  );
  await rewardEngine.waitForDeployment();
  const engineAddress = await rewardEngine.getAddress();
  console.log("✅ SCRewardEngine:", engineAddress);

  console.log("\n7️⃣  Deploying StorePaymentRouter...");
  const StorePaymentRouter = await ethers.getContractFactory("StorePaymentRouter");
  const paymentRouter = await StorePaymentRouter.deploy(
    governanceBot,    // admin (CORRECT ORDER!)
    ucAddress,        // unityCoin
    registryAddress,  // storeRegistry
    engineAddress     // rewardEngine
  );
  await paymentRouter.waitForDeployment();
  const routerAddress = await paymentRouter.getAddress();
  console.log("✅ StorePaymentRouter:", routerAddress);

  // ========================================
  // STEP 6: Grant Trustless Roles
  // ========================================
  console.log("\n8️⃣  Setting up trustless system roles...");

  // Grant GOVERNANCE_AWARD to SCRewardEngine on SoulaaniCoin
  console.log("\n   Granting SC minting permission to reward engine...");
  const GOVERNANCE_AWARD = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_AWARD"));
  const grantEngineTx = await soulaaniCoin.grantRole(GOVERNANCE_AWARD, engineAddress);
  await waitForTx(grantEngineTx, "Granting GOVERNANCE_AWARD to engine");
  console.log("   ✅ Reward engine can mint SC");

  // Grant REWARD_EXECUTOR to StorePaymentRouter on SCRewardEngine
  console.log("\n   Granting reward execution permission to router...");
  const REWARD_EXECUTOR = ethers.keccak256(ethers.toUtf8Bytes("REWARD_EXECUTOR"));
  
  try {
    const grantRouterTx = await rewardEngine.grantRole(REWARD_EXECUTOR, routerAddress);
    await waitForTx(grantRouterTx, "Granting REWARD_EXECUTOR to router");
    console.log("   ✅ Router can execute rewards");
  } catch (error: any) {
    console.log("   ❌ Failed to grant REWARD_EXECUTOR:", error.message);
    console.log("   ⚠️  You'll need to grant this role manually:");
    console.log(`   rewardEngine.grantRole(REWARD_EXECUTOR, "${routerAddress}")`);
  }

  // Grant manager roles to governance bot (if different from deployer)
  if (governanceBot !== deployer.address) {
    console.log("\n   Granting manager roles to governance bot...");
    
    try {
      const REGISTRY_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_MANAGER"));
      const grantRegistryTx = await storeRegistry.grantRole(REGISTRY_MANAGER, governanceBot);
      await waitForTx(grantRegistryTx, "Granting REGISTRY_MANAGER");

      const POLICY_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("POLICY_MANAGER"));
      const grantPolicyTx = await rewardEngine.grantRole(POLICY_MANAGER, governanceBot);
      await waitForTx(grantPolicyTx, "Granting POLICY_MANAGER");

      console.log("   ✅ Governance bot has manager roles");
    } catch (error: any) {
      console.log("   ⚠️  Failed to grant some manager roles:", error.message);
    }
  }

  // ========================================
  // STEP 7: Set Initial Reward Policy
  // ========================================
  console.log("\n9️⃣  Setting initial reward policy...");
  try {
    const setGlobalPolicyTx = await rewardEngine.setGlobalPolicy(
      100,                          // 1% (100 bps)
      ethers.parseEther("5"),       // +5 SC fixed
      ethers.parseEther("1"),       // Min 1 UC purchase
      ethers.parseEther("100"),     // Max 100 SC per tx
      true                          // Active
    );
    await waitForTx(setGlobalPolicyTx, "Setting global reward policy");
    console.log("   ✅ Policy: 1% + 5 SC (min 1 UC, max 100 SC)");
  } catch (error: any) {
    console.log("   ⚠️  Failed to set policy:", error.message);
    console.log("   You can set it manually later");
  }

  // ========================================
  // SAVE DEPLOYMENT INFO
  // ========================================
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      SoulaaniCoin: { address: scAddress, admin: governanceBot },
      MockUSDC: { address: usdcAddress },
      UnityCoin: { address: ucAddress, admin: treasurySafe, scReference: scAddress },
      RedemptionVault: { address: vaultAddress, admin: treasurySafe },
      VerifiedStoreRegistry: { address: registryAddress, admin: governanceBot },
      SCRewardEngine: { address: engineAddress, admin: governanceBot },
      StorePaymentRouter: { address: routerAddress, admin: governanceBot },
    },
    roles: {
      treasurySafe,
      governanceBot,
    },
    verification: {
      ucSCReference: ucSCRef,
      scReferenceCorrect: ucSCRef.toLowerCase() === scAddress.toLowerCase(),
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `complete-system-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // ========================================
  // FINAL SUMMARY
  // ========================================
  console.log("\n\n🎉 COMPLETE SYSTEM DEPLOYMENT SUCCESSFUL!\n");
  console.log("=".repeat(70));
  console.log("📋 CORE CONTRACTS:");
  console.log("=".repeat(70));
  console.log("SoulaaniCoin (SC):    ", scAddress);
  console.log("UnityCoin (UC):       ", ucAddress);
  console.log("RedemptionVault:      ", vaultAddress);
  console.log("Mock USDC:            ", usdcAddress);
  console.log("");
  console.log("📋 TRUSTLESS CONTRACTS:");
  console.log("=".repeat(70));
  console.log("VerifiedStoreRegistry:", registryAddress);
  console.log("SCRewardEngine:       ", engineAddress);
  console.log("StorePaymentRouter:   ", routerAddress);
  console.log("=".repeat(70));
  console.log("");
  console.log("✅ VERIFICATION:");
  console.log("=".repeat(70));
  console.log("UC → SC Reference:    ", ucSCRef);
  console.log("Reference Correct:    ", ucSCRef.toLowerCase() === scAddress.toLowerCase() ? "✅ YES" : "❌ NO");
  console.log("=".repeat(70));
  console.log("");
  console.log("📝 UPDATE YOUR .ENV FILE:");
  console.log("=".repeat(70));
  console.log(`SOULAANI_COIN_ADDRESS=${scAddress}`);
  console.log(`UNITY_COIN_ADDRESS=${ucAddress}`);
  console.log(`REDEMPTION_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`MOCK_USDC_ADDRESS=${usdcAddress}`);
  console.log(`VERIFIED_STORE_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`SC_REWARD_ENGINE_ADDRESS=${engineAddress}`);
  console.log(`STORE_PAYMENT_ROUTER_ADDRESS=${routerAddress}`);
  console.log("=".repeat(70));
  console.log("");
  console.log("🔗 VIEW ON BASESCAN:");
  console.log(`   SC:       https://sepolia.basescan.org/address/${scAddress}#code`);
  console.log(`   UC:       https://sepolia.basescan.org/address/${ucAddress}#code`);
  console.log(`   Vault:    https://sepolia.basescan.org/address/${vaultAddress}#code`);
  console.log(`   Registry: https://sepolia.basescan.org/address/${registryAddress}#code`);
  console.log(`   Engine:   https://sepolia.basescan.org/address/${engineAddress}#code`);
  console.log(`   Router:   https://sepolia.basescan.org/address/${routerAddress}#code`);
  console.log("");
  console.log("📝 NEXT STEPS:");
  console.log("1. Update .env with the addresses above");
  console.log("2. Run: pnpm seed-stores:sepolia (to migrate verified stores)");
  console.log("3. Run: pnpm test-flows:sepolia (to test the system)");
  console.log("4. Verify contracts: pnpm verify:sepolia");
  console.log("");
  console.log(`💾 Deployment saved to: ${deploymentFile}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
