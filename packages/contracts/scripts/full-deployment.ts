import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const execAsync = promisify(exec);

/**
 * Full Deployment Pipeline
 * 
 * This script performs a complete deployment:
 * 1. Compile contracts
 * 2. Deploy all contracts (SC, UC, RedemptionVault, MockUSDC)
 * 3. Verify contracts on BaseScan
 * 4. Sync active users from database to blockchain
 * 
 * Usage:
 *   npx hardhat run scripts/full-deployment.ts --network baseSepolia
 */

const BATCH_SIZE = 50;

// Award amounts by role
const AWARD_AMOUNTS = {
  member: "100",
  business: "200",
  admin: "500",
  governor: "500",
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
  console.log("\n🚀 FULL DEPLOYMENT PIPELINE\n");
  console.log("=".repeat(70));
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");
  
  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH!");
  }

  const treasurySafe = process.env.TREASURY_SAFE_ADDRESS || deployer.address;
  const governanceBot = process.env.GOVERNANCE_BOT_ADDRESS || deployer.address;

  console.log("🏛️  Treasury Safe:", treasurySafe);
  console.log("🤖 Governance Bot:", governanceBot);
  console.log("=".repeat(70));
  console.log("");

  // ========== STEP 1: COMPILE ==========
  console.log("🔨 STEP 1: Compiling contracts");
  console.log("-".repeat(70));
  
  try {
    const { stdout } = await execAsync("npx hardhat compile");
    console.log(stdout);
    console.log("✅ Compilation complete\n");
  } catch (error: any) {
    console.error("❌ Compilation failed:", error.message);
    throw error;
  }

  // ========== STEP 2: DEPLOY CONTRACTS ==========
  console.log("📦 STEP 2: Deploying contracts");
  console.log("-".repeat(70));
  
  // Deploy SoulaaniCoin
  console.log("   Deploying SoulaaniCoin (SC)...");
  const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
  const soulaaniCoin = await SoulaaniCoin.deploy(governanceBot);
  await soulaaniCoin.waitForDeployment();
  const scAddress = await soulaaniCoin.getAddress();
  console.log(`   ✅ SC deployed to: ${scAddress}`);

  // Deploy Mock USDC
  console.log("\n   Deploying Mock USDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log(`   ✅ Mock USDC deployed to: ${usdcAddress}`);

  // Deploy UnityCoin
  console.log("\n   Deploying UnityCoin (UC)...");
  const UnityCoin = await ethers.getContractFactory("UnityCoin");
  const unityCoin = await UnityCoin.deploy(
    treasurySafe,
    scAddress,
    deployer.address
  );
  await unityCoin.waitForDeployment();
  const ucAddress = await unityCoin.getAddress();
  console.log(`   ✅ UC deployed to: ${ucAddress}`);

  // Deploy RedemptionVault
  console.log("\n   Deploying RedemptionVault...");
  const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
  const redemptionVault = await RedemptionVault.deploy(
    ucAddress,
    usdcAddress,
    treasurySafe
  );
  await redemptionVault.waitForDeployment();
  const vaultAddress = await redemptionVault.getAddress();
  console.log(`   ✅ RedemptionVault deployed to: ${vaultAddress}`);

  // Grant vault permission to mint UC
  console.log("\n   Granting RedemptionVault permission to mint UC...");
  const TREASURER_MINT = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_MINT"));
  const grantMintTx = await unityCoin.grantRole(TREASURER_MINT, vaultAddress);
  await waitForTx(grantMintTx, "grantRole");
  console.log("   ✅ RedemptionVault can now mint UC\n");

  // Save deployment info
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      SoulaaniCoin: { address: scAddress, admin: governanceBot },
      MockUSDC: { address: usdcAddress },
      RedemptionVault: { address: vaultAddress, admin: treasurySafe },
      UnityCoin: { address: ucAddress, admin: treasurySafe },
    },
    roles: { treasurySafe, governanceBot },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `baseSepolia-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   💾 Deployment info saved to: ${deploymentFile}\n`);

  // ========== STEP 3: VERIFY CONTRACTS ==========
  console.log("\n🔍 STEP 3: Verifying contracts on BaseScan");
  console.log("-".repeat(70));
  
  // Wait a bit for contracts to propagate
  console.log("   ⏳ Waiting 10 seconds for contracts to propagate...");
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const contractsToVerify = [
    { name: "SoulaaniCoin", address: scAddress, args: [governanceBot] },
    { name: "MockUSDC", address: usdcAddress, args: [] },
    { name: "RedemptionVault", address: vaultAddress, args: [ucAddress, usdcAddress, treasurySafe] },
    { name: "UnityCoin", address: ucAddress, args: [treasurySafe, scAddress, vaultAddress] },
  ];

  for (const contract of contractsToVerify) {
    try {
      console.log(`\n   Verifying ${contract.name}...`);
      await ethers.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.args,
      });
      console.log(`   ✅ ${contract.name} verified!`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ✅ ${contract.name} already verified!`);
      } else {
        console.log(`   ⚠️  ${contract.name} verification failed: ${error.message}`);
      }
    }
  }

  console.log("\n   ✅ Verification complete\n");

  // ========== STEP 4: SYNC DATABASE TO BLOCKCHAIN ==========
  console.log("\n🔄 STEP 4: Syncing database to blockchain");
  console.log("-".repeat(70));
  
  const prisma = new PrismaClient();
  
  try {
    // Fetch all ACTIVE users with wallet addresses
    const activeUsers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        walletAddress: { not: null }
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
      console.log("   ℹ️  No active users found. Skipping sync.");
    } else {
      // Calculate award amounts
      const usersToAward: UserToAward[] = activeUsers.map(user => {
        let amount = AWARD_AMOUNTS.member;
        
        if (user.roles.includes("governor")) {
          amount = AWARD_AMOUNTS.governor;
        } else if (user.roles.includes("admin")) {
          amount = AWARD_AMOUNTS.admin;
        } else if (user.roles.includes("business")) {
          amount = AWARD_AMOUNTS.business;
        }
        
        return {
          id: user.id,
          walletAddress: user.walletAddress!,
          roles: user.roles,
          amount,
          name: user.name || undefined,
          email: user.email,
        };
      });

      // Display summary
      console.log("   📋 Award Summary:");
      const memberCount = usersToAward.filter(u => !u.roles.includes("business") && !u.roles.includes("admin") && !u.roles.includes("governor")).length;
      const businessCount = usersToAward.filter(u => u.roles.includes("business")).length;
      const adminCount = usersToAward.filter(u => u.roles.includes("admin")).length;
      const governorCount = usersToAward.filter(u => u.roles.includes("governor")).length;
      
      console.log(`   - Members: ${memberCount} users × 100 SC = ${memberCount * 100} SC`);
      console.log(`   - Business: ${businessCount} users × 200 SC = ${businessCount * 200} SC`);
      console.log(`   - Admins: ${adminCount} users × 500 SC = ${adminCount * 500} SC`);
      console.log(`   - Governors: ${governorCount} users × 500 SC = ${governorCount * 500} SC`);
      
      const totalSC = usersToAward.reduce((sum, u) => sum + parseFloat(u.amount), 0);
      console.log(`   - TOTAL: ${totalSC} SC\n`);

      // Add members
      console.log("   👥 Adding members to SC contract...");
      const addresses = usersToAward.map(u => u.walletAddress);
      let addedCount = 0;
      
      for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        
        try {
          const tx = await soulaaniCoin.addMembersBatch(batch);
          await waitForTx(tx, `Adding batch ${batchNum} (${batch.length} members)`);
          addedCount += batch.length;
        } catch (error: any) {
          console.log(`   ⚠️  Batch ${batchNum} failed: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Added ${addedCount} members\n`);

      // Award SC
      console.log("   💰 Awarding SC to members...");
      const awardReason = ethers.keccak256(ethers.toUtf8Bytes("INITIAL_DEPLOYMENT"));
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
          await waitForTx(tx, `Awarding ${user.amount} SC to ${user.email}`);
          
          totalAwarded += amountWei;
          successCount++;
        } catch (error: any) {
          console.log(`   ❌ ${user.email}: Failed - ${error.message}`);
        }
      }
      
      console.log(`\n   ✅ Awarded SC to ${successCount}/${usersToAward.length} users`);
      console.log(`   📊 Total SC awarded: ${ethers.formatEther(totalAwarded)} SC\n`);
    }

    await prisma.$disconnect();
    
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  // ========== FINAL SUMMARY ==========
  console.log("\n\n🎉 FULL DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("📋 CONTRACT ADDRESSES:");
  console.log("=".repeat(70));
  console.log("SoulaaniCoin (SC):   ", scAddress);
  console.log("Mock USDC:           ", usdcAddress);
  console.log("RedemptionVault:     ", vaultAddress);
  console.log("UnityCoin (UC):      ", ucAddress);
  console.log("=".repeat(70));
  console.log("");
  console.log("📝 UPDATE YOUR .ENV FILE:");
  console.log("=".repeat(70));
  console.log(`SOULAANI_COIN_ADDRESS=${scAddress}`);
  console.log(`UNITY_COIN_ADDRESS=${ucAddress}`);
  console.log(`REDEMPTION_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`MOCK_USDC_ADDRESS=${usdcAddress}`);
  console.log("=".repeat(70));
  console.log("");
  console.log("🔗 VIEW ON BASESCAN:");
  console.log(`   SoulaaniCoin: https://sepolia.basescan.org/address/${scAddress}#code`);
  console.log(`   UnityCoin: https://sepolia.basescan.org/address/${ucAddress}#code`);
  console.log(`   RedemptionVault: https://sepolia.basescan.org/address/${vaultAddress}#code`);
  console.log(`   MockUSDC: https://sepolia.basescan.org/address/${usdcAddress}#code`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
