import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const testWalletFile = path.join(__dirname, "../.test-wallet.json");
  
  if (!fs.existsSync(testWalletFile)) {
    throw new Error("Test wallet file not found");
  }
  
  const walletData = JSON.parse(fs.readFileSync(testWalletFile, "utf-8"));
  const testWalletAddress = walletData.address;
  
  console.log("\n💸 Funding Test Wallet\n");
  console.log("From:", deployer.address);
  console.log("To:", testWalletAddress);
  
  const ethAmount = ethers.parseEther("0.005"); // 0.005 ETH
  console.log(`Amount: ${ethers.formatEther(ethAmount)} ETH`);
  
  const tx = await deployer.sendTransaction({
    to: testWalletAddress,
    value: ethAmount
  });
  
  console.log("\n⏳ Waiting for transaction...");
  await tx.wait();
  
  const balance = await ethers.provider.getBalance(testWalletAddress);
  console.log(`✅ Test wallet balance: ${ethers.formatEther(balance)} ETH\n`);
}

main().catch(console.error);
