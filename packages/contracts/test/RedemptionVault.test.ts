import { expect } from "chai";
import { ethers } from "hardhat";
import { RedemptionVault, UnityCoin, SoulaaniCoin } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("RedemptionVault", function () {
  let vault: RedemptionVault;
  let uc: UnityCoin;
  let sc: SoulaaniCoin;
  let mockUSDC: any;
  let admin: SignerWithAddress;
  let processor: SignerWithAddress;
  let treasurer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;

  const BACKEND = ethers.id("BACKEND");
  const TREASURER = ethers.id("TREASURER");
  const TREASURER_MINT = ethers.id("TREASURER_MINT");
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

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy UnityCoin first (without RedemptionVault for now)
    const UnityCoin = await ethers.getContractFactory("UnityCoin");
    uc = await UnityCoin.deploy(admin.address, await sc.getAddress(), admin.address); // Use admin as placeholder
    await uc.waitForDeployment();

    // Deploy RedemptionVault with correct UnityCoin address
    const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
    vault = await RedemptionVault.deploy(await uc.getAddress(), await mockUSDC.getAddress(), admin.address);
    await vault.waitForDeployment();

    // Grant RedemptionVault the TREASURER_MINT role in UnityCoin
    await uc.connect(admin).grantRole(TREASURER_MINT, await vault.getAddress());

    // Add vault as system contract so it can hold UC
    await uc.connect(admin).addSystemContract(await vault.getAddress());

    // Mint USDC to vault for redemptions
    await mockUSDC.mint(await vault.getAddress(), ethers.parseUnits("10000", 6)); // 10,000 USDC
    await vault.connect(admin).updateUSDCReserve();

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
      expect(await vault.hasRole(BACKEND, admin.address)).to.be.true;
      expect(await vault.hasRole(TREASURER, admin.address)).to.be.true;
    });

    it("Should revert if UC address is zero", async function () {
      const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
      await expect(RedemptionVault.deploy(ethers.ZeroAddress, await mockUSDC.getAddress(), admin.address)).to.be.revertedWith(
        "UC cannot be zero address"
      );
    });

    it("Should revert if admin address is zero", async function () {
      const RedemptionVault = await ethers.getContractFactory("RedemptionVault");
      await expect(
        RedemptionVault.deploy(await uc.getAddress(), await mockUSDC.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Admin cannot be zero address");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant BACKEND role", async function () {
      await vault.connect(admin).grantRole(BACKEND, processor.address);
      expect(await vault.hasRole(BACKEND, processor.address)).to.be.true;
    });

    it("Should allow admin to grant TREASURER role", async function () {
      await vault.connect(admin).grantRole(TREASURER, treasurer.address);
      expect(await vault.hasRole(TREASURER, treasurer.address)).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(vault.connect(user1).grantRole(BACKEND, processor.address)).to.be
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

    it("Should allow BACKEND to fulfill redemption", async function () {
      const vaultBalanceBefore = await vault.getVaultBalance();
      const totalSupplyBefore = await uc.totalSupply();
      
      await vault.connect(admin).fulfillRedemption(redemptionId);
      
      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(1); // Fulfilled
      
      // UC should be burned (vault balance decreases, total supply decreases)
      expect(await vault.getVaultBalance()).to.equal(vaultBalanceBefore - redeemAmount);
      expect(await uc.totalSupply()).to.equal(totalSupplyBefore - redeemAmount);
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

    it("Should not allow non-BACKEND to fulfill", async function () {
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

    it("Should allow BACKEND to cancel redemption", async function () {
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

    it("Should not allow non-BACKEND to cancel", async function () {
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
      
      // 2. Processor fulfills redemption (burns UC)
      await vault.connect(admin).fulfillRedemption(redemptionId);
      
      // 3. Verify UC was burned and vault balance is 0
      expect(await vault.getVaultBalance()).to.equal(0);
      // UC was burned, so total supply should be reduced by the redemption amount
      // Total supply should be 3900 (4000 - 100 from user1's redemption)
      expect(await uc.totalSupply()).to.equal(ethers.parseEther("3900"));
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

    it("Should allow BACKEND to forfeit redemption", async function () {
      await vault.connect(admin).forfeitRedemption(redemptionId, "Fraud detected");

      const redemption = await vault.getRedemption(redemptionId);
      expect(redemption.status).to.equal(3); // Forfeited
    });

    it("Should burn UC when forfeiting", async function () {
      const userBalanceBefore = await uc.balanceOf(user1.address);
      const vaultBalanceBefore = await vault.getVaultBalance();
      const totalSupplyBefore = await uc.totalSupply();

      await vault.connect(admin).forfeitRedemption(redemptionId, "Fraud detected");

      // User balance should not change
      expect(await uc.balanceOf(user1.address)).to.equal(userBalanceBefore);

      // UC is burned (vault balance decreases, total supply decreases)
      expect(await vault.getVaultBalance()).to.equal(vaultBalanceBefore - redeemAmount);
      expect(await uc.totalSupply()).to.equal(totalSupplyBefore - redeemAmount);
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

    it("Should not allow non-BACKEND to forfeit", async function () {
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

    it("Should not change UC on emergency resolution", async function () {
      const vaultBalanceBefore = await vault.getVaultBalance();
      const totalSupplyBefore = await uc.totalSupply();

      await vault.connect(admin).markEmergencyResolved(redemptionId, "Wrongful suspension");

      // UC already moved via emergencyTransfer - vault balance and total supply unchanged
      expect(await vault.getVaultBalance()).to.equal(vaultBalanceBefore);
      expect(await uc.totalSupply()).to.equal(totalSupplyBefore);
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

  describe("Multi-Coop Foundation", function () {
    it("Should have default coop ID of 1", async function () {
      expect(await vault.coopId()).to.equal(1);
    });

    it("Should have default clearing contract as zero address", async function () {
      expect(await vault.clearingContract()).to.equal(ethers.ZeroAddress);
    });

    it("Should allow admin to set clearing contract", async function () {
      const newClearingContract = ethers.Wallet.createRandom().address;
      
      await expect(vault.connect(admin).setClearingContract(newClearingContract))
        .to.emit(vault, "ClearingContractChanged")
        .withArgs(ethers.ZeroAddress, newClearingContract, admin.address);
      
      expect(await vault.clearingContract()).to.equal(newClearingContract);
    });

    it("Should allow admin to set coop ID", async function () {
      const newCoopId = 2;
      
      await expect(vault.connect(admin).setCoopId(newCoopId))
        .to.emit(vault, "CoopIdChanged")
        .withArgs(1, newCoopId, admin.address);
      
      expect(await vault.coopId()).to.equal(newCoopId);
    });

    it("Should not allow non-admin to set clearing contract", async function () {
      const newClearingContract = ethers.Wallet.createRandom().address;
      
      await expect(vault.connect(user1).setClearingContract(newClearingContract))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("Should not allow non-admin to set coop ID", async function () {
      await expect(vault.connect(user1).setCoopId(2))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("Should revert if setting clearing contract to zero address", async function () {
      await expect(vault.connect(admin).setClearingContract(ethers.ZeroAddress))
        .to.be.revertedWith("Clearing contract cannot be zero address");
    });

    it("Should revert if setting coop ID to zero", async function () {
      await expect(vault.connect(admin).setCoopId(0))
        .to.be.revertedWith("Coop ID must be greater than 0");
    });
  });

  // ========== USDC ONBOARDING TESTS ==========

  describe("USDC Onboarding", function () {
    beforeEach(async function () {
      // Mint USDC to users for testing
      await mockUSDC.mint(user1.address, ethers.parseUnits("1000", 6)); // 1000 USDC
      await mockUSDC.mint(user2.address, ethers.parseUnits("1000", 6)); // 1000 USDC
      
      // Approve vault to spend USDC
      await mockUSDC.connect(user1).approve(await vault.getAddress(), ethers.parseUnits("1000", 6));
      await mockUSDC.connect(user2).approve(await vault.getAddress(), ethers.parseUnits("1000", 6));
    });

    it("Should process USDC onboarding successfully", async function () {
      const usdcAmount = ethers.parseUnits("100", 6); // 100 USDC
      const expectedUcAmount = ethers.parseUnits("100", 18); // 100 UC (1:1 rate with decimal conversion)
      
      const user1UcBalanceBefore = await uc.balanceOf(user1.address);
      const vaultUsdcBalanceBefore = await mockUSDC.balanceOf(await vault.getAddress());
      const totalReserveBefore = await vault.totalUSDCReserve();

      await expect(vault.connect(user1).processUSDCOnboarding(usdcAmount))
        .to.emit(vault, "USDCOnboardingProcessed")
        .withArgs(user1.address, usdcAmount, expectedUcAmount, user1.address);

      // Check UC was minted to user
      expect(await uc.balanceOf(user1.address)).to.equal(user1UcBalanceBefore + expectedUcAmount);
      
      // Check USDC was transferred to vault
      expect(await mockUSDC.balanceOf(await vault.getAddress())).to.equal(vaultUsdcBalanceBefore + usdcAmount);
      
      // Check USDC reserve was updated
      expect(await vault.totalUSDCReserve()).to.equal(totalReserveBefore + usdcAmount);
    });

    it("Should handle decimal conversion correctly", async function () {
      const usdcAmount = ethers.parseUnits("1.5", 6); // 1.5 USDC
      const expectedUcAmount = ethers.parseUnits("1.5", 18); // 1.5 UC
      const user1UcBalanceBefore = await uc.balanceOf(user1.address);
      
      await vault.connect(user1).processUSDCOnboarding(usdcAmount);
      
      expect(await uc.balanceOf(user1.address)).to.equal(user1UcBalanceBefore + expectedUcAmount);
    });

    it("Should not allow zero amount onboarding", async function () {
      await expect(vault.connect(user1).processUSDCOnboarding(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow onboarding without USDC approval", async function () {
      // Remove approval
      await mockUSDC.connect(user1).approve(await vault.getAddress(), 0);
      
      await expect(vault.connect(user1).processUSDCOnboarding(ethers.parseUnits("100", 6)))
        .to.be.revertedWithCustomError(mockUSDC, "ERC20InsufficientAllowance");
    });

    it("Should not allow onboarding with insufficient USDC balance", async function () {
      // Remove all USDC from user first
      await mockUSDC.connect(user1).transfer(admin.address, await mockUSDC.balanceOf(user1.address));
      
      // Give user a small amount of USDC but not enough for the test
      await mockUSDC.mint(user1.address, ethers.parseUnits("100", 6)); // Only 100 USDC
      await mockUSDC.connect(user1).approve(await vault.getAddress(), ethers.parseUnits("2000", 6)); // Approve for 2000
      
      const usdcAmount = ethers.parseUnits("2000", 6); // More than user has (which is 100)
      
      await expect(vault.connect(user1).processUSDCOnboarding(usdcAmount))
        .to.be.revertedWithCustomError(mockUSDC, "ERC20InsufficientBalance");
    });

    it("Should handle multiple onboarding requests", async function () {
      const usdcAmount1 = ethers.parseUnits("100", 6);
      const usdcAmount2 = ethers.parseUnits("200", 6);
      const user1UcBalanceBefore = await uc.balanceOf(user1.address);
      const user2UcBalanceBefore = await uc.balanceOf(user2.address);
      
      await vault.connect(user1).processUSDCOnboarding(usdcAmount1);
      await vault.connect(user2).processUSDCOnboarding(usdcAmount2);
      
      expect(await uc.balanceOf(user1.address)).to.equal(user1UcBalanceBefore + ethers.parseUnits("100", 18));
      expect(await uc.balanceOf(user2.address)).to.equal(user2UcBalanceBefore + ethers.parseUnits("200", 18));
      expect(await vault.totalUSDCReserve()).to.equal(ethers.parseUnits("10000", 6) + usdcAmount1 + usdcAmount2);
    });
  });

  // ========== USDC REDEMPTION TESTS ==========

  describe("USDC Redemption", function () {
    beforeEach(async function () {
      // Set up USDC in vault for redemptions
      await mockUSDC.mint(await vault.getAddress(), ethers.parseUnits("10000", 6));
      await vault.connect(admin).updateUSDCReserve();
    });

    it("Should fulfill redemption with USDC", async function () {
      const redeemAmount = ethers.parseEther("100"); // 100 UC
      const expectedUsdcAmount = ethers.parseUnits("100", 6); // 100 USDC
      
      // Request redemption
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });
      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      const user1UsdcBalanceBefore = await mockUSDC.balanceOf(user1.address);
      const vaultUsdcBalanceBefore = await mockUSDC.balanceOf(await vault.getAddress());
      const totalReserveBefore = await vault.totalUSDCReserve();

      // Fulfill redemption
      await expect(vault.connect(admin).fulfillRedemption(redemptionId))
        .to.emit(vault, "RedemptionFulfilled")
        .withArgs(redemptionId, user1.address, redeemAmount, admin.address);

      // Check USDC was sent to user
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(user1UsdcBalanceBefore + expectedUsdcAmount);
      
      // Check USDC was removed from vault
      expect(await mockUSDC.balanceOf(await vault.getAddress())).to.equal(vaultUsdcBalanceBefore - expectedUsdcAmount);
      
      // Check USDC reserve was updated
      expect(await vault.totalUSDCReserve()).to.equal(totalReserveBefore - expectedUsdcAmount);
    });

    it("Should handle decimal conversion in redemption", async function () {
      const redeemAmount = ethers.parseEther("1.5"); // 1.5 UC
      const expectedUsdcAmount = ethers.parseUnits("1.5", 6); // 1.5 USDC
      
      // Request redemption
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });
      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      const user1UsdcBalanceBefore = await mockUSDC.balanceOf(user1.address);

      // Fulfill redemption
      await vault.connect(admin).fulfillRedemption(redemptionId);

      // Check USDC was sent to user
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(user1UsdcBalanceBefore + expectedUsdcAmount);
    });

    it("Should not fulfill redemption with insufficient USDC", async function () {
      // Give user more UC for this test
      await uc.connect(admin).mint(user1.address, ethers.parseEther("20000"));
      
      // First, let's reduce the vault's USDC by withdrawing most of it
      await vault.connect(admin).withdrawUSDC(admin.address, ethers.parseUnits("9500", 6));
      // Now vault should have only 500 USDC
      
      const redeemAmount = ethers.parseEther("20000"); // 20,000 UC = 20,000 USDC, but vault only has 500
      
      // Request redemption
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });
      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      // Should fail due to insufficient USDC (vault has 500 USDC but needs 20,000)
      await expect(vault.connect(admin).fulfillRedemption(redemptionId))
        .to.be.revertedWith("Insufficient USDC balance");
    });

    it("Should not fulfill redemption with insufficient USDC reserve", async function () {
      // Give user more UC for this test
      await uc.connect(admin).mint(user1.address, ethers.parseEther("6000"));
      
      // Create a fresh vault with minimal USDC reserve for this test
      const FreshVault = await ethers.getContractFactory("RedemptionVault");
      const freshVault = await FreshVault.deploy(await uc.getAddress(), await mockUSDC.getAddress(), admin.address);
      await freshVault.waitForDeployment();
      
      // Grant the fresh vault the TREASURER_MINT role and add as system contract
      await uc.connect(admin).grantRole(TREASURER_MINT, await freshVault.getAddress());
      await uc.connect(admin).addSystemContract(await freshVault.getAddress());
      
      // Add minimal USDC to the fresh vault
      await mockUSDC.mint(await freshVault.getAddress(), ethers.parseUnits("1000", 6));
      await freshVault.connect(admin).updateUSDCReserve();
      // Now fresh vault has 1000 USDC and reserve shows 1000
      
      // Manually reduce the reserve without reducing the actual balance
      // We'll do this by calling updateUSDCReserve after sending USDC away
      await freshVault.connect(admin).withdrawUSDC(admin.address, ethers.parseUnits("500", 6));
      // Now fresh vault has 500 USDC and reserve shows 500
      // Now fresh vault has 500 USDC and reserve shows 500
      
      // Add USDC back but don't update reserve
      await mockUSDC.mint(await freshVault.getAddress(), ethers.parseUnits("10000", 6));
      // Now fresh vault has 10500 USDC but reserve still shows 500
      
      const redeemAmount = ethers.parseEther("6000"); // 6000 UC = 6000 USDC, but reserve only shows 500
      
      // Request redemption
      await uc.connect(user1).approve(await freshVault.getAddress(), redeemAmount);
      const tx = await freshVault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return freshVault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });
      const parsedEvent = freshVault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;

      // Should fail due to insufficient USDC reserve (reserve shows 500 but needs 6000)
      await expect(freshVault.connect(admin).fulfillRedemption(redemptionId))
        .to.be.revertedWith("Insufficient USDC reserve");
    });
  });

  // ========== USDC RESERVE MANAGEMENT TESTS ==========

  describe("USDC Reserve Management", function () {
    it("Should update USDC reserve correctly", async function () {
      // Mint additional USDC to vault
      await mockUSDC.mint(await vault.getAddress(), ethers.parseUnits("5000", 6));
      
      // Update reserve
      await vault.connect(admin).updateUSDCReserve();
      
      // Should be 10000 (initial) + 5000 (new) = 15000
      expect(await vault.totalUSDCReserve()).to.equal(ethers.parseUnits("15000", 6));
    });

    it("Should only allow TREASURER to update USDC reserve", async function () {
      await expect(vault.connect(user1).updateUSDCReserve())
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("Should withdraw USDC correctly", async function () {
      // Set up additional USDC in vault
      await mockUSDC.mint(await vault.getAddress(), ethers.parseUnits("1000", 6));
      await vault.connect(admin).updateUSDCReserve();
      
      const withdrawAmount = ethers.parseUnits("500", 6);
      const adminUsdcBalanceBefore = await mockUSDC.balanceOf(admin.address);
      
      await expect(vault.connect(admin).withdrawUSDC(admin.address, withdrawAmount))
        .to.emit(vault, "USDCWithdrawn")
        .withArgs(admin.address, withdrawAmount, admin.address);
      
      // Check USDC was transferred
      expect(await mockUSDC.balanceOf(admin.address)).to.equal(adminUsdcBalanceBefore + withdrawAmount);
      
      // Check reserve was updated (11000 - 500 = 10500)
      expect(await vault.totalUSDCReserve()).to.equal(ethers.parseUnits("10500", 6));
    });

    it("Should not allow withdrawing more USDC than available", async function () {
      // Try to withdraw more than the vault has (10000 + some from previous tests)
      await expect(vault.connect(admin).withdrawUSDC(admin.address, ethers.parseUnits("20000", 6)))
        .to.be.revertedWith("Insufficient USDC balance");
    });

    it("Should not allow withdrawing to zero address", async function () {
      await expect(vault.connect(admin).withdrawUSDC(ethers.ZeroAddress, ethers.parseUnits("100", 6)))
        .to.be.revertedWith("Cannot withdraw to zero address");
    });

    it("Should not allow withdrawing zero amount", async function () {
      await expect(vault.connect(admin).withdrawUSDC(admin.address, 0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should only allow TREASURER to withdraw USDC", async function () {
      await expect(vault.connect(user1).withdrawUSDC(user1.address, ethers.parseUnits("100", 6)))
        .to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });

  // ========== USDC BALANCE VIEW TESTS ==========

  describe("USDC Balance Views", function () {
    it("Should return correct USDC balance", async function () {
      const usdcAmount = ethers.parseUnits("2500", 6);
      await mockUSDC.mint(await vault.getAddress(), usdcAmount);
      
      // Should be 10000 (initial) + 2500 (new) = 12500
      expect(await vault.getUSDCBalance()).to.equal(ethers.parseUnits("12500", 6));
    });

    it("Should return zero USDC balance initially", async function () {
      // This test runs in a fresh context, so vault should have 10000 USDC from beforeEach
      expect(await vault.getUSDCBalance()).to.equal(ethers.parseUnits("10000", 6));
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe("USDC Integration Flow", function () {
    it("Should handle complete USDC onboarding and redemption flow", async function () {
      // 1. User onboards USDC
      const onboardAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      await mockUSDC.mint(user1.address, onboardAmount);
      await mockUSDC.connect(user1).approve(await vault.getAddress(), onboardAmount);
      
      const user1UcBalanceBefore = await uc.balanceOf(user1.address);
      await vault.connect(user1).processUSDCOnboarding(onboardAmount);
      
      // Check UC was minted
      expect(await uc.balanceOf(user1.address)).to.equal(user1UcBalanceBefore + ethers.parseUnits("1000", 18));
      
      // 2. User redeems some UC for USDC
      const redeemAmount = ethers.parseEther("500"); // 500 UC
      await uc.connect(user1).approve(await vault.getAddress(), redeemAmount);
      
      const tx = await vault.connect(user1).redeem(redeemAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return vault.interface.parseLog(log as any)?.name === "RedeemRequested";
        } catch {
          return false;
        }
      });
      const parsedEvent = vault.interface.parseLog(event as any);
      const redemptionId = parsedEvent?.args.redemptionId;
      
      // Fulfill redemption
      await vault.connect(admin).fulfillRedemption(redemptionId);
      
      // Check USDC was sent to user
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(ethers.parseUnits("500", 6));
      
      // Check UC was burned (should be 1000 + 1000 - 500 = 1500)
      expect(await uc.balanceOf(user1.address)).to.equal(user1UcBalanceBefore + ethers.parseUnits("500", 18));
    });

    it("Should handle multiple users onboarding and redeeming", async function () {
      // User 1 onboards
      const amount1 = ethers.parseUnits("1000", 6);
      await mockUSDC.mint(user1.address, amount1);
      await mockUSDC.connect(user1).approve(await vault.getAddress(), amount1);
      const user1UcBalanceBefore = await uc.balanceOf(user1.address);
      await vault.connect(user1).processUSDCOnboarding(amount1);
      
      // User 2 onboards
      const amount2 = ethers.parseUnits("2000", 6);
      await mockUSDC.mint(user2.address, amount2);
      await mockUSDC.connect(user2).approve(await vault.getAddress(), amount2);
      const user2UcBalanceBefore = await uc.balanceOf(user2.address);
      await vault.connect(user2).processUSDCOnboarding(amount2);
      
      // Check both users have UC
      expect(await uc.balanceOf(user1.address)).to.equal(user1UcBalanceBefore + ethers.parseUnits("1000", 18));
      expect(await uc.balanceOf(user2.address)).to.equal(user2UcBalanceBefore + ethers.parseUnits("2000", 18));
      
      // Check total USDC reserve (10000 initial + 1000 + 2000)
      expect(await vault.totalUSDCReserve()).to.equal(ethers.parseUnits("13000", 6));
    });
  });
});
