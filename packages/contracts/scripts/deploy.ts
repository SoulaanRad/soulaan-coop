import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Deploy all Soulaan Co-op contracts to Base Sepolia
 *
 * This script deploys:
 * 1. UnityCoin (UC) - ERC-20 stablecoin
 * 2. SoulaaniCoin (SC) - Non-transferable governance token
 * 3. RedemptionVault - Vault for UC redemptions
 *
 * It then grants roles to appropriate addresses and saves deployment info.
 */
async function main() {
  console.log("\n🚀 Starting Soulaan Co-op Contract Deployment...\n");

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

  // Get role addresses from environment
  const treasurySafe = process.env.TREASURY_SAFE_ADDRESS || deployer.address;
  const governanceBot = process.env.GOVERNANCE_BOT_ADDRESS || deployer.address;

  console.log("🏛️  Treasury Safe address:", treasurySafe);
  console.log("🤖 Governance Bot address:", governanceBot);
  console.log("");

  if (treasurySafe === deployer.address || governanceBot === deployer.address) {
    console.log("⚠️  WARNING: Using deployer address for roles. You should update these later!\n");
  }

  // ========== DEPLOY UNITYCOIN (UC) ==========
  console.log("1️⃣  Deploying UnityCoin (UC)...");
  const UnityCoin = await ethers.getContractFactory("UnityCoin");
  const unityCoin = await UnityCoin.deploy(treasurySafe);
  await unityCoin.waitForDeployment();
  const ucAddress = await unityCoin.getAddress();
  console.log("✅ UnityCoin deployed to:", ucAddress);

  // ========== DEPLOY SOULAANICOIN (SC) ==========
  console.log("\n2️⃣  Deploying SoulaaniCoin (SC)...");
  const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
  const soulaaniCoin = await SoulaaniCoin.deploy(governanceBot);
  await soulaaniCoin.waitForDeployment();
  const scAddress = await soulaaniCoin.getAddress();
  console.log("✅ SoulaaniCoin deployed to:", scAddress);

  // ========== DEPLOY REDEMPTIONVAULT ==========
  console.log("\n3️⃣  Deploying RedemptionVault...");
  const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
  const redemptionVault = await RedemptionVault.deploy(ucAddress, treasurySafe);
  await redemptionVault.waitForDeployment();
  const vaultAddress = await redemptionVault.getAddress();
  console.log("✅ RedemptionVault deployed to:", vaultAddress);

  // ========== SETUP COMPLETE ==========
  console.log("\n\n🎉 DEPLOYMENT COMPLETE!\n");
  console.log("=".repeat(60));
  console.log("📋 DEPLOYED CONTRACT ADDRESSES:");
  console.log("=".repeat(60));
  console.log("UnityCoin (UC):      ", ucAddress);
  console.log("SoulaaniCoin (SC):   ", scAddress);
  console.log("RedemptionVault:     ", vaultAddress);
  console.log("=".repeat(60));
  console.log("");
  console.log("🔑 ROLE ASSIGNMENTS:");
  console.log("=".repeat(60));
  console.log("UC Admin/Treasurer/Pauser:", treasurySafe);
  console.log("SC Admin/Governance:      ", governanceBot);
  console.log("Vault Admin/Treasurer:    ", treasurySafe);
  console.log("=".repeat(60));
  console.log("");
  console.log("📝 NEXT STEPS:");
  console.log("1. Verify contracts on BaseScan:");
  console.log("   pnpm verify:sepolia");
  console.log("");
  console.log("2. If you used your own address for roles, transfer them:");
  console.log("   - UC: grantRole() to Treasury Safe, then renounceRole()");
  console.log("   - SC: grantRole() to Governance Bot, then renounceRole()");
  console.log("");
  console.log("3. View on BaseScan:");
  console.log(`   https://sepolia.basescan.org/address/${ucAddress}`);
  console.log(`   https://sepolia.basescan.org/address/${scAddress}`);
  console.log(`   https://sepolia.basescan.org/address/${vaultAddress}`);
  console.log("");

  // Save deployment info to JSON file
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      UnityCoin: {
        address: ucAddress,
        admin: treasurySafe,
      },
      SoulaaniCoin: {
        address: scAddress,
        admin: governanceBot,
      },
      RedemptionVault: {
        address: vaultAddress,
        admin: treasurySafe,
      },
    },
    roles: {
      treasurySafe,
      governanceBot,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `baseSepolia-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
