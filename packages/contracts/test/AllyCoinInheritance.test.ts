import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { AllyCoin, SoulaaniCoin } from "../typechain-types";

describe("SoulaaniCoin inheritance and AllyCoin", function () {
  let admin: SignerWithAddress;
  let deceased: SignerWithAddress;
  let heir: SignerWithAddress;
  let allyMember: SignerWithAddress;
  let outsider: SignerWithAddress;

  let soulaaniCoin: SoulaaniCoin;
  let allyCoin: AllyCoin;

  const INHERITANCE_REASON = ethers.keccak256(ethers.toUtf8Bytes("INHERITANCE_EXECUTION"));
  const ALLY_REASON = ethers.keccak256(ethers.toUtf8Bytes("ALLY_REWARD"));
  const MEMBER_REWARD_REASON = ethers.keccak256(ethers.toUtf8Bytes("FOUNDING_CONTRIBUTION"));

  beforeEach(async function () {
    [admin, deceased, heir, allyMember, outsider] = await ethers.getSigners();

    const SoulaaniCoinFactory = await ethers.getContractFactory("SoulaaniCoin");
    soulaaniCoin = await SoulaaniCoinFactory.deploy(admin.address);
    await soulaaniCoin.waitForDeployment();

    const AllyCoinFactory = await ethers.getContractFactory("AllyCoin");
    allyCoin = await AllyCoinFactory.deploy(admin.address, await soulaaniCoin.getAddress());
    await allyCoin.waitForDeployment();

    await soulaaniCoin.setAllyCoin(
      await allyCoin.getAddress(),
      "Test setup - linking AllyCoin"
    );
  });

  it("executes inheritance for a designated beneficiary and activates the heir", async function () {
    await soulaaniCoin.addMember(deceased.address);
    await soulaaniCoin.mintReward(
      deceased.address,
      ethers.parseEther("100"),
      MEMBER_REWARD_REASON
    );

    await soulaaniCoin
      .connect(deceased)
      .setInheritanceBeneficiaries([heir.address], [10_000]);

    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE_001"));
    await soulaaniCoin.executeInheritance(
      caseId,
      deceased.address,
      heir.address,
      ethers.parseEther("40"),
      INHERITANCE_REASON
    );

    expect(await soulaaniCoin.balanceOf(deceased.address)).to.equal(ethers.parseEther("60"));
    expect(await soulaaniCoin.balanceOf(heir.address)).to.equal(ethers.parseEther("40"));
    expect(await soulaaniCoin.isActiveMember(heir.address)).to.equal(true);
    expect(await soulaaniCoin.executedInheritanceCases(caseId)).to.equal(true);
  });

  it("prevents the same inheritance case from executing twice", async function () {
    await soulaaniCoin.addMember(deceased.address);
    await soulaaniCoin.mintReward(
      deceased.address,
      ethers.parseEther("10"),
      MEMBER_REWARD_REASON
    );
    await soulaaniCoin
      .connect(deceased)
      .setInheritanceBeneficiaries([heir.address], [10_000]);

    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE_DUPLICATE"));
    await soulaaniCoin.executeInheritance(
      caseId,
      deceased.address,
      heir.address,
      ethers.parseEther("5"),
      INHERITANCE_REASON
    );

    await expect(
      soulaaniCoin.executeInheritance(
        caseId,
        deceased.address,
        heir.address,
        ethers.parseEther("1"),
        INHERITANCE_REASON
      )
    ).to.be.revertedWith("Inheritance case already executed");
  });

  it("lets SC and ALLY see each other's membership", async function () {
    await soulaaniCoin.addMember(deceased.address);
    await allyCoin.addMember(allyMember.address);

    expect(await allyCoin.isScMember(deceased.address)).to.equal(true);
    expect(await soulaaniCoin.isAllyMember(allyMember.address)).to.equal(true);
  });

  it("makes AllyCoin follow SC mint limits", async function () {
    await allyCoin.addMember(allyMember.address);
    await soulaaniCoin.setMaxAwardPerTransaction(ethers.parseEther("5"));

    await expect(
      allyCoin.mintReward(
        allyMember.address,
        ethers.parseEther("6"),
        ALLY_REASON
      )
    ).to.be.revertedWith("Amount exceeds SC-linked mint limit");

    await allyCoin.mintReward(
      allyMember.address,
      ethers.parseEther("5"),
      ALLY_REASON
    );

    expect(await allyCoin.balanceOf(allyMember.address)).to.equal(ethers.parseEther("5"));
  });

  it("keeps AllyCoin soulbound", async function () {
    await allyCoin.addMember(allyMember.address);
    await allyCoin.mintReward(
      allyMember.address,
      ethers.parseEther("1"),
      ALLY_REASON
    );

    await expect(
      allyCoin.connect(allyMember).transfer(outsider.address, ethers.parseEther("0.1"))
    ).to.be.revertedWith("ALLY is non-transferable (soulbound)");
  });
});
