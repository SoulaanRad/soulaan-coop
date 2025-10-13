import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Verify contracts on BaseScan after deployment
 * 
 * This script reads the latest deployment file and verifies all contracts.
 * You need a BaseScan API key in your .env file.
 */
async function main() {
  console.log("\n🔍 Starting contract verification...\n");

  // Find the latest deployment file
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error("No deployments directory found. Deploy contracts first!");
  }

  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith("baseSepolia-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error("No deployment files found. Deploy contracts first!");
  }

  const latestFile = files[0];
  console.log(`📂 Using deployment file: ${latestFile}\n`);

  const deploymentPath = path.join(deploymentsDir, latestFile);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const { UnityCoin, SoulaaniCoin, RedemptionVault } = deployment.contracts;
  const { treasurySafe, governanceBot } = deployment.roles;

  console.log("📋 Contract addresses:");
  console.log("  UnityCoin:", UnityCoin.address);
  console.log("  SoulaaniCoin:", SoulaaniCoin.address);
  console.log("  RedemptionVault:", RedemptionVault.address);
  console.log("");

  // Verify UnityCoin
  try {
    console.log("1️⃣  Verifying UnityCoin...");
    await run("verify:verify", {
      address: UnityCoin.address,
      constructorArguments: [treasurySafe],
    });
    console.log("✅ UnityCoin verified!\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ UnityCoin already verified!\n");
    } else {
      console.error("❌ UnityCoin verification failed:", error.message, "\n");
    }
  }

  // Verify SoulaaniCoin
  try {
    console.log("2️⃣  Verifying SoulaaniCoin...");
    await run("verify:verify", {
      address: SoulaaniCoin.address,
      constructorArguments: [governanceBot],
    });
    console.log("✅ SoulaaniCoin verified!\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ SoulaaniCoin already verified!\n");
    } else {
      console.error("❌ SoulaaniCoin verification failed:", error.message, "\n");
    }
  }

  // Verify RedemptionVault
  try {
    console.log("3️⃣  Verifying RedemptionVault...");
    await run("verify:verify", {
      address: RedemptionVault.address,
      constructorArguments: [UnityCoin.address, treasurySafe],
    });
    console.log("✅ RedemptionVault verified!\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ RedemptionVault already verified!\n");
    } else {
      console.error("❌ RedemptionVault verification failed:", error.message, "\n");
    }
  }

  console.log("🎉 Verification process complete!\n");
  console.log("View your contracts on BaseScan:");
  console.log(`  https://sepolia.basescan.org/address/${UnityCoin.address}`);
  console.log(`  https://sepolia.basescan.org/address/${SoulaaniCoin.address}`);
  console.log(`  https://sepolia.basescan.org/address/${RedemptionVault.address}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });

