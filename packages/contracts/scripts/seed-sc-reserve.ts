import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS;
const TARGET_SUPPLY = ethers.parseEther("100000"); // 100,000 SC target total supply

async function wait(ms = 2000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWithRetry(fn: () => Promise<any>, label: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (attempt < retries && (msg.includes('nonce') || msg.includes('replacement') || msg.includes('timeout'))) {
        console.warn(`   ⚠️  ${label} attempt ${attempt} failed (${msg.split('\n')[0]}), retrying in 5s...`);
        await wait(5000);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  if (!SOULAANI_COIN_ADDRESS) {
    throw new Error("SOULAANI_COIN_ADDRESS not set in .env");
  }

  const [deployer] = await ethers.getSigners();

  const sc = await ethers.getContractAt("SoulaaniCoin", SOULAANI_COIN_ADDRESS);

  const supplyBefore = await sc.totalSupply();
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  const currentCapPercent = await sc.maxVotingPowerPercent();

  console.log(`\n🌱 SC RESERVE SEED (loop strategy)`);
  console.log(`======================================================`);
  console.log(`📝 Signer:           ${deployer.address}`);
  console.log(`🪙 SoulaaniCoin:     ${SOULAANI_COIN_ADDRESS}`);
  console.log(`💰 Current supply:   ${ethers.formatEther(supplyBefore)} SC`);
  console.log(`🎯 Target supply:    100,000 SC`);
  console.log(`⚙️  Current cap:      ${currentCapPercent}%`);
  console.log(`💎 ETH balance:      ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`======================================================`);

  if (supplyBefore >= TARGET_SUPPLY) {
    console.log(`\n✅ Supply already at or above 100,000 SC. Nothing to do.`);
    return;
  }

  // Raise per-user cap to 10% (max the contract allows) so each fresh address
  // can absorb 10% of the growing supply per round. Reduces required rounds from
  // ~574 (at 2%) to ~120 (at 10%).
  if (currentCapPercent !== 10n) {
    console.log(`\n⏳ Setting cap to 10% to maximise mint per round...`);
    await wait(3000);
    const capTx = await sc.setMaxVotingPowerPercent(10n);
    await capTx.wait();
    await wait(2000);
    console.log(`✅ Cap set to 10%`);
  }

  const reason = ethers.keccak256(ethers.toUtf8Bytes("INITIAL_RESERVE_SEED"));
  let round = 0;

  try {
    while (true) {
      const currentSupply = await sc.totalSupply();
      if (currentSupply >= TARGET_SUPPLY) break;

      round++;
      const remaining = TARGET_SUPPLY - currentSupply;
      // Mint 10% of current supply (or whatever's left to reach the target)
      const mintAmount = currentSupply / 10n < remaining ? currentSupply / 10n : remaining;

      // Generate a fresh random wallet — each address starts with 0 SC so the
      // 10% cap applies cleanly without any prior balance.
      const freshWallet = ethers.Wallet.createRandom();

      // Add fresh address as member (required to receive SC)
      await sendWithRetry(async () => {
        const tx = await sc.addMember(freshWallet.address);
        return tx.wait();
      }, `addMember round ${round}`);
      await wait(2000);

      // Mint to fresh address
      await sendWithRetry(async () => {
        const tx = await sc["mintReward(address,uint256,bytes32)"](
          freshWallet.address,
          mintAmount,
          reason
        );
        return tx.wait();
      }, `mintReward round ${round}`);
      await wait(2000);

      const supplyNow = await sc.totalSupply();
      const pct = Number((supplyNow * 10000n) / TARGET_SUPPLY) / 100;
      console.log(
        `  Round ${String(round).padStart(3)}: +${ethers.formatEther(mintAmount).padStart(12)} SC → supply ${ethers.formatEther(supplyNow).padStart(14)} SC (${pct.toFixed(1)}%)`
      );
    }
  } finally {
    // Always restore the 2% cap, even if the loop errors out mid-way
    const capNow = await sc.maxVotingPowerPercent();
    if (capNow !== 2n) {
      console.log(`\n⏳ Restoring cap to 2%...`);
      await wait(2000);
      await sendWithRetry(async () => {
        const tx = await sc.setMaxVotingPowerPercent(2n);
        return tx.wait();
      }, "restore cap");
      console.log(`✅ Cap restored to 2%`);
    }
  }

  const finalSupply = await sc.totalSupply();
  const capAt2 = (finalSupply * 2n) / 100n;

  console.log(`\n✅ DONE after ${round} rounds`);
  console.log(`======================================================`);
  console.log(`Total supply:        ${ethers.formatEther(finalSupply)} SC`);
  console.log(`2% cap per user:     ~${Math.round(Number(ethers.formatEther(capAt2)))} SC`);
  console.log(`Tier 1 slowdown:     ~${Math.round(Number(ethers.formatEther(finalSupply * 5n / 1000n)))} SC (0.5%)`);
  console.log(`Tier 2 slowdown:     ~${Math.round(Number(ethers.formatEther(finalSupply * 10n / 1000n)))} SC (1.0%)`);
  console.log(`Rounds run:          ${round}`);
  const ethAfter = await ethers.provider.getBalance(deployer.address);
  console.log(`ETH used for gas:    ${ethers.formatEther(ethBalance - ethAfter)} ETH`);
  console.log(`======================================================`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed:", err.message || err);
    process.exit(1);
  });
