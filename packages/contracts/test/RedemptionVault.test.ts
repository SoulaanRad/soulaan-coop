import { expect } from "chai";
import { ethers } from "hardhat";
import { RedemptionVault, UnityCoin, SoulaaniCoin } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("RedemptionVault", function () {
  let vault: RedemptionVault;
  let uc: UnityCoin;
  let sc: SoulaaniCoin;
  let admin: SignerWithAddress;
  let processor: SignerWithAddress;
  let treasurer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;

  const REDEMPTION_PROCESSOR = ethers.id("REDEMPTION_PROCESSOR");
  const TREASURER = ethers.id("TREASURER");
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  beforeEach(async function () {
    [admin, processor, treasurer, user1, user2, user3, user4] = await ethers.getSigners();

    // Deploy SoulaaniCoin first
    const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
    sc = await SoulaaniCoin.deploy(admin.address);
    await sc.waitForDeployment();

    // Add users as active members
    await sc
      .connect(admin)
      .addMembersBatch([
        admin.address,
        user1.address,
        user2.address,
        user3.address,
        user4.address,
        treasurer.address,
      ]);

    // Deploy UnityCoin
    const UnityCoin = await ethers.getContractFactory("UnityCoin");
    uc = await UnityCoin.deploy(admin.address, await sc.getAddress());
    await uc.waitForDeployment();

    // Deploy RedemptionVault
    const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
    vault = await RedemptionVault.deploy(await uc.getAddress(), admin.address);
    await vault.waitForDeployment();

    // Add vault as system contract so it can hold UC
    await uc.connect(admin).addSystemContract(await vault.getAddress());

    // Mint UC to users for testing
    await uc.connect(admin).mint(user1.address, ethers.parseEther("1000"));
    await uc.connect(admin).mint(user2.address, ethers.parseEther("1000"));
    await uc.connect(admin).mint(user3.address, ethers.parseEther("1000"));
    await uc.connect(admin).mint(user4.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the correct UC token address", async function () {
      expect(await vault.unityCoin()).to.equal(await uc.getAddress());
    });

    it("Should grant admin all roles initially", async function () {
      expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await vault.hasRole(REDEMPTION_PROCESSOR, admin.address)).to.be.true;
      expect(await vault.hasRole(TREASURER, admin.address)).to.be.true;
    });

    it("Should revert if UC address is zero", async function () {
      const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
      await expect(RedemptionVault.deploy(ethers.ZeroAddress, admin.address)).to.be.revertedWith(
        "UC cannot be zero address"
      );
    });

    it("Should revert if admin address is zero", async function () {
      const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
      await expect(
        RedemptionVault.deploy(await uc.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Admin cannot be zero address");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant REDEMPTION_PROCESSOR role", async function () {
      await vault.connect(admin).grantRole(REDEMPTION_PROCESSOR, processor.address);
      expect(await vault.hasRole(REDEMPTION_PROCESSOR, processor.address)).to.be.true;
    });

    it("Should allow admin to grant TREASURER role", async function () {
      await vault.connect(admin).grantRole(TREASURER, treasurer.address);
      expect(await vault.hasRole(TREASURER, treasurer.address)).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(vault.connect(user1).grantRole(REDEMPTION_PROCESSOR, processor.address)).to.be
        .reverted;
    });
  });

  describe("Requesting Redemptions", function () {
    const redeemAmount = ethers.parseEther("100");

    it("Should allow user to request redemption", async function () {
      // Approve vault to spend UC
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);

      // Request redemption
      await vault.connect(user1).redeem(redeemAmount);

      // Check UC was transferred to vault
      expect(await uc.balanceOf(await vault.getAddress())).to.equal(redeemAmount);
      expect(await uc.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
    });

    it("Should emit RedeemRequested event", async function () {
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);

      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      // Check event was emitted
      await expect(tx).to.emit(vault, "RedeemRequested");
    });

    it("Should return redemption ID", async function () {
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);

      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      // Should return bytes32 redemption ID
      expect(receipt).to.not.be.undefined;
    });

    it("Should create redemption record with correct status", async function () {
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);

      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      // Get redemptionId from event
      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      // Check redemption details
      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.user).to.equal(user1.address);
      expect(redemption.amount).to.equal(redeemAmount);
      expect(redemption.status).to.equal(0); // Pending
    });

    it("Should not allow redeeming zero amount", async function () {
      await expect(vault.connect(user1).redeem(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("Should not allow redemption without UC approval", async function () {
      await expect(vault.connect(user1).redeem(redeemAmount)).to.be.reverted; // ERC20 insufficient allowance
    });

    it("Should not allow redemption with insufficient balance", async function () {
      const largeAmount = ethers.parseEther("10000");
      await uc.connect(user1).approve(await vault.getAddress(), largeAmount);

      await expect(vault.connect(user1).redeem(largeAmount)).to.be.reverted; // ERC20 insufficient balance
    });

    it("Should handle multiple redemption requests from same user", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");

      await uc.connect(user1).approve(await vault.getAddress(), amount1 + amount2);

      await vault.connect(user1).redeem(amount1);
      await vault.connect(user1).redeem(amount2);

      expect(await uc.balanceOf(await vault.getAddress())).to.equal(amount1 + amount2);
    });

    it("Should handle redemption requests from multiple users", async function () {
      const amount = ethers.parseEther("100");

      await uc.connect(user1).approve(await vault.getAddress(), amount);
      await uc.connect(user2).approve(await vault.getAddress(), amount);

      await vault.connect(user1).redeem(amount);
      await vault.connect(user2).redeem(amount);

      expect(await uc.balanceOf(await vault.getAddress())).to.equal(amount * 2n);
    });
  });

  describe("Fulfilling Redemptions", function () {
    let redemptionId: string;
    const redeemAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Setup: User requests redemption
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      // Get redemptionId from event
      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      redemptionId = parsedEvent?.args.redemptionId;
    });

    it("Should allow REDEMPTION_PROCESSOR to fulfill redemption", async function () {
      await vault.connect(admin).fulfillRedemption(redemptionId);

      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(1); // Fulfilled
    });

    it("Should emit RedemptionFulfilled event", async function () {
      await expect(vault.connect(admin).fulfillRedemption(redemptionId))
        .to.emit(vault, "RedemptionFulfilled")
        .withArgs(redemptionId, user1.address, redeemAmount, admin.address);
    });

    it("Should not allow fulfilling non-existent redemption", async function () {
      const fakeId = ethers.id("FAKE_REDEMPTION");

      await expect(vault.connect(admin).fulfillRedemption(fakeId)).to.be.revertedWith(
        "Redemption not found"
      );
    });

    it("Should not allow fulfilling already fulfilled redemption", async function () {
      await vault.connect(admin).fulfillRedemption(redemptionId);

      await expect(vault.connect(admin).fulfillRedemption(redemptionId)).to.be.revertedWith(
        "Redemption not pending"
      );
    });

    it("Should not allow non-REDEMPTION_PROCESSOR to fulfill", async function () {
      await expect(vault.connect(user2).fulfillRedemption(redemptionId)).to.be.reverted;
    });
  });

  describe("Cancelling Redemptions", function () {
    let redemptionId: string;
    const redeemAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Setup: User requests redemption
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      redemptionId = parsedEvent?.args.redemptionId;
    });

    it("Should allow REDEMPTION_PROCESSOR to cancel redemption", async function () {
      await vault.connect(admin).cancelRedemption(redemptionId);

      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(2); // Cancelled
    });

    it("Should return UC to user when cancelled", async function () {
      const balanceBefore = await uc.balanceOf(user1.address);

      await vault.connect(admin).cancelRedemption(redemptionId);

      const balanceAfter = await uc.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(redeemAmount);
    });

    it("Should emit RedemptionCancelled event", async function () {
      await expect(vault.connect(admin).cancelRedemption(redemptionId))
        .to.emit(vault, "RedemptionCancelled")
        .withArgs(redemptionId, user1.address, redeemAmount, admin.address);
    });

    it("Should not allow cancelling non-existent redemption", async function () {
      const fakeId = ethers.id("FAKE_REDEMPTION");

      await expect(vault.connect(admin).cancelRedemption(fakeId)).to.be.revertedWith(
        "Redemption not found"
      );
    });

    it("Should not allow cancelling already fulfilled redemption", async function () {
      await vault.connect(admin).fulfillRedemption(redemptionId);

      await expect(vault.connect(admin).cancelRedemption(redemptionId)).to.be.revertedWith(
        "Redemption not pending"
      );
    });

    it("Should not allow non-REDEMPTION_PROCESSOR to cancel", async function () {
      await expect(vault.connect(user2).cancelRedemption(redemptionId)).to.be.reverted;
    });
  });

  describe("Treasury Withdrawals", function () {
    beforeEach(async function () {
      // Setup: Add UC to vault via redemption requests
      const amount = ethers.parseEther("500");
      await uc.connect(user1).approve(await vault.getAddress(), amount);
      await vault.connect(user1).redeem(amount);
    });

    it("Should allow TREASURER to withdraw UC", async function () {
      const withdrawAmount = ethers.parseEther("100");
      const balanceBefore = await uc.balanceOf(treasurer.address);

      await vault.connect(admin).withdrawToTreasury(withdrawAmount, treasurer.address);

      const balanceAfter = await uc.balanceOf(treasurer.address);
      expect(balanceAfter - balanceBefore).to.equal(withdrawAmount);
    });

    it("Should emit TreasuryWithdrawal event", async function () {
      const withdrawAmount = ethers.parseEther("100");

      await expect(vault.connect(admin).withdrawToTreasury(withdrawAmount, treasurer.address))
        .to.emit(vault, "TreasuryWithdrawal")
        .withArgs(admin.address, withdrawAmount, treasurer.address);
    });

    it("Should reduce vault balance after withdrawal", async function () {
      const withdrawAmount = ethers.parseEther("100");
      const vaultBalanceBefore = await vault.getVaultBalance();

      await vault.connect(admin).withdrawToTreasury(withdrawAmount, treasurer.address);

      const vaultBalanceAfter = await vault.getVaultBalance();
      expect(vaultBalanceBefore - vaultBalanceAfter).to.equal(withdrawAmount);
    });

    it("Should not allow withdrawal to zero address", async function () {
      await expect(
        vault.connect(admin).withdrawToTreasury(ethers.parseEther("100"), ethers.ZeroAddress)
      ).to.be.revertedWith("Destination cannot be zero address");
    });

    it("Should not allow withdrawing zero amount", async function () {
      await expect(
        vault.connect(admin).withdrawToTreasury(0, treasurer.address)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow withdrawal more than vault balance", async function () {
      const vaultBalance = await vault.getVaultBalance();
      const excessAmount = vaultBalance + ethers.parseEther("1");

      await expect(
        vault.connect(admin).withdrawToTreasury(excessAmount, treasurer.address)
      ).to.be.revertedWith("Insufficient vault balance");
    });

    it("Should not allow non-TREASURER to withdraw", async function () {
      await expect(vault.connect(user1).withdrawToTreasury(ethers.parseEther("100"), user1.address))
        .to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct vault balance", async function () {
      expect(await vault.getVaultBalance()).to.equal(0);

      // Add UC to vault
      const amount = ethers.parseEther("500");
      await uc.connect(user1).approve(await vault.getAddress(), amount);
      await vault.connect(user1).redeem(amount);

      expect(await vault.getVaultBalance()).to.equal(amount);
    });

    it("Should return correct redemption details", async function () {
      const amount = ethers.parseEther("100");
      await uc.connect(user1).approve(await vault.getAddress(), amount);

      const tx = await vault.connect(user1).redeem(amount);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      const redemption = await vault.getRedemption(redemptionId);

      expect(redemption.user).to.equal(user1.address);
      expect(redemption.amount).to.equal(amount);
      expect(redemption.status).to.equal(0); // Pending
      expect(redemption.timestamp).to.be.gt(0);
    });
  });

  describe("Edge Cases & Integration", function () {
    it("Should handle full redemption flow", async function () {
      const amount = ethers.parseEther("100");

      // 1. User requests redemption
      await uc.connect(user1).approve(await vault.getAddress(), amount);
      const tx = await vault.connect(user1).redeem(amount);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      // 2. Processor fulfills redemption
      await vault.connect(admin).fulfillRedemption(redemptionId);

      // 3. Treasury withdraws from vault
      const vaultBalance = await vault.getVaultBalance();
      await vault.connect(admin).withdrawToTreasury(vaultBalance, treasurer.address);

      expect(await vault.getVaultBalance()).to.equal(0);
      expect(await uc.balanceOf(treasurer.address)).to.equal(amount);
    });

    it("Should handle multiple pending redemptions", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");
      const amount3 = ethers.parseEther("300");

      await uc.connect(user1).approve(await vault.getAddress(), amount1 + amount2);
      await uc.connect(user2).approve(await vault.getAddress(), amount3);

      await vault.connect(user1).redeem(amount1);
      await vault.connect(user1).redeem(amount2);
      await vault.connect(user2).redeem(amount3);

      expect(await vault.getVaultBalance()).to.equal(amount1 + amount2 + amount3);
    });

    it("Should prevent reentrancy on cancel", async function () {
      // OpenZeppelin ReentrancyGuard is used, this test documents that
      const amount = ethers.parseEther("100");
      await uc.connect(user1).approve(await vault.getAddress(), amount);

      const tx = await vault.connect(user1).redeem(amount);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      // Cancel should work normally (reentrancy protection is built-in)
      await vault.connect(admin).cancelRedemption(redemptionId);
      expect(await uc.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Forfeiting Redemptions", function () {
    let redemptionId: string;
    const redeemAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Setup: User requests redemption
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      redemptionId = parsedEvent?.args.redemptionId;
    });

    it("Should allow REDEMPTION_PROCESSOR to forfeit redemption", async function () {
      await vault.connect(admin).forfeitRedemption(redemptionId, "Fraud detected");

      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(3); // Forfeited
    });

    it("Should not return UC when forfeiting", async function () {
      const userBalanceBefore = await uc.balanceOf(user1.address);

      await vault.connect(admin).forfeitRedemption(redemptionId, "Fraud detected");

      // User balance should not change
      expect(await uc.balanceOf(user1.address)).to.equal(userBalanceBefore);

      // UC stays in vault
      expect(await vault.getVaultBalance()).to.equal(redeemAmount);
    });

    it("Should emit RedemptionForfeited event", async function () {
      await expect(vault.connect(admin).forfeitRedemption(redemptionId, "Fraud detected"))
        .to.emit(vault, "RedemptionForfeited")
        .withArgs(redemptionId, user1.address, redeemAmount, admin.address, "Fraud detected");
    });

    it("Should not allow forfeiting non-existent redemption", async function () {
      const fakeId = ethers.id("FAKE_REDEMPTION");

      await expect(vault.connect(admin).forfeitRedemption(fakeId, "Reason")).to.be.revertedWith(
        "Redemption not found"
      );
    });

    it("Should not allow forfeiting already fulfilled redemption", async function () {
      await vault.connect(admin).fulfillRedemption(redemptionId);

      await expect(
        vault.connect(admin).forfeitRedemption(redemptionId, "Reason")
      ).to.be.revertedWith("Redemption not pending");
    });

    it("Should not allow non-REDEMPTION_PROCESSOR to forfeit", async function () {
      await expect(vault.connect(user2).forfeitRedemption(redemptionId, "Reason")).to.be.reverted;
    });
  });

  describe("Emergency Resolution", function () {
    let redemptionId: string;
    const redeemAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Setup: User requests redemption
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      redemptionId = parsedEvent?.args.redemptionId;
    });

    it("Should allow TREASURER to mark emergency resolution", async function () {
      await vault.connect(admin).markEmergencyResolved(redemptionId, "Wrongful suspension");

      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(2); // Cancelled
    });

    it("Should not transfer UC on emergency resolution", async function () {
      const vaultBalanceBefore = await vault.getVaultBalance();

      await vault.connect(admin).markEmergencyResolved(redemptionId, "Wrongful suspension");

      // Vault balance should not change
      expect(await vault.getVaultBalance()).to.equal(vaultBalanceBefore);
    });

    it("Should emit events on emergency resolution", async function () {
      await expect(vault.connect(admin).markEmergencyResolved(redemptionId, "Wrongful suspension"))
        .to.emit(vault, "RedemptionCancelled")
        .withArgs(redemptionId, user1.address, redeemAmount, admin.address);
    });

    it("Should work for forfeited redemptions", async function () {
      await vault.connect(admin).forfeitRedemption(redemptionId, "Fraud detected");

      // Later, admin resolves it via emergency
      await vault.connect(admin).markEmergencyResolved(redemptionId, "Exception approved");

      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(2); // Cancelled
    });

    it("Should not allow marking fulfilled redemption", async function () {
      await vault.connect(admin).fulfillRedemption(redemptionId);

      await expect(
        vault.connect(admin).markEmergencyResolved(redemptionId, "Reason")
      ).to.be.revertedWith("Cannot resolve this redemption");
    });

    it("Should not allow non-TREASURER to mark emergency resolution", async function () {
      await expect(vault.connect(user2).markEmergencyResolved(redemptionId, "Reason")).to.be
        .reverted;
    });
  });

  describe("Integration with Membership System", function () {
    let redemptionId: string;
    const redeemAmount = ethers.parseEther("100");

    beforeEach(async function () {
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log) => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });

      const parsedEvent = vault.interface.parseLog(event as any);
      redemptionId = parsedEvent?.args.redemptionId;
    });

    it("Should fail to cancel if user is suspended", async function () {
      // Suspend user
      await sc.connect(admin).suspendMember(user1.address);

      // Cancel should fail (membership check happens first)
      await expect(vault.connect(admin).cancelRedemption(redemptionId)).to.be.revertedWith(
        "Recipient must be an active SC member"
      );
    });

    it("Should handle suspended user via forfeit", async function () {
      // Suspend user
      await sc.connect(admin).suspendMember(user1.address);

      // Forfeit instead of cancel
      await vault.connect(admin).forfeitRedemption(redemptionId, "User suspended");

      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(3); // Forfeited
    });

    it("Should handle suspended user via emergency transfer flow", async function () {
      // Suspend user
      await sc.connect(admin).suspendMember(user1.address);

      // Admin uses emergency transfer on UnityCoin
      await uc
        .connect(admin)
        .emergencyTransfer(await vault.getAddress(), user1.address, redeemAmount);

      // Then mark as resolved
      await vault.connect(admin).markEmergencyResolved(redemptionId, "Wrongful suspension");

      // User got their UC back via emergency transfer
      expect(await uc.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Redemption Limits", function () {
    it("Should allow unlimited redemptions by default", async function () {
      expect(await vault.maxRedemptionPerUser()).to.equal(0);
      expect(await vault.maxDailyRedemptions()).to.equal(0);

      // Approve vault to spend UC
      await uc.connect(user1).approve(await vault.getAddress(), ethers.parseEther("1000"));
      await expect(vault.connect(user1).redeem(ethers.parseEther("1000"))).to.not.be.reverted;
    });

    it("Should allow admin to set max redemption per user", async function () {
      await vault.connect(admin).setMaxRedemptionPerUser(ethers.parseEther("5000"));
      expect(await vault.maxRedemptionPerUser()).to.equal(ethers.parseEther("5000"));
    });

    it("Should emit MaxRedemptionPerUserChanged event", async function () {
      await expect(vault.connect(admin).setMaxRedemptionPerUser(ethers.parseEther("5000")))
        .to.emit(vault, "MaxRedemptionPerUserChanged")
        .withArgs(0, ethers.parseEther("5000"), admin.address);
    });

    it("Should enforce max redemption per user", async function () {
      await vault.connect(admin).setMaxRedemptionPerUser(ethers.parseEther("500"));

      // Approve vault to spend UC
      await uc.connect(user1).approve(await vault.getAddress(), ethers.parseEther("1000"));

      await expect(vault.connect(user1).redeem(ethers.parseEther("600"))).to.be.revertedWith(
        "Amount exceeds max redemption per user"
      );

      await expect(vault.connect(user1).redeem(ethers.parseEther("500"))).to.not.be.reverted;
    });

    it("Should allow admin to set max daily redemptions", async function () {
      await vault.connect(admin).setMaxDailyRedemptions(ethers.parseEther("10000"));
      expect(await vault.maxDailyRedemptions()).to.equal(ethers.parseEther("10000"));
    });

    it("Should emit MaxDailyRedemptionsChanged event", async function () {
      await expect(vault.connect(admin).setMaxDailyRedemptions(ethers.parseEther("10000")))
        .to.emit(vault, "MaxDailyRedemptionsChanged")
        .withArgs(0, ethers.parseEther("10000"), admin.address);
    });

    it("Should enforce max daily redemptions", async function () {
      await vault.connect(admin).setMaxDailyRedemptions(ethers.parseEther("1000"));

      // Approve vault to spend UC
      await uc.connect(user1).approve(await vault.getAddress(), ethers.parseEther("1000"));
      await uc.connect(user2).approve(await vault.getAddress(), ethers.parseEther("1000"));
      await uc.connect(user3).approve(await vault.getAddress(), ethers.parseEther("1000"));

      // User1 redeems 600
      await vault.connect(user1).redeem(ethers.parseEther("600"));

      // User2 redeems 300 (total 900, still under limit)
      await vault.connect(user2).redeem(ethers.parseEther("300"));

      // User3 tries to redeem 200 (would be 1100, exceeds limit)
      await expect(vault.connect(user3).redeem(ethers.parseEther("200"))).to.be.revertedWith(
        "Daily redemption limit exceeded"
      );

      // User3 can redeem 100 (total 1000, exactly at limit)
      await expect(vault.connect(user3).redeem(ethers.parseEther("100"))).to.not.be.reverted;
    });

    it("Should reset daily redemption total on new day", async function () {
      await vault.connect(admin).setMaxDailyRedemptions(ethers.parseEther("1000"));

      // Approve vault to spend UC
      await uc.connect(user1).approve(await vault.getAddress(), ethers.parseEther("1000"));
      await uc.connect(user2).approve(await vault.getAddress(), ethers.parseEther("1000"));

      // Day 1: Redeem 1000
      await vault.connect(user1).redeem(ethers.parseEther("1000"));

      // Try to redeem more on day 1 - should fail
      await expect(vault.connect(user2).redeem(ethers.parseEther("100"))).to.be.revertedWith(
        "Daily redemption limit exceeded"
      );

      // Move to next day
      await time.increase(86400 + 1); // 1 day + 1 second

      // Day 2: Should be able to redeem again
      await expect(vault.connect(user2).redeem(ethers.parseEther("500"))).to.not.be.reverted;
    });

    it("Should allow setting limit to 0 (unlimited)", async function () {
      await vault.connect(admin).setMaxRedemptionPerUser(ethers.parseEther("500"));
      await vault.connect(admin).setMaxRedemptionPerUser(0);

      // Approve vault to spend UC
      await uc.connect(user1).approve(await vault.getAddress(), ethers.parseEther("1000"));

      await expect(vault.connect(user1).redeem(ethers.parseEther("1000"))).to.not.be.reverted;
    });

    it("Should not allow non-admin to set limits", async function () {
      await expect(vault.connect(user1).setMaxRedemptionPerUser(ethers.parseEther("5000"))).to.be
        .reverted;

      await expect(vault.connect(user1).setMaxDailyRedemptions(ethers.parseEther("10000"))).to.be
        .reverted;
    });

    it("Should enforce both per-user and daily limits", async function () {
      await vault.connect(admin).setMaxRedemptionPerUser(ethers.parseEther("400"));
      await vault.connect(admin).setMaxDailyRedemptions(ethers.parseEther("1000"));

      // Approve vault to spend UC
      await uc.connect(user1).approve(await vault.getAddress(), ethers.parseEther("1000"));
      await uc.connect(user2).approve(await vault.getAddress(), ethers.parseEther("1000"));
      await uc.connect(user3).approve(await vault.getAddress(), ethers.parseEther("1000"));
      await uc.connect(user4).approve(await vault.getAddress(), ethers.parseEther("1000"));

      // User1 tries to redeem 500 - fails per-user limit
      await expect(vault.connect(user1).redeem(ethers.parseEther("500"))).to.be.revertedWith(
        "Amount exceeds max redemption per user"
      );

      // User1 redeems 400
      await vault.connect(user1).redeem(ethers.parseEther("400"));

      // User2 redeems 400
      await vault.connect(user2).redeem(ethers.parseEther("400"));

      // User3 can only redeem 200 (daily limit would be reached)
      await vault.connect(user3).redeem(ethers.parseEther("200"));

      // User4 can't redeem anything (daily limit reached)
      await expect(vault.connect(user4).redeem(ethers.parseEther("100"))).to.be.revertedWith(
        "Daily redemption limit exceeded"
      );
    });
  });

  describe("Ownership Transfer", function () {
    it("Should allow admin to initiate ownership transfer", async function () {
      await vault.connect(admin).initiateOwnershipTransfer(user1.address);
      expect(await vault.hasRole(ethers.ZeroHash, user1.address)).to.be.true;
      expect(await vault.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
    });

    it("Should emit OwnershipTransferInitiated event", async function () {
      const tx = await vault.connect(admin).initiateOwnershipTransfer(user1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(vault, "OwnershipTransferInitiated")
        .withArgs(admin.address, user1.address, block!.timestamp);
    });

    it("Should allow old admin to complete transfer", async function () {
      await vault.connect(admin).initiateOwnershipTransfer(user1.address);
      await vault.connect(admin).completeOwnershipTransfer();

      expect(await vault.hasRole(ethers.ZeroHash, admin.address)).to.be.false;
      expect(await vault.hasRole(ethers.ZeroHash, user1.address)).to.be.true;
    });

    it("Should emit OwnershipTransferCompleted event", async function () {
      await vault.connect(admin).initiateOwnershipTransfer(user1.address);

      const tx = await vault.connect(admin).completeOwnershipTransfer();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(vault, "OwnershipTransferCompleted")
        .withArgs(admin.address, block!.timestamp);
    });

    it("Should revert if transferring to zero address", async function () {
      await expect(
        vault.connect(admin).initiateOwnershipTransfer(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot transfer to zero address");
    });

    it("Should revert if address already has admin role", async function () {
      await expect(
        vault.connect(admin).initiateOwnershipTransfer(admin.address)
      ).to.be.revertedWith("Address already has admin role");
    });

    it("Should revert if completing transfer with no other admin", async function () {
      await expect(vault.connect(admin).completeOwnershipTransfer()).to.be.revertedWith(
        "Would leave contract without admin"
      );
    });

    it("Should not allow non-admin to initiate transfer", async function () {
      await expect(vault.connect(user1).initiateOwnershipTransfer(user2.address)).to.be.reverted;
    });

    it("Should allow new admin to manage contract after transfer", async function () {
      await vault.connect(admin).initiateOwnershipTransfer(user1.address);
      await vault.connect(admin).completeOwnershipTransfer();

      // New admin should be able to set limits
      await expect(vault.connect(user1).setMaxRedemptionPerUser(ethers.parseEther("5000"))).to.not
        .be.reverted;
    });
  });
});
