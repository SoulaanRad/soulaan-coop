import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { PegManager } from "../typechain-types";

describe("PegManager", function () {
  let pegManager: PegManager;
  let admin: any;
  let backend: any;
  let user1: any;

  const BACKEND = ethers.keccak256(ethers.toUtf8Bytes("BACKEND"));

  beforeEach(async function () {
    [admin, backend, user1] = await ethers.getSigners();

    // Deploy PegManager
    const PegManager = await ethers.getContractFactory("PegManager");
    pegManager = await PegManager.deploy(admin.address);

    // Grant BACKEND role to backend address
    await pegManager.connect(admin).grantRole(BACKEND, backend.address);
  });

  describe("Deployment", function () {
    it("Should set initial peg price to 1 USD", async function () {
      expect(await pegManager.currentPegPrice()).to.equal(ethers.parseEther("1"));
    });

    it("Should set initial update time", async function () {
      const lastUpdate = await pegManager.lastUpdate();
      expect(lastUpdate).to.be.gt(0);
    });

    it("Should grant admin role to deployer", async function () {
      expect(await pegManager.hasRole(await pegManager.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant BACKEND role", async function () {
      await pegManager.connect(admin).grantRole(BACKEND, user1.address);
      expect(await pegManager.hasRole(BACKEND, user1.address)).to.be.true;
    });

    it("Should allow admin to revoke BACKEND role", async function () {
      await pegManager.connect(admin).revokeRole(BACKEND, backend.address);
      expect(await pegManager.hasRole(BACKEND, backend.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        pegManager.connect(user1).grantRole(BACKEND, user1.address)
      ).to.be.revertedWithCustomError(pegManager, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Peg Updates", function () {
    it("Should allow BACKEND to update peg price", async function () {
      const newPrice = ethers.parseEther("1.05"); // 1.05 USD
      
      await pegManager.connect(backend).updatePeg(newPrice);
      
      expect(await pegManager.currentPegPrice()).to.equal(newPrice);
    });

    it("Should emit PegUpdated event", async function () {
      const oldPrice = await pegManager.currentPegPrice();
      const newPrice = ethers.parseEther("0.95"); // 0.95 USD
      
      await expect(pegManager.connect(backend).updatePeg(newPrice))
        .to.emit(pegManager, "PegUpdated")
        .withArgs(oldPrice, newPrice, await time.latest(), backend.address);
    });

    it("Should update lastUpdate timestamp", async function () {
      const newPrice = ethers.parseEther("1.1");
      const tx = await pegManager.connect(backend).updatePeg(newPrice);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      
      expect(await pegManager.lastUpdate()).to.equal(block!.timestamp);
    });

    it("Should not allow non-BACKEND to update peg", async function () {
      const newPrice = ethers.parseEther("1.1");
      
      await expect(
        pegManager.connect(user1).updatePeg(newPrice)
      ).to.be.revertedWithCustomError(pegManager, "AccessControlUnauthorizedAccount");
    });

    it("Should not allow setting peg price to zero", async function () {
      await expect(
        pegManager.connect(backend).updatePeg(0)
      ).to.be.revertedWith("Peg price cannot be zero");
    });

    it("Should handle multiple updates", async function () {
      const price1 = ethers.parseEther("1.1");
      const price2 = ethers.parseEther("0.9");
      const price3 = ethers.parseEther("1.2");

      await pegManager.connect(backend).updatePeg(price1);
      expect(await pegManager.currentPegPrice()).to.equal(price1);

      await pegManager.connect(backend).updatePeg(price2);
      expect(await pegManager.currentPegPrice()).to.equal(price2);

      await pegManager.connect(backend).updatePeg(price3);
      expect(await pegManager.currentPegPrice()).to.equal(price3);
    });
  });

  describe("View Functions", function () {
    it("Should return current peg price via getCurrentPegPrice", async function () {
      const currentPrice = await pegManager.currentPegPrice();
      const viewPrice = await pegManager.getCurrentPegPrice();
      
      expect(viewPrice).to.equal(currentPrice);
    });

    it("Should return updated peg price after change", async function () {
      const newPrice = ethers.parseEther("1.15");
      await pegManager.connect(backend).updatePeg(newPrice);
      
      expect(await pegManager.getCurrentPegPrice()).to.equal(newPrice);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small peg prices", async function () {
      const smallPrice = ethers.parseUnits("0.000001", 18); // 0.000001 USD
      
      await pegManager.connect(backend).updatePeg(smallPrice);
      expect(await pegManager.currentPegPrice()).to.equal(smallPrice);
    });

    it("Should handle large peg prices", async function () {
      const largePrice = ethers.parseEther("1000"); // 1000 USD
      
      await pegManager.connect(backend).updatePeg(largePrice);
      expect(await pegManager.currentPegPrice()).to.equal(largePrice);
    });

    it("Should handle same price update", async function () {
      const price = ethers.parseEther("1.0");
      
      // First update
      await pegManager.connect(backend).updatePeg(price);
      const firstUpdate = await pegManager.lastUpdate();
      
      // Wait a bit and update to same price
      await time.increase(1);
      await pegManager.connect(backend).updatePeg(price);
      const secondUpdate = await pegManager.lastUpdate();
      
      expect(secondUpdate).to.be.gt(firstUpdate);
    });
  });
});
