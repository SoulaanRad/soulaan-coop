/**
 * InitializerFlow.test.ts
 *
 * Tests the exact sequence the web UI's "Initialize Admin" step performs:
 *   1. Deploy SoulaaniCoin with a separate governanceBot address
 *   2. Deployer checks their memberStatus (uint8 enum — returns number, not BigInt)
 *   3. Deployer calls addMember(deployer)
 *   4. Deployer checks their GOVERNANCE_AWARD role
 *   5. Deployer calls mintReward(deployer, 100_000 SC, keccak256("INITIAL_RESERVE_SEED"))
 *   6. Verify deployer is an active member with 100,000 SC
 *
 * This mirrors the bug where `memberStatus` returns a plain number (0) and the
 * web UI was checking `deployerStatus === 0n` (BigInt), which is always false,
 * causing addMember to be skipped and mintReward to revert with NotActiveMember.
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { SoulaaniCoin } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("InitializerFlow — web UI admin initialization sequence", function () {
  let sc: SoulaaniCoin;
  let deployer: SignerWithAddress;
  let governanceBot: SignerWithAddress;

  const GOVERNANCE_AWARD = ethers.id("GOVERNANCE_AWARD");
  const MEMBER_MANAGER   = ethers.id("MEMBER_MANAGER");
  const SEED_REASON      = ethers.id("INITIAL_RESERVE_SEED");
  const SEED_AMOUNT      = ethers.parseEther("100000"); // 100,000 SC

  beforeEach(async function () {
    [deployer, governanceBot] = await ethers.getSigners();

    // Deploy with governanceBot as admin (not deployer) — this is the real-world case
    const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
    sc = await SoulaaniCoin.deploy(governanceBot.address);
    await sc.waitForDeployment();
  });

  // ─── Reproduce the bug ───────────────────────────────────────────────────────

  it("Number(memberStatus) === 0 is safe regardless of whether the runtime returns BigInt or number", async function () {
    const status = await sc.memberStatus(deployer.address);

    // Hardhat/ethers.js returns BigInt for uint8 enums (status === 0n is true here).
    // viem on mainnet returns a plain JS number for uint8 enums (status === 0n is false there).
    //
    // The web UI bug was using `deployerStatus === 0n`, which always returned false
    // when viem returned a plain number, causing addMember to be silently skipped.
    //
    // The fix: Number(status) === 0 is safe in BOTH environments.
    expect(Number(status) === 0).to.equal(true, "Number(status) === 0 works whether status is 0 or 0n");

    // Also verify loose equality works as an alternative
    // eslint-disable-next-line eqeqeq
    expect(status == 0).to.equal(true, "loose equality also handles both cases");
  });

  // ─── Full happy path (mirrors web UI Step 9) ─────────────────────────────────

  it("deployer can addMember + mintReward when governance bot is different address", async function () {
    // Step A: deployer does NOT have GOVERNANCE_AWARD or MEMBER_MANAGER initially
    expect(await sc.hasRole(GOVERNANCE_AWARD, deployer.address)).to.be.false;
    expect(await sc.hasRole(MEMBER_MANAGER,   deployer.address)).to.be.false;

    // Step B: read memberStatus — should be 0 (NotMember)
    const statusRaw = await sc.memberStatus(deployer.address);
    expect(Number(statusRaw)).to.equal(0);

    // Step C: governanceBot grants deployer MEMBER_MANAGER so they can addMember
    await sc.connect(governanceBot).grantRole(MEMBER_MANAGER, deployer.address);

    // Step D: deployer adds themselves as a member
    await sc.connect(deployer).addMember(deployer.address);
    expect(await sc.isActiveMember(deployer.address)).to.be.true;

    // Step E: governanceBot grants deployer GOVERNANCE_AWARD so they can mint
    await sc.connect(governanceBot).grantRole(GOVERNANCE_AWARD, deployer.address);

    // Step F: deployer mints initial 100,000 SC seed to themselves
    await sc.connect(deployer).mintReward(deployer.address, SEED_AMOUNT, SEED_REASON);

    const balance = await sc.balanceOf(deployer.address);
    expect(balance).to.equal(SEED_AMOUNT);
    expect(await sc.isActiveMember(deployer.address)).to.be.true;
  });

  it("mintReward reverts with NotActiveMember when addMember was skipped", async function () {
    // Simulate the bug: governanceBot grants the role but addMember is never called
    await sc.connect(governanceBot).grantRole(GOVERNANCE_AWARD, deployer.address);

    // Deployer is NOT a member — mintReward should revert
    await expect(
      sc.connect(deployer).mintReward(deployer.address, SEED_AMOUNT, SEED_REASON)
    ).to.be.revertedWithCustomError(sc, "NotActiveMember");
  });

  // ─── Case where deployer IS the governance bot ───────────────────────────────

  it("works when deployer and governanceBot are the same address", async function () {
    // Deploy with deployer as both deployer and governance bot
    const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
    const sc2 = await SoulaaniCoin.deploy(deployer.address);
    await sc2.waitForDeployment();

    // Deployer already has all roles
    expect(await sc2.hasRole(GOVERNANCE_AWARD, deployer.address)).to.be.true;
    expect(await sc2.hasRole(MEMBER_MANAGER,   deployer.address)).to.be.true;

    // Add self as member
    await sc2.connect(deployer).addMember(deployer.address);

    // Mint seed
    await sc2.connect(deployer).mintReward(deployer.address, SEED_AMOUNT, SEED_REASON);

    expect(await sc2.balanceOf(deployer.address)).to.equal(SEED_AMOUNT);
  });

  // ─── Verify memberStatus enum values ─────────────────────────────────────────

  it("memberStatus returns 0 for NotMember, 1 for Active after addMember", async function () {
    const before = await sc.memberStatus(deployer.address);
    expect(Number(before)).to.equal(0); // NotMember

    await sc.connect(governanceBot).addMember(deployer.address);

    const after = await sc.memberStatus(deployer.address);
    expect(Number(after)).to.equal(1); // Active
  });
});
