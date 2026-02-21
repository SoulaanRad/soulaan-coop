import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Demo Purchase Flows - Works on any network
 * 
 * This script demonstrates the difference between:
 * 1. Store purchases (earn SC rewards)
 * 2. Personal transfers (no SC rewards)
 * 3. Treasury fee collection
 */

async function main() {
  console.log("\n🧪 Demo: Purchase Flows & Treasury Fees\n");
  console.log("=".repeat(60));

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const isLocalNetwork = signers.length > 1;
  
  console.log("🌐 Network:", isLocalNetwork ? "Local Hardhat" : "Base Sepolia");
  console.log("👤 Deployer:", deployer.address);
  
  // Try to load test wallet for real network
  let buyer = deployer;
  let hasSeparateBuyer = false;
  
  if (!isLocalNetwork) {
    const testWalletFile = path.join(__dirname, "../.test-wallet.json");
    if (fs.existsSync(testWalletFile)) {
      const walletData = JSON.parse(fs.readFileSync(testWalletFile, "utf-8"));
      buyer = new ethers.Wallet(walletData.privateKey, ethers.provider);
      hasSeparateBuyer = true;
      console.log("👤 Buyer (Test Wallet):", buyer.address);
    }
  } else {
    buyer = signers[1];
    hasSeparateBuyer = true;
    console.log("👤 Buyer:", buyer.address);
  }
  
  console.log("");

  // Get contract addresses
  const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS;
  const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS;
  const VERIFIED_STORE_REGISTRY_ADDRESS = process.env.VERIFIED_STORE_REGISTRY_ADDRESS;
  const SC_REWARD_ENGINE_ADDRESS = process.env.SC_REWARD_ENGINE_ADDRESS;
  const STORE_PAYMENT_ROUTER_ADDRESS = process.env.STORE_PAYMENT_ROUTER_ADDRESS;

  if (!UNITY_COIN_ADDRESS || !SOULAANI_COIN_ADDRESS) {
    throw new Error("Missing UNITY_COIN_ADDRESS or SOULAANI_COIN_ADDRESS in .env");
  }

  const unityCoin = await ethers.getContractAt("UnityCoin", UNITY_COIN_ADDRESS);
  const soulaaniCoin = await ethers.getContractAt("SoulaaniCoin", SOULAANI_COIN_ADDRESS);
  
  const hasTrustlessContracts = VERIFIED_STORE_REGISTRY_ADDRESS && SC_REWARD_ENGINE_ADDRESS && STORE_PAYMENT_ROUTER_ADDRESS;
  
  if (hasTrustlessContracts) {
    console.log("✅ Trustless contracts available\n");
  } else {
    console.log("⚠️  Trustless contracts not deployed\n");
  }

  // ========================================
  // DEMO 1: UC Minting (Onramp)
  // ========================================
  console.log("=".repeat(60));
  console.log("DEMO 1: Minting UC (Onramp)");
  console.log("=".repeat(60));
  
  if (hasSeparateBuyer) {
    console.log("\n📝 Scenario: User buys UC with fiat/USDC");
    console.log("   - Backend mints UC to user's wallet");
    console.log("   - No SC rewards for buying UC");
    console.log("   - User can now spend UC");
    
    // Setup buyer as SC member
    const MEMBER_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("MEMBER_MANAGER"));
    const hasMemberRole = await soulaaniCoin.hasRole(MEMBER_MANAGER, deployer.address);
    if (!hasMemberRole) {
      await soulaaniCoin.grantRole(MEMBER_MANAGER, deployer.address);
    }
    
    const buyerMemberStatus = await soulaaniCoin.memberStatus(buyer.address);
    if (buyerMemberStatus === 0) {
      console.log("\n   Adding buyer as SC member...");
      await soulaaniCoin.addMember(buyer.address);
    }
    
    // Mint UC
    const TREASURER_MINT = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_MINT"));
    const hasMintRole = await unityCoin.hasRole(TREASURER_MINT, deployer.address);
    if (!hasMintRole) {
      await unityCoin.grantRole(TREASURER_MINT, deployer.address);
    }
    
    const mintAmount = ethers.parseEther("500");
    console.log(`\n   Minting ${ethers.formatEther(mintAmount)} UC to buyer...`);
    await unityCoin.mint(buyer.address, mintAmount);
    
    const buyerBalance = await unityCoin.balanceOf(buyer.address);
    console.log(`   ✅ Buyer UC Balance: ${ethers.formatEther(buyerBalance)} UC`);
  } else {
    console.log("\n⚠️  No separate buyer account. Run: npm run create-test-wallet");
  }
  console.log("");

  // ========================================
  // DEMO 2: Store Purchase (WITH SC Rewards)
  // ========================================
  if (hasTrustlessContracts && hasSeparateBuyer) {
    console.log("=".repeat(60));
    console.log("DEMO 2: Store Purchase (Earns SC Rewards)");
    console.log("=".repeat(60));
    
    const storeRegistry = await ethers.getContractAt("VerifiedStoreRegistry", VERIFIED_STORE_REGISTRY_ADDRESS!);
    const rewardEngine = await ethers.getContractAt("SCRewardEngine", SC_REWARD_ENGINE_ADDRESS!);
    const paymentRouter = await ethers.getContractAt("StorePaymentRouter", STORE_PAYMENT_ROUTER_ADDRESS!);
    
    // Verify deployer's store
    const isVerified = await storeRegistry.isVerified(deployer.address);
    if (!isVerified) {
      console.log("\n   Verifying store...");
      const FOOD_BEVERAGE_KEY = ethers.keccak256(ethers.toUtf8Bytes("FOOD_BEVERAGE"));
      const STORE_KEY = ethers.keccak256(ethers.toUtf8Bytes("DEMO_STORE"));
      await storeRegistry.verifyStore(deployer.address, FOOD_BEVERAGE_KEY, STORE_KEY);
    }
    
    // Add deployer as SC member
    const deployerMemberStatus = await soulaaniCoin.memberStatus(deployer.address);
    if (deployerMemberStatus === 0) {
      await soulaaniCoin.addMember(deployer.address);
    }
    
    console.log("\n📝 Scenario: Buyer purchases from verified store");
    
    const purchaseAmount = ethers.parseEther("100");
    
    // Get policy
    const policy = await rewardEngine.globalPolicy();
    const [expectedReward] = await rewardEngine.calculateReward(deployer.address, purchaseAmount);
    
    console.log(`   - Purchase Amount: ${ethers.formatEther(purchaseAmount)} UC`);
    console.log(`   - Reward Policy: ${Number(policy.percentageBps) / 100}% + ${ethers.formatEther(policy.fixedAmount)} SC`);
    console.log(`   - Expected SC Reward: ${ethers.formatEther(expectedReward)} SC (each)`);
    
    // Get balances before
    const buyerUCBefore = await unityCoin.balanceOf(buyer.address);
    const storeUCBefore = await unityCoin.balanceOf(deployer.address);
    const buyerSCBefore = await soulaaniCoin.balanceOf(buyer.address);
    const storeSCBefore = await soulaaniCoin.balanceOf(deployer.address);
    
    console.log("\n   💰 Before:");
    console.log(`      Buyer: ${ethers.formatEther(buyerUCBefore)} UC, ${ethers.formatEther(buyerSCBefore)} SC`);
    console.log(`      Store: ${ethers.formatEther(storeUCBefore)} UC, ${ethers.formatEther(storeSCBefore)} SC`);
    
    // Execute purchase
    console.log("\n   Executing purchase through StorePaymentRouter...");
    await unityCoin.connect(buyer).approve(await paymentRouter.getAddress(), purchaseAmount);
    const tx = await paymentRouter.connect(buyer).payVerifiedStore(
      deployer.address,
      purchaseAmount,
      "DEMO_ORDER_001"
    );
    await tx.wait();
    
    // Get balances after
    const buyerUCAfter = await unityCoin.balanceOf(buyer.address);
    const storeUCAfter = await unityCoin.balanceOf(deployer.address);
    const buyerSCAfter = await soulaaniCoin.balanceOf(buyer.address);
    const storeSCAfter = await soulaaniCoin.balanceOf(deployer.address);
    
    console.log("\n   💰 After:");
    console.log(`      Buyer: ${ethers.formatEther(buyerUCAfter)} UC, ${ethers.formatEther(buyerSCAfter)} SC`);
    console.log(`      Store: ${ethers.formatEther(storeUCAfter)} UC, ${ethers.formatEther(storeSCAfter)} SC`);
    
    const buyerSCEarned = buyerSCAfter - buyerSCBefore;
    const storeSCEarned = storeSCAfter - storeSCBefore;
    
    console.log("\n   🪙 SC Rewards:");
    console.log(`      Buyer: +${ethers.formatEther(buyerSCEarned)} SC`);
    console.log(`      Store: +${ethers.formatEther(storeSCEarned)} SC`);
    
    if (buyerSCEarned > 0n || storeSCEarned > 0n) {
      console.log("\n   ✅ SC REWARDS MINTED for store purchase!");
    } else {
      console.log("\n   ⚠️  No SC rewards (may be at cap)");
    }
    console.log("");
  }

  // ========================================
  // DEMO 3: Personal Transfer (NO SC Rewards)
  // ========================================
  if (hasSeparateBuyer) {
    console.log("=".repeat(60));
    console.log("DEMO 3: Personal Transfer (NO SC Rewards)");
    console.log("=".repeat(60));
    
    console.log("\n📝 Scenario: User sends UC to friend (personal payment)");
    
    const transferAmount = ethers.parseEther("50");
    
    // Get balances before
    const buyerUCBefore = await unityCoin.balanceOf(buyer.address);
    const deployerUCBefore = await unityCoin.balanceOf(deployer.address);
    const buyerSCBefore = await soulaaniCoin.balanceOf(buyer.address);
    const deployerSCBefore = await soulaaniCoin.balanceOf(deployer.address);
    
    console.log(`   - Transfer Amount: ${ethers.formatEther(transferAmount)} UC`);
    console.log("\n   💰 Before:");
    console.log(`      Buyer: ${ethers.formatEther(buyerUCBefore)} UC, ${ethers.formatEther(buyerSCBefore)} SC`);
    console.log(`      Friend: ${ethers.formatEther(deployerUCBefore)} UC, ${ethers.formatEther(deployerSCBefore)} SC`);
    
    // Execute direct transfer (NOT through router)
    console.log("\n   Executing direct UC.transfer() (not through router)...");
    await unityCoin.connect(buyer).transfer(deployer.address, transferAmount);
    
    // Get balances after
    const buyerUCAfter = await unityCoin.balanceOf(buyer.address);
    const deployerUCAfter = await unityCoin.balanceOf(deployer.address);
    const buyerSCAfter = await soulaaniCoin.balanceOf(buyer.address);
    const deployerSCAfter = await soulaaniCoin.balanceOf(deployer.address);
    
    console.log("\n   💰 After:");
    console.log(`      Buyer: ${ethers.formatEther(buyerUCAfter)} UC, ${ethers.formatEther(buyerSCAfter)} SC`);
    console.log(`      Friend: ${ethers.formatEther(deployerUCAfter)} UC, ${ethers.formatEther(deployerSCAfter)} SC`);
    
    const buyerSCChange = buyerSCAfter - buyerSCBefore;
    const friendSCChange = deployerSCAfter - deployerSCBefore;
    
    console.log("\n   🪙 SC Changes:");
    console.log(`      Buyer: ${buyerSCChange === 0n ? "No change" : ethers.formatEther(buyerSCChange) + " SC"}`);
    console.log(`      Friend: ${friendSCChange === 0n ? "No change" : ethers.formatEther(friendSCChange) + " SC"}`);
    
    if (buyerSCChange === 0n && friendSCChange === 0n) {
      console.log("\n   ✅ NO SC REWARDS for personal transfer (as expected)!");
    } else {
      console.log("\n   ❌ ERROR: SC was minted (should not happen!)");
    }
    console.log("");
  }

  // ========================================
  // DEMO 4: Treasury Fee Collection
  // ========================================
  console.log("=".repeat(60));
  console.log("DEMO 4: Treasury Fee Collection");
  console.log("=".repeat(60));

  const transferFeePercent = await unityCoin.transferFeePercent();
  let feeRecipient = await unityCoin.feeRecipient();
  
  console.log("\n📊 Fee Settings:");
  console.log(`   Fee Rate: ${Number(transferFeePercent) / 100}%`);
  console.log(`   Treasury Address: ${feeRecipient}`);
  
  if (feeRecipient === ethers.ZeroAddress) {
    console.log("\n   Setting fee recipient to deployer...");
    await unityCoin.setFeeRecipient(deployer.address);
    feeRecipient = deployer.address;
  }
  
  const treasuryBalance = await unityCoin.balanceOf(feeRecipient);
  console.log(`   Treasury Balance: ${ethers.formatEther(treasuryBalance)} UC`);
  
  console.log("\n📝 How fees work:");
  console.log("   - Every UC transfer triggers 0.1% fee");
  console.log("   - Fee is MINTED to treasury (not deducted)");
  console.log("   - Applies to both store purchases and personal transfers");
  console.log("   - Funds co-op operations (AI, grants, infrastructure)");
  console.log("");

  // ========================================
  // SUMMARY
  // ========================================
  console.log("=".repeat(60));
  console.log("📊 KEY DIFFERENCES");
  console.log("=".repeat(60));
  
  console.log("\n🏪 STORE PURCHASE (via StorePaymentRouter):");
  console.log("   ✅ UC transfers: buyer → store owner");
  console.log("   ✅ SC rewards: MINTED to both parties");
  console.log("   ✅ Treasury fee: 0.1% collected");
  console.log("   ✅ Event: VerifiedStorePurchase emitted");
  console.log("   ✅ Requirement: Store must be verified");
  
  console.log("\n💸 PERSONAL TRANSFER (via UC.transfer):");
  console.log("   ✅ UC transfers: sender → recipient");
  console.log("   ❌ SC rewards: NONE");
  console.log("   ✅ Treasury fee: 0.1% collected");
  console.log("   ❌ Event: Standard Transfer only");
  console.log("   ✅ Requirement: Both must be SC members");
  
  console.log("\n🛡️  SECURITY:");
  console.log("   - Router prevents self-payment");
  console.log("   - Only verified stores earn SC");
  console.log("   - Personal transfers can't farm SC");
  console.log("   - Treasury fees fund operations");
  
  console.log("\n💡 TESTING:");
  console.log("   - Unit tests: npm run test:trustless (24 tests)");
  console.log("   - Local demo: npm run node, then npm run test-flows:local");
  console.log("   - Real network: npm run test-flows:sepolia (needs test wallet)");
  
  console.log("");
  console.log("=".repeat(60));
  console.log("✅ Demo complete!");
  console.log("=".repeat(60));
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Demo failed:", error);
    process.exit(1);
  });
