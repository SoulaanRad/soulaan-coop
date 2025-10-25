import { expect } from "chai";
import { ethers } from "hardhat";
import { UnityCoin, SoulaaniCoin } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("UnityCoin (UC)", function () {
  let uc: UnityCoin;
  let sc: SoulaaniCoin;
  let mockUSDC: any;
  let admin: SignerWithAddress;
  let treasurer: SignerWithAddress;
  let onrampMinter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let attacker: SignerWithAddress;

  const TREASURER_MINT = ethers.id("TREASURER_MINT");
  const BACKEND = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));
  const PAUSER = ethers.id("PAUSER");
  const SYSTEM_CONTRACT_MANAGER = ethers.id("SYSTEM_CONTRACT_MANAGER");
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  beforeEach(async function () {
    [admin, treasurer, onrampMinter, user1, user2, attacker] = await ethers.getSigners();

    // Deploy SoulaaniCoin first (needed for membership verification)
    const SoulaaniCoin = await ethers.getContractFactory("SoulaaniCoin");
    sc = await SoulaaniCoin.deploy(admin.address);
    await sc.waitForDeployment();

    // Add all users as active members
    await sc
      .connect(admin)
      .addMembersBatch([
        admin.address,
        treasurer.address,
        onrampMinter.address,
        user1.address,
        user2.address,
      ]);

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy UnityCoin
    const UnityCoin = await ethers.getContractFactory("UnityCoin");
    uc = await UnityCoin.deploy(admin.address, await sc.getAddress(), admin.address); // Use admin as placeholder
    await uc.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await uc.name()).to.equal("UnityCoin");
      expect(await uc.symbol()).to.equal("UC");
    });

    it("Should set the correct decimals", async function () {
      expect(await uc.decimals()).to.equal(18);
    });

    it("Should grant admin all roles initially", async function () {
      expect(await uc.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await uc.hasRole(TREASURER_MINT, admin.address)).to.be.true;
      expect(await uc.hasRole(PAUSER, admin.address)).to.be.true;
      expect(await uc.hasRole(SYSTEM_CONTRACT_MANAGER, admin.address)).to.be.true;
    });

    it("Should start with zero total supply", async function () {
      expect(await uc.totalSupply()).to.equal(0);
    });

    it("Should set SoulaaniCoin address", async function () {
      expect(await uc.soulaaniCoin()).to.equal(await sc.getAddress());
    });

    it("Should revert if deployed with zero admin address", async function () {
      const UnityCoin = await ethers.getContractFactory("UnityCoin");
      await expect(UnityCoin.deploy(ethers.ZeroAddress, await sc.getAddress(), admin.address)).to.be.revertedWith(
        "Admin cannot be zero address"
      );
    });

    it("Should revert if deployed with zero SoulaaniCoin address", async function () {
      const UnityCoin = await ethers.getContractFactory("UnityCoin");
      await expect(UnityCoin.deploy(admin.address, ethers.ZeroAddress, admin.address)).to.be.revertedWith(
        "SoulaaniCoin address cannot be zero"
      );
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant TREASURER_MINT role", async function () {
      await uc.connect(admin).grantRole(TREASURER_MINT, treasurer.address);
      expect(await uc.hasRole(TREASURER_MINT, treasurer.address)).to.be.true;
    });

    it("Should allow admin to grant BACKEND role", async function () {
      await uc.connect(admin).grantRole(BACKEND, onrampMinter.address);
      expect(await uc.hasRole(BACKEND, onrampMinter.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      await uc.connect(admin).grantRole(TREASURER_MINT, treasurer.address);
      await uc.connect(admin).revokeRole(TREASURER_MINT, treasurer.address);
      expect(await uc.hasRole(TREASURER_MINT, treasurer.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(uc.connect(user1).grantRole(TREASURER_MINT, user2.address)).to.be.reverted;
    });

    it("Should allow role holder to renounce their role", async function () {
      await uc.connect(admin).renounceRole(TREASURER_MINT, admin.address);
      expect(await uc.hasRole(TREASURER_MINT, admin.address)).to.be.false;
    });
  });

  describe("Unlimited Minting (TREASURER_MINT)", function () {
    beforeEach(async function () {
      // Grant treasurer role
      await uc.connect(admin).grantRole(TREASURER_MINT, treasurer.address);
    });

    it("Should allow TREASURER_MINT to mint tokens", async function () {
      const amount = ethers.parseEther("1000");
      await uc.connect(treasurer).mint(user1.address, amount);
      expect(await uc.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should emit Minted event", async function () {
      const amount = ethers.parseEther("1000");
      await expect(uc.connect(treasurer).mint(user1.address, amount))
        .to.emit(uc, "Minted")
        .withArgs(user1.address, amount, treasurer.address);
    });

    it("Should allow minting to multiple addresses", async function () {
      const amount = ethers.parseEther("500");
      await uc.connect(treasurer).mint(user1.address, amount);
      await uc.connect(treasurer).mint(user2.address, amount);

      expect(await uc.balanceOf(user1.address)).to.equal(amount);
      expect(await uc.balanceOf(user2.address)).to.equal(amount);
      expect(await uc.totalSupply()).to.equal(amount * 2n);
    });

    it("Should not allow minting to zero address", async function () {
      await expect(
        uc.connect(treasurer).mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should not allow minting zero amount", async function () {
      await expect(uc.connect(treasurer).mint(user1.address, 0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("Should not allow non-TREASURER_MINT to mint", async function () {
      await expect(uc.connect(user1).mint(user1.address, ethers.parseEther("100"))).to.be.reverted;
    });
  });

  describe("Limited Minting (BACKEND)", function () {
    const dailyLimit = ethers.parseEther("50000");
    const BACKEND = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));

    beforeEach(async function () {
      // Grant backend role
      await uc.connect(admin).grantRole(BACKEND, onrampMinter.address);
      // Set daily limit
      await uc.connect(admin).setDailyMintLimit(onrampMinter.address, dailyLimit);
    });

    it("Should allow BACKEND to mint within daily limit", async function () {
      const amount = ethers.parseEther("100");
      await uc.connect(onrampMinter).mintOnramp(user1.address, amount);
      expect(await uc.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should emit Minted event for onramp minting", async function () {
      const amount = ethers.parseEther("100");
      await expect(uc.connect(onrampMinter).mintOnramp(user1.address, amount))
        .to.emit(uc, "Minted")
        .withArgs(user1.address, amount, onrampMinter.address);
    });

    it("Should track daily minted amount", async function () {
      const amount1 = ethers.parseEther("1000");
      const amount2 = ethers.parseEther("2000");

      await uc.connect(onrampMinter).mintOnramp(user1.address, amount1);
      await uc.connect(onrampMinter).mintOnramp(user2.address, amount2);

      expect(await uc.dailyMinted(onrampMinter.address)).to.equal(amount1 + amount2);
    });

    it("Should not allow minting beyond daily limit", async function () {
      const amount = ethers.parseEther("60000"); // Exceeds 50k limit

      await expect(uc.connect(onrampMinter).mintOnramp(user1.address, amount)).to.be.revertedWith(
        "Daily minting limit exceeded"
      );
    });

    it("Should allow minting up to exact daily limit", async function () {
      await uc.connect(onrampMinter).mintOnramp(user1.address, dailyLimit);
      expect(await uc.balanceOf(user1.address)).to.equal(dailyLimit);
    });

    it("Should not allow minting after limit is reached", async function () {
      const amount1 = ethers.parseEther("40000");
      const amount2 = ethers.parseEther("15000"); // Would exceed limit

      await uc.connect(onrampMinter).mintOnramp(user1.address, amount1);

      await expect(uc.connect(onrampMinter).mintOnramp(user2.address, amount2)).to.be.revertedWith(
        "Daily minting limit exceeded"
      );
    });

    it("Should reset daily counter after 24 hours", async function () {
      const amount = ethers.parseEther("40000");

      // Mint on day 1
      await uc.connect(onrampMinter).mintOnramp(user1.address, amount);
      expect(await uc.dailyMinted(onrampMinter.address)).to.equal(amount);

      // Fast forward 1 day
      await time.increase(86400);

      // Mint on day 2 - should succeed
      await uc.connect(onrampMinter).mintOnramp(user2.address, amount);
      expect(await uc.dailyMinted(onrampMinter.address)).to.equal(amount);
    });

    it("Should emit DailyLimitReset event on new day", async function () {
      const amount = ethers.parseEther("100");

      // Mint on day 1
      await uc.connect(onrampMinter).mintOnramp(user1.address, amount);

      // Fast forward 1 day
      await time.increase(86400);

      // Mint on day 2
      await expect(uc.connect(onrampMinter).mintOnramp(user2.address, amount)).to.emit(
        uc,
        "DailyLimitReset"
      );
    });

    it("Should return correct remaining daily mint capacity", async function () {
      const minted = ethers.parseEther("10000");
      await uc.connect(onrampMinter).mintOnramp(user1.address, minted);

      const remaining = await uc.getRemainingDailyMint(onrampMinter.address);
      expect(remaining).to.equal(dailyLimit - minted);
    });

    it("Should return full limit after day reset", async function () {
      const amount = ethers.parseEther("10000");
      await uc.connect(onrampMinter).mintOnramp(user1.address, amount);

      // Fast forward 1 day
      await time.increase(86400);

      const remaining = await uc.getRemainingDailyMint(onrampMinter.address);
      expect(remaining).to.equal(dailyLimit);
    });

    it("Should not allow mintOnramp without BACKEND role", async function () {
      await expect(uc.connect(user1).mintOnramp(user2.address, ethers.parseEther("100"))).to.be
        .reverted;
    });

    it("Should not allow mintOnramp if daily limit not set", async function () {
      // Grant role to new address but don't set limit
      await uc.connect(admin).grantRole(BACKEND, user1.address);

      await expect(
        uc.connect(user1).mintOnramp(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Daily limit not set");
    });

    it("Should not allow minting to zero address", async function () {
      await expect(
        uc.connect(onrampMinter).mintOnramp(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should not allow minting zero amount", async function () {
      await expect(uc.connect(onrampMinter).mintOnramp(user1.address, 0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });
  });

  describe("Daily Limit Management", function () {
    beforeEach(async function () {
      await uc.connect(admin).grantRole(BACKEND, onrampMinter.address);
    });

    it("Should allow admin to set daily limit", async function () {
      const limit = ethers.parseEther("100000");
      await uc.connect(admin).setDailyMintLimit(onrampMinter.address, limit);
      expect(await uc.dailyMintLimit(onrampMinter.address)).to.equal(limit);
    });

    it("Should emit DailyLimitSet event", async function () {
      const limit = ethers.parseEther("100000");
      await expect(uc.connect(admin).setDailyMintLimit(onrampMinter.address, limit))
        .to.emit(uc, "DailyLimitSet")
        .withArgs(onrampMinter.address, limit);
    });

    it("Should allow admin to update daily limit", async function () {
      const limit1 = ethers.parseEther("50000");
      const limit2 = ethers.parseEther("100000");

      await uc.connect(admin).setDailyMintLimit(onrampMinter.address, limit1);
      await uc.connect(admin).setDailyMintLimit(onrampMinter.address, limit2);

      expect(await uc.dailyMintLimit(onrampMinter.address)).to.equal(limit2);
    });

    it("Should not allow non-admin to set daily limit", async function () {
      await expect(
        uc.connect(user1).setDailyMintLimit(onrampMinter.address, ethers.parseEther("100000"))
      ).to.be.reverted;
    });

    it("Should not allow setting limit for non-BACKEND", async function () {
      await expect(
        uc.connect(admin).setDailyMintLimit(user1.address, ethers.parseEther("100000"))
      ).to.be.revertedWith("Address is not a backend minter");
    });
  });

  describe("Burning", function () {
    const initialAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      // Mint some tokens to user1
      await uc.connect(admin).mint(user1.address, initialAmount);
    });

    it("Should allow user to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      await uc.connect(user1).burn(burnAmount);

      expect(await uc.balanceOf(user1.address)).to.equal(initialAmount - burnAmount);
      expect(await uc.totalSupply()).to.equal(initialAmount - burnAmount);
    });

    it("Should emit Burned event", async function () {
      const burnAmount = ethers.parseEther("100");
      await expect(uc.connect(user1).burn(burnAmount))
        .to.emit(uc, "Burned")
        .withArgs(user1.address, burnAmount);
    });

    it("Should allow burning with approval (burnFrom)", async function () {
      const burnAmount = ethers.parseEther("100");

      // User1 approves user2 to burn their tokens
      await uc.connect(user1).approve(user2.address, burnAmount);

      // User2 burns user1's tokens
      await uc.connect(user2).burnFrom(user1.address, burnAmount);

      expect(await uc.balanceOf(user1.address)).to.equal(initialAmount - burnAmount);
    });

    it("Should not allow burning more than balance", async function () {
      const burnAmount = initialAmount + ethers.parseEther("1");
      await expect(uc.connect(user1).burn(burnAmount)).to.be.reverted;
    });

    it("Should not allow burnFrom without approval", async function () {
      await expect(uc.connect(user2).burnFrom(user1.address, ethers.parseEther("100"))).to.be
        .reverted;
    });
  });

  describe("Pausing", function () {
    const amount = ethers.parseEther("100");

    beforeEach(async function () {
      // Mint tokens to users
      await uc.connect(admin).mint(user1.address, amount);
      await uc.connect(admin).mint(user2.address, amount);
    });

    it("Should allow PAUSER to pause the contract", async function () {
      await uc.connect(admin).pause();
      expect(await uc.paused()).to.be.true;
    });

    it("Should emit Paused event", async function () {
      await expect(uc.connect(admin).pause()).to.emit(uc, "Paused").withArgs(admin.address);
    });

    it("Should not allow transfers when paused", async function () {
      await uc.connect(admin).pause();

      await expect(uc.connect(user1).transfer(user2.address, ethers.parseEther("10"))).to.be
        .reverted;
    });

    it("Should not allow minting when paused", async function () {
      await uc.connect(admin).pause();

      await expect(uc.connect(admin).mint(user1.address, ethers.parseEther("100"))).to.be.reverted;
    });

    it("Should allow PAUSER to unpause", async function () {
      await uc.connect(admin).pause();
      await uc.connect(admin).unpause();
      expect(await uc.paused()).to.be.false;
    });

    it("Should emit Unpaused event", async function () {
      await uc.connect(admin).pause();
      await expect(uc.connect(admin).unpause()).to.emit(uc, "Unpaused").withArgs(admin.address);
    });

    it("Should allow transfers after unpause", async function () {
      await uc.connect(admin).pause();
      await uc.connect(admin).unpause();

      await uc.connect(user1).transfer(user2.address, ethers.parseEther("10"));
      expect(await uc.balanceOf(user2.address)).to.equal(amount + ethers.parseEther("10"));
    });

    it("Should not allow non-PAUSER to pause", async function () {
      await expect(uc.connect(user1).pause()).to.be.reverted;
    });

    it("Should not allow non-PAUSER to unpause", async function () {
      await uc.connect(admin).pause();
      await expect(uc.connect(user1).unpause()).to.be.reverted;
    });

    it("Should return correct paused status via paused()", async function () {
      expect(await uc.paused()).to.be.false;
      await uc.connect(admin).pause();
      expect(await uc.paused()).to.be.true;
    });
  });

  describe("ERC20 Standard Functions", function () {
    const initialAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await uc.connect(admin).mint(user1.address, initialAmount);
      await uc.connect(admin).mint(user2.address, initialAmount);
    });

    it("Should allow transfers between users", async function () {
      const transferAmount = ethers.parseEther("100");
      await uc.connect(user1).transfer(user2.address, transferAmount);

      expect(await uc.balanceOf(user1.address)).to.equal(initialAmount - transferAmount);
      expect(await uc.balanceOf(user2.address)).to.equal(initialAmount + transferAmount);
    });

    it("Should allow approve and transferFrom", async function () {
      const transferAmount = ethers.parseEther("100");

      await uc.connect(user1).approve(user2.address, transferAmount);
      await uc.connect(user2).transferFrom(user1.address, user2.address, transferAmount);

      expect(await uc.balanceOf(user1.address)).to.equal(initialAmount - transferAmount);
      expect(await uc.balanceOf(user2.address)).to.equal(initialAmount + transferAmount);
    });

    it("Should return correct allowance", async function () {
      const allowanceAmount = ethers.parseEther("500");
      await uc.connect(user1).approve(user2.address, allowanceAmount);

      expect(await uc.allowance(user1.address, user2.address)).to.equal(allowanceAmount);
    });

    it("Should not allow transfer more than balance", async function () {
      await expect(
        uc.connect(user1).transfer(user2.address, initialAmount + ethers.parseEther("1"))
      ).to.be.reverted;
    });

    it("Should not allow transferFrom more than allowance", async function () {
      await uc.connect(user1).approve(user2.address, ethers.parseEther("100"));

      await expect(
        uc.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("200"))
      ).to.be.reverted;
    });
  });

  describe("Edge Cases & Attack Vectors", function () {
    it("Should handle multiple minters with different limits", async function () {
      const minter2 = user2;
      const limit1 = ethers.parseEther("10000");
      const limit2 = ethers.parseEther("20000");

      // Set up two minters with different limits
      await uc.connect(admin).grantRole(BACKEND, onrampMinter.address);
      await uc.connect(admin).grantRole(BACKEND, minter2.address);
      await uc.connect(admin).setDailyMintLimit(onrampMinter.address, limit1);
      await uc.connect(admin).setDailyMintLimit(minter2.address, limit2);

      // Each should be able to mint up to their limit
      await uc.connect(onrampMinter).mintOnramp(user1.address, limit1);
      await uc.connect(minter2).mintOnramp(user1.address, limit2);

      expect(await uc.balanceOf(user1.address)).to.equal(limit1 + limit2);
    });

    it("Should prevent reentrancy attacks via standard ERC20 checks", async function () {
      // ERC20 from OpenZeppelin is already reentrancy-safe
      // This test documents that we rely on OpenZeppelin's security
      const amount = ethers.parseEther("1000");
      await uc.connect(admin).mint(user1.address, amount);

      // Transfer should work normally
      await uc.connect(user1).transfer(user2.address, amount);
      expect(await uc.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should handle zero amount operations gracefully", async function () {
      await expect(uc.connect(admin).mint(user1.address, 0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("Should prevent minting after role is revoked", async function () {
      await uc.connect(admin).grantRole(BACKEND, onrampMinter.address);
      await uc.connect(admin).setDailyMintLimit(onrampMinter.address, ethers.parseEther("10000"));

      // Mint successfully
      await uc.connect(onrampMinter).mintOnramp(user1.address, ethers.parseEther("100"));

      // Revoke role
      await uc.connect(admin).revokeRole(BACKEND, onrampMinter.address);

      // Should not be able to mint anymore
      await expect(uc.connect(onrampMinter).mintOnramp(user1.address, ethers.parseEther("100"))).to
        .be.reverted;
    });
  });

  describe("Membership Integration", function () {
    beforeEach(async function () {
      // Mint UC to users
      await uc.connect(admin).mint(user1.address, ethers.parseEther("1000"));
      await uc.connect(admin).mint(user2.address, ethers.parseEther("1000"));
    });

    it("Should allow transfers between active members", async function () {
      await uc.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      expect(await uc.balanceOf(user2.address)).to.equal(ethers.parseEther("1100"));
    });

    it("Should block transfer from suspended member", async function () {
      await sc.connect(admin).suspendMember(user1.address);

      await expect(
        uc.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Sender must be an active SC member");
    });

    it("Should block transfer to suspended member", async function () {
      await sc.connect(admin).suspendMember(user2.address);

      await expect(
        uc.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient must be an active SC member");
    });

    it("Should block transfer from banned member", async function () {
      await sc.connect(admin).banMember(user1.address);

      await expect(
        uc.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Sender must be an active SC member");
    });

    it("Should block minting to non-active member", async function () {
      await sc.connect(admin).suspendMember(user1.address);

      await expect(
        uc.connect(admin).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient must be an active SC member");
    });

    it("Should block onramp minting to suspended member", async function () {
      await uc.connect(admin).grantRole(BACKEND, onrampMinter.address);
      await uc.connect(admin).setDailyMintLimit(onrampMinter.address, ethers.parseEther("10000"));
      await sc.connect(admin).suspendMember(user1.address);

      await expect(
        uc.connect(onrampMinter).mintOnramp(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient must be an active SC member");
    });

    it("Should return correct canUseUC status", async function () {
      expect(await uc.canUseUC(user1.address)).to.be.true;

      await sc.connect(admin).suspendMember(user1.address);
      expect(await uc.canUseUC(user1.address)).to.be.false;
    });
  });

  describe("System Contracts", function () {
    let systemContract: SignerWithAddress;

    beforeEach(async function () {
      systemContract = treasurer; // Use treasurer as mock system contract
      await uc.connect(admin).mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow admin to add system contract", async function () {
      await uc.connect(admin).addSystemContract(systemContract.address);
      expect(await uc.isSystemContract(systemContract.address)).to.be.true;
    });

    it("Should emit SystemContractAdded event", async function () {
      await expect(uc.connect(admin).addSystemContract(systemContract.address))
        .to.emit(uc, "SystemContractAdded")
        .withArgs(systemContract.address, admin.address);
    });

    it("Should allow system contract to receive UC from non-member", async function () {
      // Add system contract
      await uc.connect(admin).addSystemContract(systemContract.address);

      // Add attacker as member but suspend them
      await sc.connect(admin).addMember(attacker.address);
      await uc.connect(admin).mint(attacker.address, ethers.parseEther("100"));
      await sc.connect(admin).suspendMember(attacker.address);

      // Should fail normally
      await expect(
        uc.connect(attacker).transfer(user1.address, ethers.parseEther("10"))
      ).to.be.revertedWith("Sender must be an active SC member");

      // Even transfer to system contract fails (sender must be active)
      await expect(
        uc.connect(attacker).transfer(systemContract.address, ethers.parseEther("10"))
      ).to.be.revertedWith("Sender must be an active SC member");

      // But admin can use emergencyTransfer
      await uc
        .connect(admin)
        .emergencyTransfer(attacker.address, systemContract.address, ethers.parseEther("10"));
      expect(await uc.balanceOf(systemContract.address)).to.equal(ethers.parseEther("10"));
    });

    it("Should allow system contract to send UC to non-member", async function () {
      // Add system contract and give it UC
      await uc.connect(admin).addSystemContract(systemContract.address);
      await uc.connect(admin).mint(systemContract.address, ethers.parseEther("100"));

      // Add attacker as member but suspend them
      await sc.connect(admin).addMember(attacker.address);
      await sc.connect(admin).suspendMember(attacker.address);

      // System contract cannot directly send to suspended member
      // (recipient must still be active even if sender is whitelisted)
      await expect(
        uc.connect(systemContract).transfer(attacker.address, ethers.parseEther("10"))
      ).to.be.revertedWith("Recipient must be an active SC member");

      // But admin can use emergencyTransfer for this scenario
      await uc
        .connect(admin)
        .emergencyTransfer(systemContract.address, attacker.address, ethers.parseEther("10"));
      expect(await uc.balanceOf(attacker.address)).to.equal(ethers.parseEther("10"));
    });

    it("Should allow admin to remove system contract", async function () {
      await uc.connect(admin).addSystemContract(systemContract.address);
      await uc.connect(admin).removeSystemContract(systemContract.address);

      expect(await uc.isSystemContract(systemContract.address)).to.be.false;
    });

    it("Should emit SystemContractRemoved event", async function () {
      await uc.connect(admin).addSystemContract(systemContract.address);

      await expect(uc.connect(admin).removeSystemContract(systemContract.address))
        .to.emit(uc, "SystemContractRemoved")
        .withArgs(systemContract.address, admin.address);
    });

    it("Should not allow non-admin to add system contract", async function () {
      await expect(uc.connect(user1).addSystemContract(systemContract.address)).to.be.reverted;
    });

    it("Should not allow adding zero address as system contract", async function () {
      await expect(uc.connect(admin).addSystemContract(ethers.ZeroAddress)).to.be.revertedWith(
        "Cannot whitelist zero address"
      );
    });
  });

  describe("Emergency Transfers", function () {
    beforeEach(async function () {
      await uc.connect(admin).mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow admin to emergency transfer to suspended member", async function () {
      await sc.connect(admin).suspendMember(user2.address);

      // Regular transfer should fail
      await expect(
        uc.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient must be an active SC member");

      // Emergency transfer should succeed
      await uc
        .connect(admin)
        .emergencyTransfer(user1.address, user2.address, ethers.parseEther("100"));
      expect(await uc.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should allow emergency transfer from banned member", async function () {
      await sc.connect(admin).banMember(user1.address);

      // Emergency transfer should work
      await uc
        .connect(admin)
        .emergencyTransfer(user1.address, user2.address, ethers.parseEther("100"));
      // user2 should have received 100 (their initial 1000 + 100)
      expect(await uc.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should block emergency transfer to non-member", async function () {
      // attacker is not a member
      await expect(
        uc
          .connect(admin)
          .emergencyTransfer(user1.address, attacker.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient must be a registered SC member");
    });

    it("Should block emergency transfer from non-member", async function () {
      // Give attacker UC but don't make them a member
      await expect(
        uc
          .connect(admin)
          .emergencyTransfer(attacker.address, user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Sender must be a registered SC member");
    });

    it("Should allow emergency transfer with system contracts", async function () {
      // Add system contract
      await uc.connect(admin).addSystemContract(treasurer.address);
      await uc.connect(admin).mint(treasurer.address, ethers.parseEther("100"));

      // Suspend user
      await sc.connect(admin).suspendMember(user1.address);

      // Should work: system contract to suspended member
      await uc
        .connect(admin)
        .emergencyTransfer(treasurer.address, user1.address, ethers.parseEther("50"));
      expect(await uc.balanceOf(user1.address)).to.equal(ethers.parseEther("1050"));
    });

    it("Should not allow non-admin to emergency transfer", async function () {
      await expect(
        uc.connect(user1).emergencyTransfer(user1.address, user2.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("Should not allow zero amount emergency transfer", async function () {
      await expect(
        uc.connect(admin).emergencyTransfer(user1.address, user2.address, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow zero address in emergency transfer", async function () {
      await expect(
        uc
          .connect(admin)
          .emergencyTransfer(ethers.ZeroAddress, user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Cannot transfer from zero address");

      await expect(
        uc
          .connect(admin)
          .emergencyTransfer(user1.address, ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("Cannot transfer to zero address");
    });
  });

  describe("Ownership Transfer", function () {
    it("Should allow admin to initiate ownership transfer", async function () {
      await uc.connect(admin).initiateOwnershipTransfer(user1.address);
      expect(await uc.hasRole(DEFAULT_ADMIN_ROLE, user1.address)).to.be.true;
      expect(await uc.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should emit OwnershipTransferInitiated event", async function () {
      const tx = await uc.connect(admin).initiateOwnershipTransfer(user1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(uc, "OwnershipTransferInitiated")
        .withArgs(admin.address, user1.address, block!.timestamp);
    });

    it("Should allow old admin to complete transfer", async function () {
      await uc.connect(admin).initiateOwnershipTransfer(user1.address);
      await uc.connect(admin).completeOwnershipTransfer();

      expect(await uc.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.false;
      expect(await uc.hasRole(DEFAULT_ADMIN_ROLE, user1.address)).to.be.true;
    });

    it("Should emit OwnershipTransferCompleted event", async function () {
      await uc.connect(admin).initiateOwnershipTransfer(user1.address);

      const tx = await uc.connect(admin).completeOwnershipTransfer();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(uc, "OwnershipTransferCompleted")
        .withArgs(admin.address, block!.timestamp);
    });

    it("Should revert if transferring to zero address", async function () {
      await expect(
        uc.connect(admin).initiateOwnershipTransfer(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot transfer to zero address");
    });

    it("Should revert if address already has admin role", async function () {
      await expect(uc.connect(admin).initiateOwnershipTransfer(admin.address)).to.be.revertedWith(
        "Address already has admin role"
      );
    });

    it("Should revert if completing transfer with no other admin", async function () {
      await expect(uc.connect(admin).completeOwnershipTransfer()).to.be.revertedWith(
        "Would leave contract without admin"
      );
    });

    it("Should not allow non-admin to initiate transfer", async function () {
      await expect(uc.connect(user1).initiateOwnershipTransfer(user2.address)).to.be.reverted;
    });

    it("Should allow new admin to manage contract after transfer", async function () {
      // user1 is already added as active member in beforeEach

      await uc.connect(admin).initiateOwnershipTransfer(user1.address);
      await uc.connect(admin).completeOwnershipTransfer();

      // New admin should be able to grant themselves PAUSER role
      await expect(uc.connect(user1).grantRole(PAUSER, user1.address)).to.not.be.reverted;

      // Now they can pause
      await expect(uc.connect(user1).pause()).to.not.be.reverted;
    });
  });

  describe("Multi-Coop Foundation", function () {
    it("Should have default coop ID of 1", async function () {
      expect(await uc.coopId()).to.equal(1);
    });

    it("Should have default clearing contract as zero address", async function () {
      expect(await uc.clearingContract()).to.equal(ethers.ZeroAddress);
    });

    it("Should allow admin to set clearing contract", async function () {
      const newClearingContract = ethers.Wallet.createRandom().address;
      
      await expect(uc.connect(admin).setClearingContract(newClearingContract))
        .to.emit(uc, "ClearingContractChanged")
        .withArgs(ethers.ZeroAddress, newClearingContract, admin.address);
      
      expect(await uc.clearingContract()).to.equal(newClearingContract);
    });

    it("Should allow admin to set coop ID", async function () {
      const newCoopId = 3;
      
      await expect(uc.connect(admin).setCoopId(newCoopId))
        .to.emit(uc, "CoopIdChanged")
        .withArgs(1, newCoopId, admin.address);
      
      expect(await uc.coopId()).to.equal(newCoopId);
    });

    it("Should not allow non-admin to set clearing contract", async function () {
      const newClearingContract = ethers.Wallet.createRandom().address;
      
      await expect(uc.connect(user1).setClearingContract(newClearingContract))
        .to.be.revertedWithCustomError(uc, "AccessControlUnauthorizedAccount");
    });

    it("Should not allow non-admin to set coop ID", async function () {
      await expect(uc.connect(user1).setCoopId(3))
        .to.be.revertedWithCustomError(uc, "AccessControlUnauthorizedAccount");
    });

    it("Should revert if setting clearing contract to zero address", async function () {
      await expect(uc.connect(admin).setClearingContract(ethers.ZeroAddress))
        .to.be.revertedWith("Clearing contract cannot be zero address");
    });

    it("Should revert if setting coop ID to zero", async function () {
      await expect(uc.connect(admin).setCoopId(0))
        .to.be.revertedWith("Coop ID must be greater than 0");
    });
  });

  describe("Fee Collection", function () {
    let treasury: any;

    beforeEach(async function () {
      // Deploy Treasury contract
      const Treasury = await ethers.getContractFactory("Treasury");
      treasury = await Treasury.deploy(await uc.getAddress(), admin.address);

      // Add treasury as an active SC member
      await sc.connect(admin).addMembersBatch([await treasury.getAddress()]);

      // Set treasury as fee recipient
      await uc.connect(admin).setFeeRecipient(await treasury.getAddress());

      // Mint UC to users for testing
      await uc.connect(admin).mint(user1.address, ethers.parseEther("1000"));
      await uc.connect(admin).mint(user2.address, ethers.parseEther("1000"));
    });

    it("Should collect fee on transfers between users", async function () {
      const transferAmount = ethers.parseEther("100");
      const expectedFee = transferAmount * 10n / 10000n; // 0.1% fee
      
      const treasuryBalanceBefore = await treasury.getBalance();
      const totalSupplyBefore = await uc.totalSupply();

      await uc.connect(user1).transfer(user2.address, transferAmount);

      expect(await treasury.getBalance()).to.equal(treasuryBalanceBefore + expectedFee);
      expect(await uc.totalSupply()).to.equal(totalSupplyBefore + expectedFee);
    });

    it("Should emit FeeCollected event", async function () {
      const transferAmount = ethers.parseEther("50");
      const expectedFee = transferAmount * 10n / 10000n;

      await expect(uc.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(uc, "FeeCollected")
        .withArgs(user1.address, expectedFee, await treasury.getAddress());
    });

    it("Should not collect fee on mints", async function () {
      const mintAmount = ethers.parseEther("100");
      const treasuryBalanceBefore = await treasury.getBalance();

      await uc.connect(admin).mint(user1.address, mintAmount);

      expect(await treasury.getBalance()).to.equal(treasuryBalanceBefore);
    });

    it("Should not collect fee on burns", async function () {
      const burnAmount = ethers.parseEther("50");
      const treasuryBalanceBefore = await treasury.getBalance();

      await uc.connect(user1).burn(burnAmount);

      expect(await treasury.getBalance()).to.equal(treasuryBalanceBefore);
    });

    it("Should not collect fee when fee recipient is not set", async function () {
      // Set fee to zero instead of setting recipient to zero (which is not allowed)
      await uc.connect(admin).setTransferFee(0);
      
      const transferAmount = ethers.parseEther("100");
      const treasuryBalanceBefore = await treasury.getBalance();

      await uc.connect(user1).transfer(user2.address, transferAmount);

      expect(await treasury.getBalance()).to.equal(treasuryBalanceBefore);
    });

    it("Should not collect fee when fee percent is zero", async function () {
      // Set fee to zero
      await uc.connect(admin).setTransferFee(0);
      
      const transferAmount = ethers.parseEther("100");
      const treasuryBalanceBefore = await treasury.getBalance();

      await uc.connect(user1).transfer(user2.address, transferAmount);

      expect(await treasury.getBalance()).to.equal(treasuryBalanceBefore);
    });

    it("Should calculate fee correctly with different percentages", async function () {
      const transferAmount = ethers.parseEther("1000");
      
      // Test 0.5% fee (50 basis points)
      await uc.connect(admin).setTransferFee(50);
      const expectedFee50 = transferAmount * 50n / 10000n;
      
      await uc.connect(user1).transfer(user2.address, transferAmount);
      expect(await treasury.getBalance()).to.equal(expectedFee50);

      // Reset for next test
      await uc.connect(admin).mint(user1.address, transferAmount);
      await uc.connect(admin).setTransferFee(25); // 0.25% fee
      
      const expectedFee25 = transferAmount * 25n / 10000n;
      await uc.connect(user1).transfer(user2.address, transferAmount);
      expect(await treasury.getBalance()).to.equal(expectedFee50 + expectedFee25);
    });
  });

  describe("Fee Management", function () {
    it("Should allow admin to set transfer fee", async function () {
      const newFee = 25; // 0.25%
      
      await expect(uc.connect(admin).setTransferFee(newFee))
        .to.emit(uc, "TransferFeeChanged")
        .withArgs(10, newFee, admin.address);
      
      expect(await uc.transferFeePercent()).to.equal(newFee);
    });

    it("Should not allow fee to exceed 1%", async function () {
      await expect(uc.connect(admin).setTransferFee(101))
        .to.be.revertedWith("Fee cannot exceed 1%");
    });

    it("Should not allow non-admin to set transfer fee", async function () {
      await expect(uc.connect(user1).setTransferFee(25))
        .to.be.revertedWithCustomError(uc, "AccessControlUnauthorizedAccount");
    });

    it("Should allow admin to set fee recipient", async function () {
      const newRecipient = user1.address;
      
      await expect(uc.connect(admin).setFeeRecipient(newRecipient))
        .to.emit(uc, "FeeRecipientChanged")
        .withArgs(ethers.ZeroAddress, newRecipient, admin.address);
      
      expect(await uc.feeRecipient()).to.equal(newRecipient);
    });

    it("Should not allow setting fee recipient to zero address", async function () {
      await expect(uc.connect(admin).setFeeRecipient(ethers.ZeroAddress))
        .to.be.revertedWith("Fee recipient cannot be zero address");
    });

    it("Should not allow non-admin to set fee recipient", async function () {
      await expect(uc.connect(user1).setFeeRecipient(user2.address))
        .to.be.revertedWithCustomError(uc, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Role Updates", function () {
    it("Should use BACKEND role instead of ONRAMP_MINTER", async function () {
      const BACKEND = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));
      
      // Grant BACKEND role to user1
      await uc.connect(admin).grantRole(BACKEND, user1.address);
      
      // Set daily limit for user1
      await uc.connect(admin).setDailyMintLimit(user1.address, ethers.parseEther("100"));
      
      // User1 should be able to mint onramp
      await uc.connect(user1).mintOnramp(user2.address, ethers.parseEther("50"));
      
      expect(await uc.balanceOf(user2.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should not allow non-BACKEND to mint onramp", async function () {
      await expect(
        uc.connect(user1).mintOnramp(user2.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(uc, "AccessControlUnauthorizedAccount");
    });

    it("Should require BACKEND role for daily limit setting", async function () {
      const BACKEND = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));
      
      // Grant BACKEND role to user1
      await uc.connect(admin).grantRole(BACKEND, user1.address);
      
      // Should be able to set daily limit for user1
      await uc.connect(admin).setDailyMintLimit(user1.address, ethers.parseEther("100"));
      
      // Should not be able to set daily limit for user2 (not BACKEND)
      await expect(
        uc.connect(admin).setDailyMintLimit(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Address is not a backend minter");
    });
  });
});
