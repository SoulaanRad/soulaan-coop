import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Create a Test Wallet for Purchase Testing
 * 
 * This script:
 * 1. Generates a new random wallet
 * 2. Saves the private key to a file
 * 3. Funds it with ETH for gas (from deployer)
 * 4. Mints UC to it for testing purchases
 * 5. Adds it as an SC member
 */

async function main() {
  console.log("\n🔑 Creating Test Wallet\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer:", deployer.address);
  
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer ETH Balance:", ethers.formatEther(deployerBalance), "ETH\n");

  // Generate new wallet
  const testWallet = ethers.Wallet.createRandom();
  
  console.log("✅ New Test Wallet Created!");
  console.log("=".repeat(60));
  console.log("Address:", testWallet.address);
  console.log("Private Key:", testWallet.privateKey);
  console.log("=".repeat(60));
  console.log("");

  // Save to file
  const testWalletFile = path.join(__dirname, "../.test-wallet.json");
  const walletData = {
    address: testWallet.address,
    privateKey: testWallet.privateKey,
    createdAt: new Date().toISOString(),
    network: "baseSepolia",
  };
  
  fs.writeFileSync(testWalletFile, JSON.stringify(walletData, null, 2));
  console.log("💾 Wallet saved to:", testWalletFile);
  console.log("⚠️  Keep this file secure! It contains your private key.\n");

  // Fund with ETH for gas
  console.log("=".repeat(60));
  console.log("💸 Funding Test Wallet with ETH for Gas");
  console.log("=".repeat(60));
  
  const ethAmount = ethers.parseEther("0.002"); // 0.002 ETH for gas (enough for ~20 transactions)
  console.log(`Sending ${ethers.formatEther(ethAmount)} ETH...`);
  
  const ethTx = await deployer.sendTransaction({
    to: testWallet.address,
    value: ethAmount,
  });
  await ethTx.wait();
  
  const testWalletETH = await ethers.provider.getBalance(testWallet.address);
  console.log(`✅ Test Wallet ETH Balance: ${ethers.formatEther(testWalletETH)} ETH\n`);

  // Get contracts
  const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS;
  const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS;

  if (!UNITY_COIN_ADDRESS || !SOULAANI_COIN_ADDRESS) {
    console.log("⚠️  Contract addresses not found in .env");
    console.log("   Add UNITY_COIN_ADDRESS and SOULAANI_COIN_ADDRESS to continue\n");
    return;
  }

  const unityCoin = await ethers.getContractAt("UnityCoin", UNITY_COIN_ADDRESS);
  const soulaaniCoin = await ethers.getContractAt("SoulaaniCoin", SOULAANI_COIN_ADDRESS);

  // Add as SC member FIRST (required before minting UC)
  console.log("=".repeat(60));
  console.log("🪙 Adding Test Wallet as SC Member");
  console.log("=".repeat(60));
  
  const memberStatus = await soulaaniCoin.memberStatus(testWallet.address);
  
  if (memberStatus === 0) { // NotMember
    console.log("Adding as SC member...");
    const addMemberTx = await soulaaniCoin.addMember(testWallet.address);
    await addMemberTx.wait();
    console.log("✅ Test Wallet is now an SC member\n");
  } else {
    console.log("✅ Already an SC member\n");
  }

  // Mint UC to test wallet
  console.log("=".repeat(60));
  console.log("💰 Minting UC to Test Wallet");
  console.log("=".repeat(60));
  
  const ucAmount = ethers.parseEther("500"); // 500 UC
  console.log(`Minting ${ethers.formatEther(ucAmount)} UC...`);
  
  const TREASURER_MINT = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_MINT"));
  const hasRole = await unityCoin.hasRole(TREASURER_MINT, deployer.address);
  
  if (!hasRole) {
    console.log("Granting TREASURER_MINT role to deployer...");
    await unityCoin.grantRole(TREASURER_MINT, deployer.address);
  }
  
  const mintTx = await unityCoin.mint(testWallet.address, ucAmount);
  await mintTx.wait();
  
  const testWalletUC = await unityCoin.balanceOf(testWallet.address);
  console.log(`✅ Test Wallet UC Balance: ${ethers.formatEther(testWalletUC)} UC\n`);

  // Summary
  console.log("=".repeat(60));
  console.log("🎉 TEST WALLET READY!");
  console.log("=".repeat(60));
  console.log("\n📋 Wallet Info:");
  console.log("   Address:", testWallet.address);
  console.log("   ETH:", ethers.formatEther(testWalletETH), "ETH");
  console.log("   UC:", ethers.formatEther(testWalletUC), "UC");
  console.log("   SC Member: Yes");
  console.log("");

  console.log("📝 Next Steps:");
  console.log("");
  console.log("1. Add to .env file:");
  console.log(`   TEST_BUYER_ADDRESS=${testWallet.address}`);
  console.log(`   TEST_BUYER_PRIVATE_KEY=${testWallet.privateKey}`);
  console.log("");
  console.log("2. Use in test scripts:");
  console.log("   const buyer = new ethers.Wallet(process.env.TEST_BUYER_PRIVATE_KEY, provider);");
  console.log("");
  console.log("3. Test buying from your store:");
  console.log("   - Your deployer address is the verified store owner");
  console.log("   - Test wallet can now buy from you and earn SC rewards!");
  console.log("");
  console.log("4. View on BaseScan:");
  console.log(`   https://sepolia.basescan.org/address/${testWallet.address}`);
  console.log("");

  console.log("⚠️  SECURITY NOTES:");
  console.log("   - This is a TEST wallet for Base Sepolia only");
  console.log("   - Never use this wallet on mainnet");
  console.log("   - Private key is saved in .test-wallet.json (gitignored)");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
