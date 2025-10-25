import { expect } from "chai";
import { ethers } from "hardhat";
import { SoulaaniCoin } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SoulaaniCoin (SC)", function () {
  let sc: SoulaaniCoin;
  let admin: SignerWithAddress;
  let governanceBot: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let attacker: SignerWithAddress;

  const GOVERNANCE_AWARD = ethers.id("GOVERNANCE_AWARD");
  const GOVERNANCE_SLASH = ethers.id("GOVERNANCE_SLASH");
  const MEMBER_MANAGER = ethers.id("MEMBER_MANAGER");
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  const REASON_RENT = ethers.id("RENT_PAYMENT");
  const REASON_SPENDING = ethers.id("BUSINESS_SPENDING");
  const REASON_COMMUNITY_SERVICE = ethers.id("COMMUNITY_SERVICE");
  const REASON_INACTIVITY = ethers.id("INACTIVITY_DECAY");

  beforeEach(async function () {
    [admin, governanceBot, member1, member2, member3, attacker] = await ethers.getSigners();

    // Deploy SoulaaniCoin
    const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
    sc = await SoulaaniCoin.deploy(governanceBot.address);
    await sc.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await sc.name()).to.equal("SoulaaniCoin");
      expect(await sc.symbol()).to.equal("SC");
    });

    it("Should set the correct decimals", async function () {
      expect(await sc.decimals()).to.equal(18);
    });

    it("Should grant governance bot all roles initially", async function () {
      expect(await sc.hasRole(DEFAULT_ADMIN_ROLE, governanceBot.address)).to.be.true;
      expect(await sc.hasRole(GOVERNANCE_AWARD, governanceBot.address)).to.be.true;
      expect(await sc.hasRole(GOVERNANCE_SLASH, governanceBot.address)).to.be.true;
      expect(await sc.hasRole(MEMBER_MANAGER, governanceBot.address)).to.be.true;
    });

    it("Should start with zero total supply", async function () {
      expect(await sc.totalSupply()).to.equal(0);
    });

    it("Should revert if deployed with zero address", async function () {
      const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
      await expect(SoulaaniCoin.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Admin cannot be zero address"
      );
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant GOVERNANCE_AWARD role", async function () {
      await sc.connect(governanceBot).grantRole(GOVERNANCE_AWARD, admin.address);
      expect(await sc.hasRole(GOVERNANCE_AWARD, admin.address)).to.be.true;
    });

    it("Should allow admin to grant GOVERNANCE_SLASH role", async function () {
      await sc.connect(governanceBot).grantRole(GOVERNANCE_SLASH, admin.address);
      expect(await sc.hasRole(GOVERNANCE_SLASH, admin.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      await sc.connect(governanceBot).grantRole(GOVERNANCE_AWARD, admin.address);
      await sc.connect(governanceBot).revokeRole(GOVERNANCE_AWARD, admin.address);
      expect(await sc.hasRole(GOVERNANCE_AWARD, admin.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(sc.connect(member1).grantRole(GOVERNANCE_AWARD, member2.address)).to.be.reverted;
    });
  });

  describe("Membership Management", function () {
    it("Should allow MEMBER_MANAGER to add a member", async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      expect(await sc.isActiveMember(member1.address)).to.be.true;
      expect(await sc.isMember(member1.address)).to.be.true;
    });

    it("Should emit MemberAdded and MemberStatusChanged events", async function () {
      const tx = await sc.connect(governanceBot).addMember(member1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(sc, "MemberAdded")
        .withArgs(member1.address, block!.timestamp, governanceBot.address);
    });

    it("Should add members in batch", async function () {
      await sc
        .connect(governanceBot)
        .addMembersBatch([member1.address, member2.address, member3.address]);

      expect(await sc.isActiveMember(member1.address)).to.be.true;
      expect(await sc.isActiveMember(member2.address)).to.be.true;
      expect(await sc.isActiveMember(member3.address)).to.be.true;
    });

    it("Should suspend a member", async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).suspendMember(member1.address);

      expect(await sc.isActiveMember(member1.address)).to.be.false;
      expect(await sc.isMember(member1.address)).to.be.true;
    });

    it("Should reactivate a suspended member", async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).suspendMember(member1.address);
      await sc.connect(governanceBot).reactivateMember(member1.address);

      expect(await sc.isActiveMember(member1.address)).to.be.true;
    });

    it("Should ban a member", async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).banMember(member1.address);

      expect(await sc.isActiveMember(member1.address)).to.be.false;
      expect(await sc.isMember(member1.address)).to.be.true;
    });

    it("Should not allow awarding to non-active member", async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).suspendMember(member1.address);

      await expect(
        sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT)
      ).to.be.revertedWith("Recipient must be an active member");
    });

    it("Should not allow adding zero address", async function () {
      await expect(sc.connect(governanceBot).addMember(ethers.ZeroAddress)).to.be.revertedWith(
        "Cannot add zero address"
      );
    });

    it("Should not allow adding member twice", async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await expect(sc.connect(governanceBot).addMember(member1.address)).to.be.revertedWith(
        "Already a member or has status"
      );
    });

    it("Should not allow non-MEMBER_MANAGER to add members", async function () {
      await expect(sc.connect(member1).addMember(member2.address)).to.be.reverted;
    });
  });

  describe("Awarding SC", function () {
    beforeEach(async function () {
      // Add members before awarding
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).addMember(member2.address);
      await sc.connect(governanceBot).addMember(member3.address);
    });

    it("Should allow GOVERNANCE_AWARD to award SC", async function () {
      const amount = ethers.parseEther("10");
      await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);

      expect(await sc.balanceOf(member1.address)).to.equal(amount);
      expect(await sc.totalSupply()).to.equal(amount);
    });

    it("Should emit Awarded event", async function () {
      const amount = ethers.parseEther("10");

      await expect(sc.connect(governanceBot).award(member1.address, amount, REASON_RENT))
        .to.emit(sc, "Awarded")
        .withArgs(member1.address, amount, REASON_RENT, governanceBot.address);
    });

    it("Should update lastActivity timestamp", async function () {
      const amount = ethers.parseEther("10");
      const blockTime = await time.latest();

      await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);

      const lastActivity = await sc.lastActivity(member1.address);
      expect(lastActivity).to.be.closeTo(blockTime, 5); // Within 5 seconds
    });

    it("Should allow multiple awards to same address", async function () {
      const amount1 = ethers.parseEther("10");
      const amount2 = ethers.parseEther("5");

      await sc.connect(governanceBot).award(member1.address, amount1, REASON_RENT);
      await sc.connect(governanceBot).award(member1.address, amount2, REASON_SPENDING);

      expect(await sc.balanceOf(member1.address)).to.equal(amount1 + amount2);
    });

    it("Should allow awards to multiple addresses", async function () {
      const amount = ethers.parseEther("10");

      await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);
      await sc.connect(governanceBot).award(member2.address, amount, REASON_RENT);
      await sc.connect(governanceBot).award(member3.address, amount, REASON_RENT);

      expect(await sc.totalSupply()).to.equal(amount * 3n);
    });

    it("Should not allow awarding to zero address", async function () {
      await expect(
        sc.connect(governanceBot).award(ethers.ZeroAddress, ethers.parseEther("10"), REASON_RENT)
      ).to.be.revertedWith("Cannot award to zero address");
    });

    it("Should not allow awarding zero amount", async function () {
      await expect(
        sc.connect(governanceBot).award(member1.address, 0, REASON_RENT)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow non-GOVERNANCE_AWARD to award SC", async function () {
      await expect(sc.connect(member1).award(member2.address, ethers.parseEther("10"), REASON_RENT))
        .to.be.reverted;
    });
  });

  describe("Slashing SC", function () {
    const initialAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Add member and award SC
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).award(member1.address, initialAmount, REASON_RENT);
    });

    it("Should allow GOVERNANCE_SLASH to slash SC", async function () {
      const slashAmount = ethers.parseEther("10");
      await sc.connect(governanceBot).slash(member1.address, slashAmount, REASON_INACTIVITY);

      expect(await sc.balanceOf(member1.address)).to.equal(initialAmount - slashAmount);
    });

    it("Should emit Slashed event", async function () {
      const slashAmount = ethers.parseEther("10");

      await expect(sc.connect(governanceBot).slash(member1.address, slashAmount, REASON_INACTIVITY))
        .to.emit(sc, "Slashed")
        .withArgs(member1.address, slashAmount, REASON_INACTIVITY, governanceBot.address);
    });

    it("Should allow slashing entire balance", async function () {
      await sc.connect(governanceBot).slash(member1.address, initialAmount, REASON_INACTIVITY);
      expect(await sc.balanceOf(member1.address)).to.equal(0);
    });

    it("Should reduce total supply when slashing", async function () {
      const slashAmount = ethers.parseEther("10");
      const initialSupply = await sc.totalSupply();

      await sc.connect(governanceBot).slash(member1.address, slashAmount, REASON_INACTIVITY);

      expect(await sc.totalSupply()).to.equal(initialSupply - slashAmount);
    });

    it("Should not allow slashing zero address", async function () {
      await expect(
        sc
          .connect(governanceBot)
          .slash(ethers.ZeroAddress, ethers.parseEther("10"), REASON_INACTIVITY)
      ).to.be.revertedWith("Cannot slash zero address");
    });

    it("Should not allow slashing zero amount", async function () {
      await expect(
        sc.connect(governanceBot).slash(member1.address, 0, REASON_INACTIVITY)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow slashing more than balance", async function () {
      const slashAmount = initialAmount + ethers.parseEther("1");

      await expect(
        sc.connect(governanceBot).slash(member1.address, slashAmount, REASON_INACTIVITY)
      ).to.be.revertedWith("Insufficient balance to slash");
    });

    it("Should not allow non-GOVERNANCE_SLASH to slash SC", async function () {
      await expect(
        sc.connect(member2).slash(member1.address, ethers.parseEther("10"), REASON_INACTIVITY)
      ).to.be.reverted;
    });
  });

  describe("Activity Tracking (Legacy)", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).addMember(member2.address);
    });

    it("Should update activity when awarding SC", async function () {
      const beforeTime = await time.latest();

      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);

      const afterTime = await time.latest();
      const lastActivity = await sc.lastActivity(member1.address);

      expect(lastActivity).to.be.gte(beforeTime);
      expect(lastActivity).to.be.lte(afterTime);
    });

    it("Should allow manual activity update", async function () {
      await sc.connect(governanceBot).updateActivity(member1.address);

      const lastActivity = await sc.lastActivity(member1.address);
      expect(lastActivity).to.be.gt(0);
    });

    it("Should update activity timestamp on subsequent awards", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);
      const firstActivity = await sc.lastActivity(member1.address);

      // Wait some time
      await time.increase(3600); // 1 hour

      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("5"), REASON_SPENDING);
      const secondActivity = await sc.lastActivity(member1.address);

      expect(secondActivity).to.be.gt(firstActivity);
    });

    it("Should return zero for never-active address", async function () {
      const timeSince = await sc.getTimeSinceLastActivity(member1.address);
      expect(timeSince).to.equal(0);
    });

    it("Should calculate time since last activity correctly", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);

      const waitTime = 7200; // 2 hours
      await time.increase(waitTime);

      const timeSince = await sc.getTimeSinceLastActivity(member1.address);
      expect(timeSince).to.be.closeTo(waitTime, 5);
    });

    it("Should not allow non-GOVERNANCE_AWARD to update activity", async function () {
      await expect(sc.connect(member1).updateActivity(member2.address)).to.be.reverted;
    });

    it("Should not allow updating activity for zero address", async function () {
      await expect(sc.connect(governanceBot).updateActivity(ethers.ZeroAddress)).to.be.revertedWith(
        "Cannot update zero address"
      );
    });
  });

  describe("Soulbound (Non-Transferable) Enforcement", function () {
    const amount = ethers.parseEther("100");

    beforeEach(async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).addMember(member2.address);
      await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);
    });

    it("Should block transfer", async function () {
      await expect(
        sc.connect(member1).transfer(member2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("SC is non-transferable (soulbound)");
    });

    it("Should block transferFrom", async function () {
      await expect(
        sc.connect(member2).transferFrom(member1.address, member2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("SC is non-transferable (soulbound)");
    });

    it("Should block approve", async function () {
      await expect(
        sc.connect(member1).approve(member2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("SC is non-transferable (soulbound)");
    });

    it("Should return zero for allowance", async function () {
      expect(await sc.allowance(member1.address, member2.address)).to.equal(0);
    });

    it("Should block increaseAllowance", async function () {
      await expect(
        sc.connect(member1).increaseAllowance(member2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("SC is non-transferable (soulbound)");
    });

    it("Should block decreaseAllowance", async function () {
      await expect(
        sc.connect(member1).decreaseAllowance(member2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("SC is non-transferable (soulbound)");
    });
  });

  describe("Inactivity Decay Scenario", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMember(member1.address);
    });

    it("Should simulate decay detection and slashing after 12 months", async function () {
      const amount = ethers.parseEther("100");

      // Member earns SC
      await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);

      // Fast forward 12 months (365 days)
      await time.increase(365 * 24 * 60 * 60);

      // Check if inactive
      const timeSinceActive = await sc.getTimeSinceLastActivity(member1.address);
      const twelveMonths = 365 * 24 * 60 * 60;
      expect(timeSinceActive).to.be.gte(twelveMonths);

      // Slash for inactivity
      await sc.connect(governanceBot).slash(member1.address, amount, REASON_INACTIVITY);

      expect(await sc.balanceOf(member1.address)).to.equal(0);
    });

    it("Should not decay if member remains active", async function () {
      const amount = ethers.parseEther("50");

      // Member earns SC
      await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);

      // Fast forward 6 months
      await time.increase(180 * 24 * 60 * 60);

      // Member earns more SC (resets activity)
      await sc.connect(governanceBot).award(member1.address, amount, REASON_SPENDING);

      // Fast forward another 6 months (12 months total, but activity was reset)
      await time.increase(180 * 24 * 60 * 60);

      // Check time since last activity (should be ~6 months, not 12)
      const timeSince = await sc.getTimeSinceLastActivity(member1.address);
      const sixMonths = 180 * 24 * 60 * 60;
      expect(timeSince).to.be.closeTo(sixMonths, 100);
    });
  });

  describe("Edge Cases & Attack Vectors", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).addMember(member2.address);
      await sc.connect(governanceBot).addMember(member3.address);
    });

    it("Should handle awarding to same address multiple times in quick succession", async function () {
      const amount = ethers.parseEther("10");

      for (let i = 0; i < 10; i++) {
        await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);
      }

      expect(await sc.balanceOf(member1.address)).to.equal(amount * 10n);
    });

    it("Should prevent unauthorized access after role revocation", async function () {
      // Grant and then revoke GOVERNANCE_AWARD
      await sc.connect(governanceBot).grantRole(GOVERNANCE_AWARD, admin.address);
      await sc.connect(governanceBot).revokeRole(GOVERNANCE_AWARD, admin.address);

      await expect(sc.connect(admin).award(member1.address, ethers.parseEther("10"), REASON_RENT))
        .to.be.reverted;
    });

    it("Should handle slashing when balance is exactly zero", async function () {
      // Award and then slash everything
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc
        .connect(governanceBot)
        .slash(member1.address, ethers.parseEther("100"), REASON_INACTIVITY);

      // Try to slash again
      await expect(
        sc.connect(governanceBot).slash(member1.address, ethers.parseEther("1"), REASON_INACTIVITY)
      ).to.be.revertedWith("Insufficient balance to slash");
    });

    it("Should maintain separate balances for different users", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc.connect(governanceBot).award(member2.address, ethers.parseEther("200"), REASON_RENT);
      await sc.connect(governanceBot).award(member3.address, ethers.parseEther("300"), REASON_RENT);

      expect(await sc.balanceOf(member1.address)).to.equal(ethers.parseEther("100"));
      expect(await sc.balanceOf(member2.address)).to.equal(ethers.parseEther("200"));
      expect(await sc.balanceOf(member3.address)).to.equal(ethers.parseEther("300"));
      expect(await sc.totalSupply()).to.equal(ethers.parseEther("600"));
    });

    it("Should handle large award amounts", async function () {
      const largeAmount = ethers.parseEther("1000000"); // 1 million SC
      await sc.connect(governanceBot).award(member1.address, largeAmount, REASON_RENT);

      expect(await sc.balanceOf(member1.address)).to.equal(largeAmount);
    });

    it("Should correctly emit events with different reasons", async function () {
      const reasons = [REASON_RENT, REASON_SPENDING, ethers.id("CUSTOM_REASON")];

      for (const reason of reasons) {
        await expect(
          sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), reason)
        )
          .to.emit(sc, "Awarded")
          .withArgs(member1.address, ethers.parseEther("10"), reason, governanceBot.address);
      }
    });
  });

  describe("Activity Tracking", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).addMember(member2.address);
    });

    it("Should track total activities per member", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);
      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("5"), REASON_SPENDING);
      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("3"), REASON_COMMUNITY_SERVICE);

      expect(await sc.totalActivities(member1.address)).to.equal(3);
    });

    it("Should track activity type counts", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);
      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("5"), REASON_SPENDING);

      expect(await sc.activityTypeCount(member1.address, REASON_RENT)).to.equal(2);
      expect(await sc.activityTypeCount(member1.address, REASON_SPENDING)).to.equal(1);
    });

    it("Should return activity stats", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);
      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("5"), REASON_SPENDING);

      const stats = await sc.getActivityStats(member1.address);
      expect(stats.total).to.equal(2);
      expect(stats.lastActive).to.be.gt(0);
    });

    it("Should get activity type count via function", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT);

      const count = await sc.getActivityTypeCount(member1.address, REASON_RENT);
      expect(count).to.equal(2);
    });
  });

  describe("Voting Power", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).addMember(member2.address);
      await sc.connect(governanceBot).addMember(member3.address);
    });

    it("Should return balance as voting power when below cap", async function () {
      // Award 100 SC (total supply = 100, 2% = 2, so user gets capped)
      // Let's award 1 SC instead so user is below cap
      const amount = ethers.parseEther("1");
      await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);

      // Since member1 has 1 SC and total supply is 1, 2% cap is 0.02
      // So member1's balance (1) is above cap and gets capped to 0.02
      // Actually, we need total supply to be higher to test below cap

      // Award more to another member to increase total supply
      await sc
        .connect(governanceBot)
        .award(member2.address, ethers.parseEther("1000"), REASON_RENT);

      // Now total supply is 1001, 2% = 20.02
      // Member1 has 1 which is below 20.02, so they get their full balance
      expect(await sc.getVotingPower(member1.address)).to.equal(amount);
    });

    it("Should cap voting power at 2% of total supply", async function () {
      // Create total supply of 10,000 SC
      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("5000"), REASON_RENT);
      await sc
        .connect(governanceBot)
        .award(member2.address, ethers.parseEther("5000"), REASON_RENT);

      const totalSupply = await sc.totalSupply();
      const maxVotingPower = await sc.getMaxVotingPower();

      // Max voting power should be 2% of 10,000 = 200 SC
      expect(maxVotingPower).to.equal(ethers.parseEther("200"));

      // member1 has 5000 SC but voting power is capped at 200
      expect(await sc.getVotingPower(member1.address)).to.equal(maxVotingPower);
    });

    it("Should return correct max voting power", async function () {
      // Award 10,000 SC total
      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("10000"), REASON_RENT);

      // 2% of 10,000 = 200
      expect(await sc.getMaxVotingPower()).to.equal(ethers.parseEther("200"));
    });

    it("Should return zero max voting power when supply is zero", async function () {
      expect(await sc.getMaxVotingPower()).to.equal(0);
    });

    it("Should correctly identify members at voting power cap", async function () {
      // Create supply and give member1 more than 2%
      await sc
        .connect(governanceBot)
        .award(member1.address, ethers.parseEther("1000"), REASON_RENT);
      await sc
        .connect(governanceBot)
        .award(member2.address, ethers.parseEther("9000"), REASON_RENT);

      // member2 has 9000/10000 = 90%, definitely at cap
      expect(await sc.isAtVotingPowerCap(member2.address)).to.be.true;

      // member1 has 1000/10000 = 10%, also at cap (cap is 2% = 200)
      expect(await sc.isAtVotingPowerCap(member1.address)).to.be.true;
    });

    it("Should correctly identify members not at cap", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc
        .connect(governanceBot)
        .award(member2.address, ethers.parseEther("9900"), REASON_RENT);

      // member1 has 100 SC, cap is 200, so not at cap
      expect(await sc.isAtVotingPowerCap(member1.address)).to.be.false;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMember(member1.address);
      await sc.connect(governanceBot).addMember(member2.address);
    });

    it("Should return correct balance", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      expect(await sc.balanceOf(member1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should return correct total supply", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc.connect(governanceBot).award(member2.address, ethers.parseEther("200"), REASON_RENT);
      expect(await sc.totalSupply()).to.equal(ethers.parseEther("300"));
    });

    it("Should return correct name and symbol", async function () {
      expect(await sc.name()).to.equal("SoulaaniCoin");
      expect(await sc.symbol()).to.equal("SC");
    });

    it("Should return correct membership status", async function () {
      expect(await sc.isActiveMember(member1.address)).to.be.true;
      expect(await sc.isMember(member1.address)).to.be.true;

      await sc.connect(governanceBot).suspendMember(member1.address);
      expect(await sc.isActiveMember(member1.address)).to.be.false;
      expect(await sc.isMember(member1.address)).to.be.true;
    });
  });

  describe("Admin Functions - Voting Power Cap", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMembersBatch([member1.address, member2.address]);
    });

    it("Should allow admin to change voting power cap", async function () {
      await sc.connect(governanceBot).setMaxVotingPowerPercent(5);
      expect(await sc.maxVotingPowerPercent()).to.equal(5);
    });

    it("Should emit VotingPowerCapChanged event", async function () {
      await expect(sc.connect(governanceBot).setMaxVotingPowerPercent(5))
        .to.emit(sc, "VotingPowerCapChanged")
        .withArgs(2, 5, governanceBot.address);
    });

    it("Should enforce new cap on voting power", async function () {
      // Award 100 tokens (total supply = 100, 2% = 2 tokens)
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      expect(await sc.getVotingPower(member1.address)).to.equal(ethers.parseEther("2"));

      // Change cap to 5%
      await sc.connect(governanceBot).setMaxVotingPowerPercent(5);
      expect(await sc.getVotingPower(member1.address)).to.equal(ethers.parseEther("5"));
    });

    it("Should revert if percent is 0", async function () {
      await expect(sc.connect(governanceBot).setMaxVotingPowerPercent(0)).to.be.revertedWith(
        "Percent must be between 1 and 10"
      );
    });

    it("Should revert if percent is > 10", async function () {
      await expect(sc.connect(governanceBot).setMaxVotingPowerPercent(11)).to.be.revertedWith(
        "Percent must be between 1 and 10"
      );
    });

    it("Should not allow non-admin to change cap", async function () {
      await expect(sc.connect(member1).setMaxVotingPowerPercent(5)).to.be.reverted;
    });
  });

  describe("Admin Functions - Award and Slash Limits", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMembersBatch([member1.address, member2.address]);
    });

    it("Should allow unlimited awards by default", async function () {
      expect(await sc.maxAwardPerTransaction()).to.equal(0);
      await expect(
        sc.connect(governanceBot).award(member1.address, ethers.parseEther("1000000"), REASON_RENT)
      ).to.not.be.reverted;
    });

    it("Should allow admin to set award limit", async function () {
      await sc.connect(governanceBot).setMaxAwardPerTransaction(ethers.parseEther("100"));
      expect(await sc.maxAwardPerTransaction()).to.equal(ethers.parseEther("100"));
    });

    it("Should emit AwardLimitChanged event", async function () {
      await expect(sc.connect(governanceBot).setMaxAwardPerTransaction(ethers.parseEther("100")))
        .to.emit(sc, "AwardLimitChanged")
        .withArgs(0, ethers.parseEther("100"), governanceBot.address);
    });

    it("Should enforce award limit", async function () {
      await sc.connect(governanceBot).setMaxAwardPerTransaction(ethers.parseEther("100"));

      await expect(
        sc.connect(governanceBot).award(member1.address, ethers.parseEther("101"), REASON_RENT)
      ).to.be.revertedWith("Amount exceeds max award limit");

      await expect(
        sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT)
      ).to.not.be.reverted;
    });

    it("Should allow admin to set slash limit", async function () {
      await sc.connect(governanceBot).setMaxSlashPerTransaction(ethers.parseEther("50"));
      expect(await sc.maxSlashPerTransaction()).to.equal(ethers.parseEther("50"));
    });

    it("Should emit SlashLimitChanged event", async function () {
      await expect(sc.connect(governanceBot).setMaxSlashPerTransaction(ethers.parseEther("50")))
        .to.emit(sc, "SlashLimitChanged")
        .withArgs(0, ethers.parseEther("50"), governanceBot.address);
    });

    it("Should enforce slash limit", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("200"), REASON_RENT);
      await sc.connect(governanceBot).setMaxSlashPerTransaction(ethers.parseEther("50"));

      await expect(
        sc.connect(governanceBot).slash(member1.address, ethers.parseEther("51"), REASON_INACTIVITY)
      ).to.be.revertedWith("Amount exceeds max slash limit");

      await expect(
        sc.connect(governanceBot).slash(member1.address, ethers.parseEther("50"), REASON_INACTIVITY)
      ).to.not.be.reverted;
    });

    it("Should allow setting limit to 0 (unlimited)", async function () {
      await sc.connect(governanceBot).setMaxAwardPerTransaction(ethers.parseEther("100"));
      await sc.connect(governanceBot).setMaxAwardPerTransaction(0);

      await expect(
        sc.connect(governanceBot).award(member1.address, ethers.parseEther("1000000"), REASON_RENT)
      ).to.not.be.reverted;
    });

    it("Should not allow non-admin to set limits", async function () {
      await expect(sc.connect(member1).setMaxAwardPerTransaction(ethers.parseEther("100"))).to.be
        .reverted;

      await expect(sc.connect(member1).setMaxSlashPerTransaction(ethers.parseEther("50"))).to.be
        .reverted;
    });
  });

  describe("Admin Functions - Pause/Unpause", function () {
    beforeEach(async function () {
      await sc.connect(governanceBot).addMembersBatch([member1.address, member2.address]);
    });

    it("Should allow admin to pause contract", async function () {
      await sc.connect(governanceBot).pause();
      expect(await sc.paused()).to.be.true;
    });

    it("Should emit Paused event", async function () {
      await expect(sc.connect(governanceBot).pause())
        .to.emit(sc, "Paused")
        .withArgs(governanceBot.address);
    });

    it("Should block awards when paused", async function () {
      await sc.connect(governanceBot).pause();

      await expect(
        sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT)
      ).to.be.revertedWithCustomError(sc, "EnforcedPause");
    });

    it("Should block slashing when paused", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc.connect(governanceBot).pause();

      await expect(
        sc.connect(governanceBot).slash(member1.address, ethers.parseEther("10"), REASON_INACTIVITY)
      ).to.be.revertedWithCustomError(sc, "EnforcedPause");
    });

    it("Should block batch slashing when paused", async function () {
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc.connect(governanceBot).pause();

      await expect(
        sc
          .connect(governanceBot)
          .slashBatch([member1.address], [ethers.parseEther("10")], REASON_INACTIVITY)
      ).to.be.revertedWithCustomError(sc, "EnforcedPause");
    });

    it("Should allow admin to unpause contract", async function () {
      await sc.connect(governanceBot).pause();
      await sc.connect(governanceBot).unpause();
      expect(await sc.paused()).to.be.false;
    });

    it("Should emit Unpaused event", async function () {
      await sc.connect(governanceBot).pause();
      await expect(sc.connect(governanceBot).unpause())
        .to.emit(sc, "Unpaused")
        .withArgs(governanceBot.address);
    });

    it("Should allow awards after unpause", async function () {
      await sc.connect(governanceBot).pause();
      await sc.connect(governanceBot).unpause();

      await expect(
        sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), REASON_RENT)
      ).to.not.be.reverted;
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(sc.connect(member1).pause()).to.be.reverted;
    });

    it("Should not allow non-admin to unpause", async function () {
      await sc.connect(governanceBot).pause();
      await expect(sc.connect(member1).unpause()).to.be.reverted;
    });
  });

  describe("Batch Slashing", function () {
    beforeEach(async function () {
      await sc
        .connect(governanceBot)
        .addMembersBatch([member1.address, member2.address, member3.address]);
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc.connect(governanceBot).award(member2.address, ethers.parseEther("200"), REASON_RENT);
      await sc.connect(governanceBot).award(member3.address, ethers.parseEther("150"), REASON_RENT);
    });

    it("Should slash multiple members in batch", async function () {
      await sc
        .connect(governanceBot)
        .slashBatch(
          [member1.address, member2.address],
          [ethers.parseEther("10"), ethers.parseEther("20")],
          REASON_INACTIVITY
        );

      expect(await sc.balanceOf(member1.address)).to.equal(ethers.parseEther("90"));
      expect(await sc.balanceOf(member2.address)).to.equal(ethers.parseEther("180"));
    });

    it("Should emit Slashed events for each member", async function () {
      await expect(
        sc
          .connect(governanceBot)
          .slashBatch(
            [member1.address, member2.address],
            [ethers.parseEther("10"), ethers.parseEther("20")],
            REASON_INACTIVITY
          )
      )
        .to.emit(sc, "Slashed")
        .withArgs(
          member1.address,
          ethers.parseEther("10"),
          REASON_INACTIVITY,
          governanceBot.address
        )
        .to.emit(sc, "Slashed")
        .withArgs(
          member2.address,
          ethers.parseEther("20"),
          REASON_INACTIVITY,
          governanceBot.address
        );
    });

    it("Should revert if arrays length mismatch", async function () {
      await expect(
        sc
          .connect(governanceBot)
          .slashBatch(
            [member1.address, member2.address],
            [ethers.parseEther("10")],
            REASON_INACTIVITY
          )
      ).to.be.revertedWith("Array length mismatch");
    });

    it("Should revert if arrays are empty", async function () {
      await expect(
        sc.connect(governanceBot).slashBatch([], [], REASON_INACTIVITY)
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should revert if any member has insufficient balance", async function () {
      await expect(
        sc
          .connect(governanceBot)
          .slashBatch(
            [member1.address, member2.address],
            [ethers.parseEther("200"), ethers.parseEther("20")],
            REASON_INACTIVITY
          )
      ).to.be.revertedWith("Insufficient balance to slash");
    });

    it("Should enforce slash limit in batch", async function () {
      await sc.connect(governanceBot).setMaxSlashPerTransaction(ethers.parseEther("50"));

      await expect(
        sc
          .connect(governanceBot)
          .slashBatch(
            [member1.address, member2.address],
            [ethers.parseEther("60"), ethers.parseEther("20")],
            REASON_INACTIVITY
          )
      ).to.be.revertedWith("Amount exceeds max slash limit");
    });

    it("Should not allow non-governance to batch slash", async function () {
      await expect(
        sc
          .connect(member1)
          .slashBatch([member2.address], [ethers.parseEther("10")], REASON_INACTIVITY)
      ).to.be.reverted;
    });
  });

  describe("Ownership Transfer", function () {
    it("Should allow admin to initiate ownership transfer", async function () {
      await sc.connect(governanceBot).initiateOwnershipTransfer(admin.address);
      expect(await sc.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await sc.hasRole(DEFAULT_ADMIN_ROLE, governanceBot.address)).to.be.true;
    });

    it("Should emit OwnershipTransferInitiated event", async function () {
      const tx = await sc.connect(governanceBot).initiateOwnershipTransfer(admin.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(sc, "OwnershipTransferInitiated")
        .withArgs(governanceBot.address, admin.address, block!.timestamp);
    });

    it("Should allow old admin to complete transfer", async function () {
      await sc.connect(governanceBot).initiateOwnershipTransfer(admin.address);
      await sc.connect(governanceBot).completeOwnershipTransfer();

      expect(await sc.hasRole(DEFAULT_ADMIN_ROLE, governanceBot.address)).to.be.false;
      expect(await sc.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should emit OwnershipTransferCompleted event", async function () {
      await sc.connect(governanceBot).initiateOwnershipTransfer(admin.address);

      const tx = await sc.connect(governanceBot).completeOwnershipTransfer();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(sc, "OwnershipTransferCompleted")
        .withArgs(governanceBot.address, block!.timestamp);
    });

    it("Should revert if transferring to zero address", async function () {
      await expect(
        sc.connect(governanceBot).initiateOwnershipTransfer(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot transfer to zero address");
    });

    it("Should revert if address already has admin role", async function () {
      await expect(
        sc.connect(governanceBot).initiateOwnershipTransfer(governanceBot.address)
      ).to.be.revertedWith("Address already has admin role");
    });

    it("Should revert if completing transfer with no other admin", async function () {
      await expect(sc.connect(governanceBot).completeOwnershipTransfer()).to.be.revertedWith(
        "Would leave contract without admin"
      );
    });

    it("Should not allow non-admin to initiate transfer", async function () {
      await expect(sc.connect(member1).initiateOwnershipTransfer(admin.address)).to.be.reverted;
    });

    it("Should allow new admin to manage contract after transfer", async function () {
      await sc.connect(governanceBot).initiateOwnershipTransfer(admin.address);
      await sc.connect(governanceBot).completeOwnershipTransfer();

      // New admin should be able to grant roles
      await expect(sc.connect(admin).grantRole(GOVERNANCE_AWARD, member1.address)).to.not.be
        .reverted;
    });
  });
});
