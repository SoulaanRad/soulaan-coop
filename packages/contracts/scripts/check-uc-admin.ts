import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const UC_ADDRESS = process.env.UNITY_COIN_ADDRESS;
  
  console.log("\n🔍 Checking UnityCoin Admin Roles\n");
  console.log("Deployer:", deployer.address);
  console.log("UC Address:", UC_ADDRESS);
  console.log("");
  
  const unityCoin = await ethers.getContractAt("UnityCoin", UC_ADDRESS!);
  
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const hasAdmin = await unityCoin.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  console.log("Has DEFAULT_ADMIN_ROLE:", hasAdmin);
  
  if (!hasAdmin) {
    console.log("\n❌ Deployer does NOT have admin role");
    console.log("You need to use the admin account to update SC reference");
    
    // Try to find who has admin
    const adminCount = await unityCoin.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
    console.log(`\nNumber of admins: ${adminCount}`);
    
    for (let i = 0; i < Number(adminCount); i++) {
      const admin = await unityCoin.getRoleMember(DEFAULT_ADMIN_ROLE, i);
      console.log(`  Admin ${i + 1}: ${admin}`);
    }
  } else {
    console.log("\n✅ Deployer has admin role");
  }
  
  console.log("");
}

main().catch(console.error);
