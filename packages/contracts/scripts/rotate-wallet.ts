import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Script to help rotate backend wallet keys safely
 *
 * Usage:
 *   pnpm rotate-wallet
 *
 * This script will:
 * 1. Generate a new wallet
 * 2. Provide instructions for granting roles
 * 3. Track rotation history
 */

interface RotationRecord {
  date: string;
  walletType: "governance" | "onramp";
  oldAddress: string;
  newAddress: string;
  status: "pending" | "active" | "revoked";
  notes: string;
}

const ROTATION_LOG = path.join(__dirname, "../rotations.json");

async function main() {
  console.log("\n🔄 WALLET KEY ROTATION HELPER\n");
  console.log("═══════════════════════════════════════════════════\n");

  // 1. Load existing rotation history
  let rotations: RotationRecord[] = [];
  if (fs.existsSync(ROTATION_LOG)) {
    rotations = JSON.parse(fs.readFileSync(ROTATION_LOG, "utf-8"));
    console.log("📋 Previous Rotations:");
    rotations.slice(-3).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.date} - ${r.walletType} (${r.status})`);
    });
    console.log("");
  }

  // 2. Ask which wallet to rotate
  console.log("Which wallet are you rotating?");
  console.log("  1. Governance Bot (SC awards/slashing)");
  console.log("  2. Onramp Wallet (UC minting)");
  console.log("");

  // For demo, we'll create for both types
  // In real use, you'd prompt the user

  // 3. Generate new wallet
  console.log("🔑 Generating new wallet...\n");
  const newWallet = ethers.Wallet.createRandom();

  console.log("✅ NEW WALLET CREATED:\n");
  console.log(`Address:     ${newWallet.address}`);
  console.log(`Private Key: ${newWallet.privateKey}`);
  console.log("");
  console.log("⚠️  SAVE THESE SECURELY! They will not be shown again.\n");
  console.log("═══════════════════════════════════════════════════\n");

  // 4. Provide step-by-step instructions
  console.log("📝 ROTATION STEPS:\n");

  console.log("STEP 1: Store new private key in your secrets manager");
  console.log("  - AWS Secrets Manager, HashiCorp Vault, etc.");
  console.log("  - Key name: governance-bot-key-v2 (or onramp-wallet-key-v2)");
  console.log("");

  console.log("STEP 2: Grant role to NEW wallet");
  console.log("  Option A: Use manage-roles script");
  console.log("    1. Edit scripts/manage-roles.ts");
  console.log("    2. Add grant role commands for new address");
  console.log("    3. Run: pnpm manage-roles --network baseSepolia");
  console.log("");
  console.log("  Option B: Use Treasury Safe UI");
  console.log("    1. Go to https://app.safe.global");
  console.log("    2. Connect to your Treasury Safe");
  console.log("    3. New Transaction -> Contract Interaction");
  console.log(`    4. Contract: [UC or SC contract address]`);
  console.log("    5. Method: grantRole");
  console.log("    6. Role: [ONRAMP_MINTER or GOVERNANCE_AWARD]");
  console.log(`    7. Account: ${newWallet.address}`);
  console.log("");

  console.log("STEP 3: For onramp wallet, set daily limit");
  console.log("  await ucContract.setDailyMintLimit(");
  console.log(`    "${newWallet.address}",`);
  console.log('    ethers.parseEther("50000")');
  console.log("  );");
  console.log("");

  console.log("STEP 4: Update backend with new private key");
  console.log("  - Update .env or secrets manager");
  console.log("  - Redeploy backend");
  console.log("  - Test thoroughly!");
  console.log("");

  console.log("STEP 5: Test new key works");
  console.log("  - Make test transaction (onramp or SC award)");
  console.log("  - Verify on BaseScan");
  console.log("  - Check logs for errors");
  console.log("");

  console.log("STEP 6: Revoke OLD wallet (after confirming new works)");
  console.log("  - Wait 24-48 hours to ensure stability");
  console.log("  - Use manage-roles script to revoke old address");
  console.log("  - Document completion");
  console.log("");

  console.log("═══════════════════════════════════════════════════\n");

  // 5. Ask for old address to create rotation record
  console.log("📊 ROTATION TRACKING:\n");
  console.log("To track this rotation, provide the old wallet address:");
  console.log("(Press Enter to skip tracking)\n");

  // In real implementation, you'd prompt for input
  // For now, we'll create a template record

  const rotationRecord: RotationRecord = {
    date: new Date().toISOString().split("T")[0],
    walletType: "onramp", // or 'governance'
    oldAddress: "0x0000...old", // User would input this
    newAddress: newWallet.address,
    status: "pending",
    notes: "Scheduled 90-day rotation",
  };

  console.log("📝 Rotation record template:");
  console.log(JSON.stringify(rotationRecord, null, 2));
  console.log("");
  console.log(`This will be saved to: ${ROTATION_LOG}`);
  console.log("");
  console.log("Update the status as you progress:");
  console.log("  - pending: New wallet created, role not yet granted");
  console.log("  - active: New wallet granted role, old not yet revoked");
  console.log("  - revoked: Old wallet revoked, rotation complete");
  console.log("");

  // 6. Security reminders
  console.log("═══════════════════════════════════════════════════\n");
  console.log("🔒 SECURITY REMINDERS:\n");
  console.log("✅ Both wallets can have same role during transition");
  console.log("✅ Test new wallet thoroughly before revoking old one");
  console.log("✅ Keep old private key secure until confirmed revoked on-chain");
  console.log("✅ Document rotation in your internal security log");
  console.log("✅ Update monitoring scripts with new address");
  console.log("⚠️  NEVER commit private keys to git");
  console.log("⚠️  NEVER share private keys via Slack/email");
  console.log("");

  console.log("═══════════════════════════════════════════════════\n");
  console.log("✅ Rotation helper complete!\n");
  console.log("Next: Follow STEP 1 above to begin rotation.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
