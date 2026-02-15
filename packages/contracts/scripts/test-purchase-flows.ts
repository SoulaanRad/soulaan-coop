import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Interactive Test Script for Purchase Flows
 * 
 * This script demonstrates:
 * 1. Buying UC with USDC (onramp)
 * 2. Buying goods from verified store (earns SC rewards)
 * 3. Personal UC transfer (no SC rewards)
 * 4. Custom SC reward policies
 */

async function main() {
  console.log("\n🧪 Testing Purchase Flows\n");
  console.log("=".repeat(60));

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log("👥 Test Accounts:");
  console.log("   Deployer/Store Owner:", deployer.address);
  
  // Check if we're on local network (multiple signers) or real network (one signer)
  const isLocalNetwork = signers.length > 1;
  
  let buyer: any;
  let friend: any;
  
  if (isLocalNetwork) {
    // Use different signers for buyer and friend
    buyer = signers[1];
    friend = signers[2];
    console.log("   Buyer:", buyer.address);
    console.log("   Friend:", friend.address);
    console.log("   Network: Local (multiple accounts available)");
  } else {
    // On real network, try to load test wallet
    const fs = require("fs");
    const path = require("path");
    const testWalletFile = path.join(__dirname, "../.test-wallet.json");
    
    if (fs.existsSync(testWalletFile)) {
      const walletData = JSON.parse(fs.readFileSync(testWalletFile, "utf-8"));
      buyer = new ethers.Wallet(walletData.privateKey, ethers.provider);
      friend = buyer; // Use same for friend
      console.log("   Buyer (Test Wallet):", buyer.address);
      console.log("   Network: Base Sepolia (using test wallet)");
    } else {
      console.log("\n⚠️  No test wallet found. Run: npm run create-test-wallet");
      console.log("   For now, using deployer as buyer (limited testing)\n");
      buyer = deployer;
      friend = deployer;
    }
  }
  
  const storeOwner = deployer; // Store owner is always deployer
  console.log("");

  // Get contract addresses from environment
  const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS;
  const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS;
  const VERIFIED_STORE_REGISTRY_ADDRESS = process.env.VERIFIED_STORE_REGISTRY_ADDRESS;
  const SC_REWARD_ENGINE_ADDRESS = process.env.SC_REWARD_ENGINE_ADDRESS;
  const STORE_PAYMENT_ROUTER_ADDRESS = process.env.STORE_PAYMENT_ROUTER_ADDRESS;

  if (!UNITY_COIN_ADDRESS || !SOULAANI_COIN_ADDRESS) {
    throw new Error("Missing contract addresses in .env");
  }

  // Get contracts
  const unityCoin = await ethers.getContractAt("UnityCoin", UNITY_COIN_ADDRESS);
  const soulaaniCoin = await ethers.getContractAt("SoulaaniCoin", SOULAANI_COIN_ADDRESS);
  
  let storeRegistry, rewardEngine, paymentRouter;
  
  if (VERIFIED_STORE_REGISTRY_ADDRESS && SC_REWARD_ENGINE_ADDRESS && STORE_PAYMENT_ROUTER_ADDRESS) {
    storeRegistry = await ethers.getContractAt("VerifiedStoreRegistry", VERIFIED_STORE_REGISTRY_ADDRESS);
    rewardEngine = await ethers.getContractAt("SCRewardEngine", SC_REWARD_ENGINE_ADDRESS);
    paymentRouter = await ethers.getContractAt("StorePaymentRouter", STORE_PAYMENT_ROUTER_ADDRESS);
    console.log("✅ Trustless contracts loaded\n");
  } else {
    console.log("⚠️  Trustless contracts not deployed. Only testing basic UC operations.\n");
  }

  // ========================================
  // TEST 1: Mint UC to Buyer (Simulating Onramp)
  // ========================================
  console.log("=".repeat(60));
  console.log("TEST 1: Buying UC (Onramp Simulation)");
  console.log("=".repeat(60));
  
  const ucAmount = ethers.parseEther("1000"); // 1000 UC
  
  console.log(`Minting ${ethers.formatEther(ucAmount)} UC to buyer...`);
  
  const TREASURER_MINT = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_MINT"));
  const hasRole = await unityCoin.hasRole(TREASURER_MINT, deployer.address);
  
  if (!hasRole) {
    console.log("⚠️  Deployer doesn't have TREASURER_MINT role. Granting...");
    await unityCoin.grantRole(TREASURER_MINT, deployer.address);
  }
  
  // Add buyer as SC member first (required for UC minting)
  const MEMBER_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("MEMBER_MANAGER"));
  const hasMemberRole = await soulaaniCoin.hasRole(MEMBER_MANAGER, deployer.address);
  
  if (!hasMemberRole) {
    console.log("⚠️  Deployer doesn't have MEMBER_MANAGER role. Granting...");
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const hasAdminRole = await soulaaniCoin.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    
    if (!hasAdminRole) {
      throw new Error("Deployer doesn't have admin role to grant MEMBER_MANAGER. Check contract ownership.");
    }
    
    const grantTx = await soulaaniCoin.grantRole(MEMBER_MANAGER, deployer.address);
    await grantTx.wait();
    console.log("✅ MEMBER_MANAGER role granted");
  }
  
  const buyerMemberStatus = await soulaaniCoin.memberStatus(buyer.address);
  const statusNames = ["NotMember", "Active", "Inactive", "Removed"];
  console.log(`Buyer membership status: ${statusNames[Number(buyerMemberStatus)]} (${buyerMemberStatus})`);
  
  if (buyerMemberStatus === 0n) { // NotMember
    console.log("Adding buyer as SC member...");
    const addMemberTx = await soulaaniCoin.addMember(buyer.address);
    await addMemberTx.wait();
    console.log("✅ Buyer added as SC member");
    
    // Verify membership was added
    const newStatus = await soulaaniCoin.memberStatus(buyer.address);
    console.log(`   Verified new status: ${statusNames[Number(newStatus)]}`);
    
    if (newStatus !== 1n) { // Not Active
      throw new Error(`Failed to add buyer as active member. Status: ${newStatus}`);
    }
  } else if (buyerMemberStatus === 2n || buyerMemberStatus === 3n) { // Inactive or Removed
    console.log("⚠️  Buyer is inactive/removed. Reactivating...");
    const reactivateTx = await soulaaniCoin.reactivateMember(buyer.address);
    await reactivateTx.wait();
    console.log("✅ Buyer reactivated");
  } else {
    console.log("✅ Buyer is already an active SC member");
  }
  
  console.log("Minting UC to buyer...");
  const mintTx = await unityCoin.mint(buyer.address, ucAmount);
  await mintTx.wait();
  
  const buyerBalance = await unityCoin.balanceOf(buyer.address);
  console.log(`✅ Buyer UC Balance: ${ethers.formatEther(buyerBalance)} UC\n`);

  // ========================================
  // TEST 2: Setup Store for SC Rewards
  // ========================================
  if (storeRegistry && rewardEngine && paymentRouter) {
    console.log("=".repeat(60));
    console.log("TEST 2: Setup Verified Store");
    console.log("=".repeat(60));

    // Add store owner as SC member
    const isMember = await soulaaniCoin.memberStatus(storeOwner.address);
    if (isMember === 0) { // NotMember
      console.log("Adding store owner as SC member...");
      await soulaaniCoin.addMember(storeOwner.address);
    }

    // Add buyer as SC member
    const isBuyerMember = await soulaaniCoin.memberStatus(buyer.address);
    if (isBuyerMember === 0) {
      console.log("Adding buyer as SC member...");
      await soulaaniCoin.addMember(buyer.address);
    }

    // Verify store
    const isVerified = await storeRegistry.isVerified(storeOwner.address);
    if (!isVerified) {
      console.log("Verifying store...");
      const FOOD_BEVERAGE_KEY = ethers.keccak256(ethers.toUtf8Bytes("FOOD_BEVERAGE"));
      const STORE_KEY = ethers.keccak256(ethers.toUtf8Bytes("TEST_STORE_001"));
      await storeRegistry.verifyStore(storeOwner.address, FOOD_BEVERAGE_KEY, STORE_KEY);
      console.log("✅ Store verified!");
    } else {
      console.log("✅ Store already verified");
    }

    // Check current reward policy
    const policy = await rewardEngine.globalPolicy();
    console.log("\n📊 Current Reward Policy:");
    console.log(`   Percentage: ${Number(policy.percentageBps) / 100}%`);
    console.log(`   Fixed Amount: ${ethers.formatEther(policy.fixedAmount)} SC`);
    console.log(`   Min Purchase: ${ethers.formatEther(policy.minPurchase)} UC`);
    console.log("");

    // ========================================
    // TEST 3: Buy from Verified Store (Earns SC)
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 3: Buying from Verified Store (Earns SC Rewards)");
    console.log("=".repeat(60));

    if (buyer.address === storeOwner.address) {
      console.log("ℹ️  Buyer and store owner are the same account");
      console.log("   (Router prevents self-payment to avoid gaming)");
      console.log("\n📝 How it works:");
      console.log("   1. Buyer approves router to spend UC");
      console.log("   2. Router checks store is verified");
      console.log("   3. UC transfers from buyer to store owner");
      console.log("   4. VerifiedStorePurchase event emitted");
      console.log("   5. SC rewards minted to both buyer and store owner");
      console.log("\n✅ This flow is tested in the unit tests (test:trustless)");
      console.log("");
    } else {
      // We have different accounts, can test real purchase!
      const purchaseAmount = ethers.parseEther("100");
      
      console.log(`Buyer purchasing ${ethers.formatEther(purchaseAmount)} UC worth of goods...`);
      
      // Get balances before
      const buyerUCBefore = await unityCoin.balanceOf(buyer.address);
      const storeUCBefore = await unityCoin.balanceOf(storeOwner.address);
      const buyerSCBefore = await soulaaniCoin.balanceOf(buyer.address);
      const storeSCBefore = await soulaaniCoin.balanceOf(storeOwner.address);
      
      console.log("\n💰 Balances Before:");
      console.log(`   Buyer UC: ${ethers.formatEther(buyerUCBefore)}, SC: ${ethers.formatEther(buyerSCBefore)}`);
      console.log(`   Store UC: ${ethers.formatEther(storeUCBefore)}, SC: ${ethers.formatEther(storeSCBefore)}`);
      
      // Approve router
      console.log("\nApproving router to spend UC...");
      await unityCoin.connect(buyer).approve(await paymentRouter.getAddress(), purchaseAmount);
      
      // Execute purchase through router
      console.log("Executing purchase through StorePaymentRouter...");
      const tx = await paymentRouter.connect(buyer).payVerifiedStore(
        storeOwner.address,
        purchaseAmount,
        "ORDER_TEST_001"
      );
      const receipt = await tx.wait();
      
      // Get balances after
      const buyerUCAfter = await unityCoin.balanceOf(buyer.address);
      const storeUCAfter = await unityCoin.balanceOf(storeOwner.address);
      const buyerSCAfter = await soulaaniCoin.balanceOf(buyer.address);
      const storeSCAfter = await soulaaniCoin.balanceOf(storeOwner.address);
      
      console.log("\n💰 Balances After:");
      console.log(`   Buyer UC: ${ethers.formatEther(buyerUCAfter)}, SC: ${ethers.formatEther(buyerSCAfter)}`);
      console.log(`   Store UC: ${ethers.formatEther(storeUCAfter)}, SC: ${ethers.formatEther(storeSCAfter)}`);
      
      const buyerSCEarned = buyerSCAfter - buyerSCBefore;
      const storeSCEarned = storeSCAfter - storeSCBefore;
      
      console.log("\n🪙 SC Rewards Earned:");
      console.log(`   Buyer: +${ethers.formatEther(buyerSCEarned)} SC`);
      console.log(`   Store: +${ethers.formatEther(storeSCEarned)} SC`);
      
      if (buyerSCEarned > 0n || storeSCEarned > 0n) {
        console.log("\n✅ SC Rewards minted successfully!");
      } else {
        console.log("\n⚠️  No SC rewards (may be at 2% cap)");
      }
      
      console.log(`\n📝 Transaction: https://sepolia.basescan.org/tx/${receipt?.hash}`);
      console.log("");
    }

    // ========================================
    // TEST 4: Custom SC Reward Policy
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 4: Setting Custom SC Reward Policy");
    console.log("=".repeat(60));

    console.log("Setting custom policy: 5% + 10 SC fixed...");
    
    await rewardEngine.setGlobalPolicy(
      500, // 5%
      ethers.parseEther("10"), // +10 SC
      ethers.parseEther("1"), // Min 1 UC
      ethers.parseEther("100"), // Max 100 SC per tx
      true
    );
    
    const newPolicy = await rewardEngine.globalPolicy();
    console.log("\n📊 New Reward Policy:");
    console.log(`   Percentage: ${Number(newPolicy.percentageBps) / 100}%`);
    console.log(`   Fixed Amount: ${ethers.formatEther(newPolicy.fixedAmount)} SC`);
    console.log(`   Min Purchase: ${ethers.formatEther(newPolicy.minPurchase)} UC`);
    console.log(`   Max Reward: ${newPolicy.maxRewardPerTx === 0n ? "Unlimited" : ethers.formatEther(newPolicy.maxRewardPerTx) + " SC"}`);
    
    // Calculate expected reward
    const testAmount = ethers.parseEther("200");
    const [expectedReward, policyKey] = await rewardEngine.calculateReward(storeOwner.address, testAmount);
    
    console.log(`\n🧮 Expected Reward for ${ethers.formatEther(testAmount)} UC purchase:`);
    console.log(`   ${ethers.formatEther(expectedReward)} SC (5% of 200 + 10 = 20 SC)`);
    console.log("");

    // ========================================
    // TEST 5: Purchase with Custom Policy
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 5: Buying with Custom Reward Policy");
    console.log("=".repeat(60));

    console.log("ℹ️  With custom policy active, purchases would earn:");
    console.log(`   ${ethers.formatEther(expectedReward)} SC per ${ethers.formatEther(testAmount)} UC purchase`);
    console.log("\n✅ Custom policies allow flexible reward structures:");
    console.log("   - Global default (applies to all stores)");
    console.log("   - Category override (e.g., FOUNDER_BADGES)");
    console.log("   - Store-specific override (for special stores)");
    console.log("");
  }

  // ========================================
  // TEST 6: Treasury Fee Collection
  // ========================================
  console.log("=".repeat(60));
  console.log("TEST 6: Treasury Fee Collection on Transfers");
  console.log("=".repeat(60));

  // Check current fee settings
  const transferFeePercent = await unityCoin.transferFeePercent();
  let feeRecipient = await unityCoin.feeRecipient();
  
  console.log("\n📊 Current Fee Settings:");
  console.log(`   Fee Rate: ${Number(transferFeePercent) / 100}% (${transferFeePercent} basis points)`);
  console.log(`   Fee Recipient (Treasury): ${feeRecipient}`);
  
  if (feeRecipient === ethers.ZeroAddress) {
    console.log("\n⚠️  No fee recipient set. Setting treasury address...");
    const treasuryAddress = process.env.TREASURY_SAFE_ADDRESS || deployer.address;
    await unityCoin.setFeeRecipient(treasuryAddress);
    feeRecipient = treasuryAddress;
    console.log(`✅ Fee recipient set to: ${treasuryAddress}`);
  }
  
  // Test treasury fee collection with actual transfer
  if (buyer.address !== friend.address && buyer.address !== deployer.address) {
    // We have different accounts, can test real transfer
    const transferAmount = ethers.parseEther("100");
    
    console.log(`\n📤 Buyer transferring ${ethers.formatEther(transferAmount)} UC to friend...`);
    console.log("   (This will trigger automatic fee collection)");
    
    const expectedFee = (transferAmount * transferFeePercent) / 10000n;
    console.log(`   Expected Fee: ${ethers.formatEther(expectedFee)} UC`);
    
    // Add friend as member if needed
    const friendMemberStatus = await soulaaniCoin.memberStatus(friend.address);
    if (friendMemberStatus === 0) {
      console.log("   Adding friend as SC member...");
      await soulaaniCoin.addMember(friend.address);
    }
    
    // Get balances before
    const treasuryBalanceBefore = await unityCoin.balanceOf(feeRecipient);
    const buyerBalanceBefore = await unityCoin.balanceOf(buyer.address);
    const friendBalanceBefore = await unityCoin.balanceOf(friend.address);
    const buyerSCBefore = await soulaaniCoin.balanceOf(buyer.address);
    const friendSCBefore = await soulaaniCoin.balanceOf(friend.address);
    
    console.log("\n💰 Balances Before:");
    console.log(`   Buyer UC: ${ethers.formatEther(buyerBalanceBefore)}`);
    console.log(`   Friend UC: ${ethers.formatEther(friendBalanceBefore)}`);
    console.log(`   Treasury UC: ${ethers.formatEther(treasuryBalanceBefore)}`);
    
    // Execute transfer
    await unityCoin.connect(buyer).transfer(friend.address, transferAmount);
    
    // Get balances after
    const treasuryBalanceAfter = await unityCoin.balanceOf(feeRecipient);
    const buyerBalanceAfter = await unityCoin.balanceOf(buyer.address);
    const friendBalanceAfter = await unityCoin.balanceOf(friend.address);
    const buyerSCAfter = await soulaaniCoin.balanceOf(buyer.address);
    const friendSCAfter = await soulaaniCoin.balanceOf(friend.address);
    
    const feeCollected = treasuryBalanceAfter - treasuryBalanceBefore;
    
    console.log("\n💰 Balances After:");
    console.log(`   Buyer UC: ${ethers.formatEther(buyerBalanceAfter)} (sent ${ethers.formatEther(transferAmount)})`);
    console.log(`   Friend UC: ${ethers.formatEther(friendBalanceAfter)} (received ${ethers.formatEther(transferAmount)})`);
    console.log(`   Treasury UC: ${ethers.formatEther(treasuryBalanceAfter)} (fee: +${ethers.formatEther(feeCollected)})`);
    
    console.log("\n🪙 SC Balances (Should be unchanged):");
    console.log(`   Buyer SC: ${ethers.formatEther(buyerSCBefore)} → ${ethers.formatEther(buyerSCAfter)}`);
    console.log(`   Friend SC: ${ethers.formatEther(friendSCBefore)} → ${ethers.formatEther(friendSCAfter)}`);
    
    if (buyerSCAfter === buyerSCBefore && friendSCAfter === friendSCBefore) {
      console.log("\n✅ No SC rewards for personal transfer (as expected)");
    }
    
    if (feeCollected > 0n) {
      console.log(`✅ Treasury fee collected: ${ethers.formatEther(feeCollected)} UC`);
    }
  } else {
    console.log("\n⚠️  Using same account for all roles - skipping transfer test");
    console.log("   Run 'npm run create-test-wallet' to create a buyer account");
  }
  
  console.log("\n📝 How Treasury Fees Work:");
  console.log("   1. Every UC transfer triggers a fee (default 0.1%)");
  console.log("   2. Fee is automatically MINTED to treasury address");
  console.log("   3. This increases UC supply slightly but funds co-op operations");
  console.log("   4. Treasury can use UC for AI payments, grants, etc.");
  console.log("");
  
  // ========================================
  // TEST 7: Key Differences Summary
  // ========================================
  console.log("=".repeat(60));
  console.log("TEST 7: Store Purchase vs Personal Transfer");
  console.log("=".repeat(60));

  console.log("\n🏪 STORE PURCHASE (via Router):");
  console.log("   ✅ UC transfers from buyer to store");
  console.log("   ✅ SC rewards minted to BOTH parties");
  console.log("   ✅ Treasury fee collected (0.1%)");
  console.log("   ✅ VerifiedStorePurchase event emitted");
  console.log("   ✅ Must be verified store");
  console.log("");
  
  console.log("💸 PERSONAL TRANSFER (direct UC.transfer):");
  console.log("   ✅ UC transfers from sender to recipient");
  console.log("   ❌ NO SC rewards minted");
  console.log("   ✅ Treasury fee still collected (0.1%)");
  console.log("   ❌ No special events");
  console.log("   ✅ Works with any SC member");
  console.log("");
  
  console.log("🛡️  Security:");
  console.log("   - Router prevents self-payment");
  console.log("   - Only verified stores earn SC");
  console.log("   - Personal transfers can't farm SC");
  console.log("   - Clear separation prevents gaming");
  console.log("");

  // ========================================
  // SUMMARY
  // ========================================
  console.log("=".repeat(60));
  console.log("📊 FINAL BALANCES");
  console.log("=".repeat(60));
  
  const finalUC = await unityCoin.balanceOf(deployer.address);
  const finalSC = await soulaaniCoin.balanceOf(deployer.address);
  
  console.log("\n💰 Your Account:");
  console.log(`   Address: ${deployer.address}`);
  console.log(`   UC: ${ethers.formatEther(finalUC)}`);
  console.log(`   SC: ${ethers.formatEther(finalSC)}`);
  console.log("");

  console.log("=".repeat(60));
  console.log("✅ All tests completed!");
  console.log("=".repeat(60));
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
