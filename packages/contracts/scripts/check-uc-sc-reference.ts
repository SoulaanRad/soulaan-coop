import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const UC_ADDRESS = process.env.UNITY_COIN_ADDRESS;
  const SC_ADDRESS = process.env.SOULAANI_COIN_ADDRESS;
  
  console.log("\n🔍 Checking UnityCoin's SoulaaniCoin Reference\n");
  console.log("Expected SC Address:", SC_ADDRESS);
  
  const unityCoin = await ethers.getContractAt("UnityCoin", UC_ADDRESS!);
  const actualSCAddress = await unityCoin.soulaaniCoin();
  
  console.log("UC's SC Reference: ", actualSCAddress);
  console.log("");
  
  const match = actualSCAddress.toLowerCase() === SC_ADDRESS?.toLowerCase();
  
  if (match) {
    console.log("✅ MATCH - UC is using the correct SC contract");
  } else {
    console.log("❌ MISMATCH - UC is using a different SC contract!");
    console.log("\nThis explains why membership checks are failing.");
    console.log("You need to update the UC contract's SC reference.");
  }
  
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
