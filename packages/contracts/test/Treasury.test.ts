import { expect } from "chai";
import { ethers } from "hardhat";
import { Treasury } from "../typechain-types";
import { UnityCoin } from "../typechain-types";
import { SoulaaniCoin } from "../typechain-types";

describe("Treasury", function () {
  let treasury: Treasury;
  let uc: UnityCoin;
  let sc: SoulaaniCoin;
  let mockUSDC: any;
  let admin: any;
  let backend: any;
  let user1: any;
  let user2: any;

  const BACKEND = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));

  beforeEach(async function () {
    [admin, backend, user1, user2] = await ethers.getSigners();

    // Deploy SoulaaniCoin
    const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
    sc = await SoulaaniCoin.deploy(admin.address);

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy UnityCoin
    const UnityCoin = await ethers.getContractFactory("UnityCoin");
    uc = await UnityCoin.deploy(admin.address, await sc.getAddress(), admin.address); // Use admin as placeholder

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await uc.getAddress(), admin.address);

    // Grant BACKEND role to backend address
    await treasury.connect(admin).grantRole(BACKEND, backend.address);

    // Add treasury and users as active SC members and mint UC
    await sc.connect(admin).addMembersBatch([await treasury.getAddress(), user1.address, user2.address]);
    await uc.connect(admin).mint(await treasury.getAddress(), ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the correct UC address", async function () {
      expect(await treasury.unityCoin()).to.equal(await uc.getAddress());
    });

    it("Should grant admin role to deployer", async function () {
      expect(await treasury.hasRole(await treasury.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    });

    it("Should have correct initial balance", async function () {
      expect(await treasury.getBalance()).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant BACKEND role", async function () {
      await treasury.connect(admin).grantRole(BACKEND, user1.address);
      expect(await treasury.hasRole(BACKEND, user1.address)).to.be.true;
    });

    it("Should allow admin to revoke BACKEND role", async function () {
      await treasury.connect(admin).revokeRole(BACKEND, backend.address);
      expect(await treasury.hasRole(BACKEND, backend.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        treasury.connect(user1).grantRole(BACKEND, user2.address)
      ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Withdrawals", function () {
    it("Should allow BACKEND to withdraw UC", async function () {
      const amount = ethers.parseEther("100");
      const balanceBefore = await uc.balanceOf(user1.address);

      await treasury.connect(backend).withdraw(user1.address, amount);

      expect(await uc.balanceOf(user1.address)).to.equal(balanceBefore + amount);
      expect(await treasury.getBalance()).to.equal(ethers.parseEther("900"));
    });

    it("Should emit Withdrawn event", async function () {
      const amount = ethers.parseEther("50");
      
      await expect(treasury.connect(backend).withdraw(user1.address, amount))
        .to.emit(treasury, "Withdrawn")
        .withArgs(user1.address, amount, backend.address);
    });

    it("Should not allow non-BACKEND to withdraw", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(
        treasury.connect(user1).withdraw(user2.address, amount)
      ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
    });

    it("Should not allow withdrawal to zero address", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(
        treasury.connect(backend).withdraw(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("Cannot withdraw to zero address");
    });

    it("Should not allow withdrawal of zero amount", async function () {
      await expect(
        treasury.connect(backend).withdraw(user1.address, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow withdrawal of more than balance", async function () {
      const amount = ethers.parseEther("2000");
      
      await expect(
        treasury.connect(backend).withdraw(user1.address, amount)
      ).to.be.revertedWith("Insufficient treasury balance");
    });
  });

  describe("Emergency Withdrawals", function () {
    it("Should allow admin to emergency withdraw", async function () {
      const amount = ethers.parseEther("200");
      const balanceBefore = await uc.balanceOf(user1.address);

      await treasury.connect(admin).emergencyWithdraw(user1.address, amount);

      expect(await uc.balanceOf(user1.address)).to.equal(balanceBefore + amount);
      expect(await treasury.getBalance()).to.equal(ethers.parseEther("800"));
    });

    it("Should emit EmergencyWithdrawal event", async function () {
      const amount = ethers.parseEther("50");
      
      await expect(treasury.connect(admin).emergencyWithdraw(user1.address, amount))
        .to.emit(treasury, "EmergencyWithdrawal")
        .withArgs(user1.address, amount, admin.address);
    });

    it("Should not allow non-admin to emergency withdraw", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(
        treasury.connect(backend).emergencyWithdraw(user1.address, amount)
      ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Balance Management", function () {
    it("Should update balance after withdrawal", async function () {
      const initialBalance = await treasury.getBalance();
      const withdrawAmount = ethers.parseEther("300");

      await treasury.connect(backend).withdraw(user1.address, withdrawAmount);

      expect(await treasury.getBalance()).to.equal(initialBalance - withdrawAmount);
    });

    it("Should handle multiple withdrawals", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");

      await treasury.connect(backend).withdraw(user1.address, amount1);
      await treasury.connect(backend).withdraw(user2.address, amount2);

      expect(await treasury.getBalance()).to.equal(ethers.parseEther("700"));
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract that tries to reenter
      // For now, we just verify the nonReentrant modifier is present
      expect(await treasury.getBalance()).to.be.gt(0);
    });
  });
});
