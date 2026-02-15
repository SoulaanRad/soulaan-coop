/**
 * Trustless Admin Router
 * 
 * Admin endpoints for managing the trustless SC reward system:
 * - View on-chain reward policies
 * - Generate transaction calldata for governance actions
 * - Monitor reconciliation status
 * - View event indexing status
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Context } from "../context.js";
import { privateProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { 
  isStoreVerifiedOnChain, 
  getStoreInfoOnChain, 
  getGlobalRewardPolicy,
  calculateExpectedReward,
} from "../services/trustless-store-service.js";
import {
  runDailyReconciliation,
  runHourlyReconciliation,
  exportReconciliationReportCSV,
} from "../services/reconciliation-service.js";
import { ethers } from "ethers";

// Category key mapping for UI
const CATEGORY_KEYS: Record<string, string> = {
  "FOOD_BEVERAGE": ethers.keccak256(ethers.toUtf8Bytes("FOOD_BEVERAGE")),
  "RETAIL": ethers.keccak256(ethers.toUtf8Bytes("RETAIL")),
  "SERVICES": ethers.keccak256(ethers.toUtf8Bytes("SERVICES")),
  "HEALTH_WELLNESS": ethers.keccak256(ethers.toUtf8Bytes("HEALTH_WELLNESS")),
  "ENTERTAINMENT": ethers.keccak256(ethers.toUtf8Bytes("ENTERTAINMENT")),
  "EDUCATION": ethers.keccak256(ethers.toUtf8Bytes("EDUCATION")),
  "PROFESSIONAL": ethers.keccak256(ethers.toUtf8Bytes("PROFESSIONAL")),
  "HOME_GARDEN": ethers.keccak256(ethers.toUtf8Bytes("HOME_GARDEN")),
  "AUTOMOTIVE": ethers.keccak256(ethers.toUtf8Bytes("AUTOMOTIVE")),
  "FOUNDER_BADGES": ethers.keccak256(ethers.toUtf8Bytes("FOUNDER_BADGES")),
  "OTHER": ethers.keccak256(ethers.toUtf8Bytes("OTHER")),
};

// Contract ABIs for calldata generation
const VERIFIED_STORE_REGISTRY_ABI = [
  "function verifyStore(address storeOwner, bytes32 categoryKey, bytes32 storeKey) external",
  "function unverifyStore(address storeOwner) external",
  "function updateStoreCategory(address storeOwner, bytes32 newCategoryKey) external",
];

const SC_REWARD_ENGINE_ABI = [
  "function setGlobalPolicy(uint256 percentageBps, uint256 fixedAmount, uint256 minPurchase, uint256 maxRewardPerTx, bool isActive) external",
  "function setCategoryPolicy(bytes32 categoryKey, uint256 percentageBps, uint256 fixedAmount, uint256 minPurchase, uint256 maxRewardPerTx, bool isActive) external",
  "function setStorePolicy(bytes32 storeKey, uint256 percentageBps, uint256 fixedAmount, uint256 minPurchase, uint256 maxRewardPerTx, bool isActive) external",
  "function removeCategoryPolicy(bytes32 categoryKey) external",
  "function removeStorePolicy(bytes32 storeKey) external",
];

export const trustlessAdminRouter = router({
  /**
   * Get global reward policy from on-chain
   */
  getGlobalRewardPolicy: privateProcedure
    .query(async () => {
      try {
        const policy = await getGlobalRewardPolicy();
        return policy;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch global policy",
        });
      }
    }),

  /**
   * Check if a store is verified on-chain
   */
  checkStoreVerification: privateProcedure
    .input(z.object({
      storeId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Get store from database
      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          owner: {
            select: { walletAddress: true },
          },
        },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      if (!store.owner.walletAddress) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Store owner has no wallet address",
        });
      }

      try {
        const isVerified = await isStoreVerifiedOnChain(store.owner.walletAddress);
        const info = isVerified ? await getStoreInfoOnChain(store.owner.walletAddress) : null;

        return {
          storeId: store.id,
          storeName: store.name,
          ownerWallet: store.owner.walletAddress,
          isVerifiedOnChain: isVerified,
          isVerifiedInDb: store.isScVerified,
          mismatch: isVerified !== store.isScVerified,
          onChainInfo: info,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to check verification",
        });
      }
    }),

  /**
   * Calculate expected reward for a purchase (preview)
   */
  calculateReward: privateProcedure
    .input(z.object({
      storeId: z.string(),
      amountUC: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          owner: {
            select: { walletAddress: true },
          },
        },
      });

      if (!store || !store.owner.walletAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found or owner has no wallet",
        });
      }

      try {
        const result = await calculateExpectedReward(store.owner.walletAddress, input.amountUC);
        return {
          storeId: store.id,
          storeName: store.name,
          purchaseAmount: input.amountUC,
          expectedReward: result.reward,
          policyKey: result.policyKey,
          policyType: result.policyKey === ethers.ZeroHash ? "global" : "override",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to calculate reward",
        });
      }
    }),

  /**
   * Generate calldata for verifying a store
   * Returns transaction data for multisig/timelock execution
   */
  generateVerifyStoreCalldata: privateProcedure
    .input(z.object({
      storeId: z.string(),
      category: z.enum([
        "FOOD_BEVERAGE",
        "RETAIL",
        "SERVICES",
        "HEALTH_WELLNESS",
        "ENTERTAINMENT",
        "EDUCATION",
        "PROFESSIONAL",
        "HOME_GARDEN",
        "AUTOMOTIVE",
        "FOUNDER_BADGES",
        "OTHER",
      ]),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          owner: {
            select: { walletAddress: true },
          },
        },
      });

      if (!store || !store.owner.walletAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found or owner has no wallet",
        });
      }

      const categoryKey = CATEGORY_KEYS[input.category];
      const storeKey = ethers.keccak256(ethers.toUtf8Bytes(`STORE_${store.id}`));

      const iface = new ethers.Interface(VERIFIED_STORE_REGISTRY_ABI);
      const calldata = iface.encodeFunctionData("verifyStore", [
        store.owner.walletAddress,
        categoryKey,
        storeKey,
      ]);

      return {
        to: process.env.VERIFIED_STORE_REGISTRY_ADDRESS || "",
        data: calldata,
        description: `Verify store: ${store.name} (${store.owner.walletAddress})`,
        storeInfo: {
          storeId: store.id,
          storeName: store.name,
          ownerWallet: store.owner.walletAddress,
          category: input.category,
          categoryKey,
          storeKey,
        },
      };
    }),

  /**
   * Generate calldata for unverifying a store
   */
  generateUnverifyStoreCalldata: privateProcedure
    .input(z.object({
      storeId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      const store = await context.db.store.findUnique({
        where: { id: input.storeId },
        include: {
          owner: {
            select: { walletAddress: true },
          },
        },
      });

      if (!store || !store.owner.walletAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found or owner has no wallet",
        });
      }

      const iface = new ethers.Interface(VERIFIED_STORE_REGISTRY_ABI);
      const calldata = iface.encodeFunctionData("unverifyStore", [
        store.owner.walletAddress,
      ]);

      return {
        to: process.env.VERIFIED_STORE_REGISTRY_ADDRESS || "",
        data: calldata,
        description: `Unverify store: ${store.name} (${store.owner.walletAddress})`,
      };
    }),

  /**
   * Generate calldata for updating global reward policy
   */
  generateUpdateGlobalPolicyCalldata: privateProcedure
    .input(z.object({
      percentageBps: z.number().min(0).max(10000),
      fixedAmountSC: z.string(),
      minPurchaseUC: z.string(),
      maxRewardPerTxSC: z.string().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const fixedAmount = ethers.parseEther(input.fixedAmountSC);
      const minPurchase = ethers.parseEther(input.minPurchaseUC);
      const maxReward = input.maxRewardPerTxSC ? ethers.parseEther(input.maxRewardPerTxSC) : 0n;

      const iface = new ethers.Interface(SC_REWARD_ENGINE_ABI);
      const calldata = iface.encodeFunctionData("setGlobalPolicy", [
        input.percentageBps,
        fixedAmount,
        minPurchase,
        maxReward,
        input.isActive,
      ]);

      return {
        to: process.env.SC_REWARD_ENGINE_ADDRESS || "",
        data: calldata,
        description: `Update global reward policy: ${(input.percentageBps / 100).toFixed(2)}% + ${input.fixedAmountSC} SC`,
        policyDetails: {
          percentageBps: input.percentageBps,
          percentageDisplay: `${(input.percentageBps / 100).toFixed(2)}%`,
          fixedAmountSC: input.fixedAmountSC,
          minPurchaseUC: input.minPurchaseUC,
          maxRewardPerTxSC: input.maxRewardPerTxSC || "unlimited",
          isActive: input.isActive,
        },
      };
    }),

  /**
   * Generate calldata for setting category-specific policy
   */
  generateSetCategoryPolicyCalldata: privateProcedure
    .input(z.object({
      category: z.enum([
        "FOOD_BEVERAGE",
        "RETAIL",
        "SERVICES",
        "HEALTH_WELLNESS",
        "ENTERTAINMENT",
        "EDUCATION",
        "PROFESSIONAL",
        "HOME_GARDEN",
        "AUTOMOTIVE",
        "FOUNDER_BADGES",
        "OTHER",
      ]),
      percentageBps: z.number().min(0).max(10000),
      fixedAmountSC: z.string(),
      minPurchaseUC: z.string(),
      maxRewardPerTxSC: z.string().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const categoryKey = CATEGORY_KEYS[input.category];
      const fixedAmount = ethers.parseEther(input.fixedAmountSC);
      const minPurchase = ethers.parseEther(input.minPurchaseUC);
      const maxReward = input.maxRewardPerTxSC ? ethers.parseEther(input.maxRewardPerTxSC) : 0n;

      const iface = new ethers.Interface(SC_REWARD_ENGINE_ABI);
      const calldata = iface.encodeFunctionData("setCategoryPolicy", [
        categoryKey,
        input.percentageBps,
        fixedAmount,
        minPurchase,
        maxReward,
        input.isActive,
      ]);

      return {
        to: process.env.SC_REWARD_ENGINE_ADDRESS || "",
        data: calldata,
        description: `Set ${input.category} policy: ${(input.percentageBps / 100).toFixed(2)}% + ${input.fixedAmountSC} SC`,
        policyDetails: {
          category: input.category,
          categoryKey,
          percentageBps: input.percentageBps,
          percentageDisplay: `${(input.percentageBps / 100).toFixed(2)}%`,
          fixedAmountSC: input.fixedAmountSC,
          minPurchaseUC: input.minPurchaseUC,
          maxRewardPerTxSC: input.maxRewardPerTxSC || "unlimited",
          isActive: input.isActive,
        },
      };
    }),

  /**
   * Run reconciliation and get report
   */
  runReconciliation: privateProcedure
    .input(z.object({
      period: z.enum(["hourly", "daily"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        const result = input.period === "hourly"
          ? await runHourlyReconciliation(context.db)
          : await runDailyReconciliation(context.db);

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Reconciliation failed",
        });
      }
    }),

  /**
   * Export reconciliation report as CSV
   */
  exportReconciliationCSV: privateProcedure
    .input(z.object({
      period: z.enum(["hourly", "daily"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        const result = input.period === "hourly"
          ? await runHourlyReconciliation(context.db)
          : await runDailyReconciliation(context.db);

        const csv = exportReconciliationReportCSV(result);

        return {
          filename: `reconciliation-${input.period}-${new Date().toISOString()}.csv`,
          content: csv,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Export failed",
        });
      }
    }),

  /**
   * Get stores with verification mismatches
   */
  getVerificationMismatches: privateProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      const stores = await context.db.store.findMany({
        where: {
          status: "APPROVED",
        },
        include: {
          owner: {
            select: { walletAddress: true },
          },
        },
      });

      const mismatches = [];

      for (const store of stores) {
        if (!store.owner.walletAddress) continue;

        try {
          const isVerified = await isStoreVerifiedOnChain(store.owner.walletAddress);
          
          if (isVerified !== store.isScVerified) {
            mismatches.push({
              storeId: store.id,
              storeName: store.name,
              ownerWallet: store.owner.walletAddress,
              dbVerified: store.isScVerified,
              onChainVerified: isVerified,
            });
          }
        } catch (error) {
          console.error(`Error checking store ${store.id}:`, error);
        }
      }

      return mismatches;
    }),
});
