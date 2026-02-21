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
 * Seed Verified Stores Migration Script
 * 
 * This script:
 * 1. Reads existing verified stores from database export
 * 2. Registers them in the on-chain VerifiedStoreRegistry
 * 3. Maps database store IDs to on-chain store keys
 * 4. Saves mapping for backend integration
 * 
 * Input format (stores.json):
 * [
 *   {
 *     "storeId": "db-store-id-123",
 *     "storeName": "Example Store",
 *     "ownerWallet": "0x...",
 *     "category": "FOOD_BEVERAGE",
 *     "isScVerified": true
 *   }
 * ]
 */
async function main() {
  console.log("\n🌱 Starting Verified Store Seeding...\n");

  // Get deployer/admin account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Seeding with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get contract addresses from environment
  const registryAddress = process.env.VERIFIED_STORE_REGISTRY_ADDRESS;

  if (!registryAddress) {
    throw new Error(
      "❌ Missing VERIFIED_STORE_REGISTRY_ADDRESS environment variable"
    );
  }

  console.log("📋 VerifiedStoreRegistry:", registryAddress);
  console.log("");

  // Load stores data
  const storesFile = path.join(__dirname, "../data/stores-to-seed.json");
  
  if (!fs.existsSync(storesFile)) {
    console.log("⚠️  No stores file found at:", storesFile);
    console.log("Creating example file...\n");
    
    const exampleData = [
      {
        storeId: "example-store-1",
        storeName: "Example Food Store",
        ownerWallet: "0x0000000000000000000000000000000000000001",
        category: "FOOD_BEVERAGE",
        isScVerified: true,
      },
      {
        storeId: "example-store-2",
        storeName: "Example Founder Store",
        ownerWallet: "0x0000000000000000000000000000000000000002",
        category: "FOUNDER_PACKAGE",
        isScVerified: true,
      },
    ];
    
    const dataDir = path.join(__dirname, "../data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(storesFile, JSON.stringify(exampleData, null, 2));
    console.log("📄 Example file created. Please update with real data and run again.");
    console.log("   File:", storesFile);
    return;
  }

  const storesData = JSON.parse(fs.readFileSync(storesFile, "utf-8"));
  console.log(`📊 Loaded ${storesData.length} stores to seed\n`);

  // Get registry contract
  const registry = await ethers.getContractAt("VerifiedStoreRegistry", registryAddress);

  // Category key mapping
  const categoryKeyMap: Record<string, string> = {
    "FOOD_BEVERAGE": ethers.keccak256(ethers.toUtf8Bytes("FOOD_BEVERAGE")),
    "RETAIL": ethers.keccak256(ethers.toUtf8Bytes("RETAIL")),
    "SERVICES": ethers.keccak256(ethers.toUtf8Bytes("SERVICES")),
    "HEALTH_WELLNESS": ethers.keccak256(ethers.toUtf8Bytes("HEALTH_WELLNESS")),
    "ENTERTAINMENT": ethers.keccak256(ethers.toUtf8Bytes("ENTERTAINMENT")),
    "EDUCATION": ethers.keccak256(ethers.toUtf8Bytes("EDUCATION")),
    "PROFESSIONAL": ethers.keccak256(ethers.toUtf8Bytes("PROFESSIONAL")),
    "HOME_GARDEN": ethers.keccak256(ethers.toUtf8Bytes("HOME_GARDEN")),
    "AUTOMOTIVE": ethers.keccak256(ethers.toUtf8Bytes("AUTOMOTIVE")),
    "FOUNDER_PACKAGE": ethers.keccak256(ethers.toUtf8Bytes("FOUNDER_BADGES")),
    "OTHER": ethers.keccak256(ethers.toUtf8Bytes("OTHER")),
  };

  // Prepare batch data
  const storeOwners: string[] = [];
  const categoryKeys: string[] = [];
  const storeKeys: string[] = [];
  const mapping: Array<{
    dbStoreId: string;
    storeName: string;
    ownerWallet: string;
    category: string;
    categoryKey: string;
    storeKey: string;
  }> = [];

  for (const store of storesData) {
    if (!store.isScVerified) {
      console.log(`⏭️  Skipping unverified store: ${store.storeName}`);
      continue;
    }

    if (!ethers.isAddress(store.ownerWallet)) {
      console.log(`⚠️  Invalid wallet address for ${store.storeName}: ${store.ownerWallet}`);
      continue;
    }

    // Check if already verified
    const isVerified = await registry.isVerified(store.ownerWallet);
    if (isVerified) {
      console.log(`✅ Already verified: ${store.storeName} (${store.ownerWallet})`);
      
      // Still add to mapping for reference
      const info = await registry.getStoreInfo(store.ownerWallet);
      mapping.push({
        dbStoreId: store.storeId,
        storeName: store.storeName,
        ownerWallet: store.ownerWallet,
        category: store.category,
        categoryKey: info.categoryKey,
        storeKey: info.storeKey,
      });
      continue;
    }

    // Generate store key from store ID
    const storeKey = ethers.keccak256(ethers.toUtf8Bytes(`STORE_${store.storeId}`));
    const categoryKey = categoryKeyMap[store.category] || categoryKeyMap["OTHER"];

    storeOwners.push(store.ownerWallet);
    categoryKeys.push(categoryKey);
    storeKeys.push(storeKey);

    mapping.push({
      dbStoreId: store.storeId,
      storeName: store.storeName,
      ownerWallet: store.ownerWallet,
      category: store.category,
      categoryKey,
      storeKey,
    });

    console.log(`📝 Queued: ${store.storeName}`);
    console.log(`   Owner: ${store.ownerWallet}`);
    console.log(`   Category: ${store.category}`);
    console.log(`   Store Key: ${storeKey}`);
  }

  if (storeOwners.length === 0) {
    console.log("\n✅ All stores already verified or no new stores to seed.");
  } else {
    // Execute batch verification
    console.log(`\n🚀 Verifying ${storeOwners.length} stores in batch...`);
    
    const tx = await registry.verifyStoresBatch(storeOwners, categoryKeys, storeKeys);
    await waitForTx(tx, "verifyStoresBatch");
    
    console.log(`✅ Batch verification complete!`);
  }

  // Save mapping file
  const mappingFile = path.join(__dirname, "../data/store-mapping.json");
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`\n💾 Store mapping saved to: ${mappingFile}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SEEDING SUMMARY");
  console.log("=".repeat(60));
  console.log("Total stores processed:", storesData.length);
  console.log("Newly verified:", storeOwners.length);
  console.log("Already verified:", mapping.length - storeOwners.length);
  console.log("Mapping file:", mappingFile);
  console.log("=".repeat(60));
  console.log("");

  console.log("📝 NEXT STEPS:");
  console.log("1. Review the mapping file to ensure correctness");
  console.log("2. Update backend environment with mapping data");
  console.log("3. Configure custom reward policies if needed:");
  console.log("   - For FOUNDER_BADGES category: higher rewards");
  console.log("   - For specific stores: custom overrides");
  console.log("4. Test store checkout flow with verified stores");
  console.log("5. Monitor VerifiedStorePurchase events");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });
