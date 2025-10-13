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
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  const REASON_RENT = ethers.id("RENT_PAYMENT");
  const REASON_SPENDING = ethers.id("BUSINESS_SPENDING");
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
    });

    it("Should start with zero total supply", async function () {
      expect(await sc.totalSupply()).to.equal(0);
    });

    it("Should revert if deployed with zero address", async function () {
      const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
      await expect(
        SoulaaniCoin.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Admin cannot be zero address");
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
      await expect(
        sc.connect(member1).grantRole(GOVERNANCE_AWARD, member2.address)
      ).to.be.reverted;
    });
  });

  describe("Awarding SC", function () {
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
      await expect(
        sc.connect(member1).award(member2.address, ethers.parseEther("10"), REASON_RENT)
      ).to.be.reverted;
    });
  });

  describe("Slashing SC", function () {
    const initialAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Award SC to member
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
        sc.connect(governanceBot).slash(ethers.ZeroAddress, ethers.parseEther("10"), REASON_INACTIVITY)
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

  describe("Activity Tracking", function () {
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
      
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("5"), REASON_SPENDING);
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
      await expect(
        sc.connect(member1).updateActivity(member2.address)
      ).to.be.reverted;
    });

    it("Should not allow updating activity for zero address", async function () {
      await expect(
        sc.connect(governanceBot).updateActivity(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot update zero address");
    });
  });

  describe("Soulbound (Non-Transferable) Enforcement", function () {
    const amount = ethers.parseEther("100");

    beforeEach(async function () {
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
      
      await expect(
        sc.connect(admin).award(member1.address, ethers.parseEther("10"), REASON_RENT)
      ).to.be.reverted;
    });

    it("Should handle slashing when balance is exactly zero", async function () {
      // Award and then slash everything
      await sc.connect(governanceBot).award(member1.address, ethers.parseEther("100"), REASON_RENT);
      await sc.connect(governanceBot).slash(member1.address, ethers.parseEther("100"), REASON_INACTIVITY);
      
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
        await expect(sc.connect(governanceBot).award(member1.address, ethers.parseEther("10"), reason))
          .to.emit(sc, "Awarded")
          .withArgs(member1.address, ethers.parseEther("10"), reason, governanceBot.address);
      }
    });
  });

  describe("View Functions", function () {
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
  });
});

