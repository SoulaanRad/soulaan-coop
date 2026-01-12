import { createTRPCRouter, privateProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createWalletForUser } from "../services/wallet-service.js";
import { Context } from "../context.js";

// Mock data - in a real app, this would come from a database or smart contract
const mockMembers = [
  { id: "1", address: "0x1234...5678", status: "Active" },
  { id: "2", address: "0xabcd...efgh", status: "Suspended" },
  { id: "3", address: "0x9876...5432", status: "Banned" },
];

const mockRedemptions = [
    { id: "req-1", user: "0x1234...5678", amount: "100 UC", date: "2023-10-26", status: "Pending" },
    { id: "req-2", user: "0xabcd...efgh", amount: "250 UC", date: "2023-10-25", status: "Pending" },
    { id: "req-3", user: "0x9012...5432", amount: "1200 UC", date: "2023-10-26", status: "Needs Review", reason: "High amount" },
];

export const adminRouter = createTRPCRouter({
  getMembers: privateProcedure.query(async () => {
    // In a real app, you would fetch members from the SoulaaniCoin contract
    return mockMembers;
  }),

  updateMemberStatus: privateProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ input }) => {
      // In a real app, you would call the setMemberStatus function on the SoulaaniCoin contract
      console.log(`Updating member ${input.id} to status ${input.status}`);
      const member = mockMembers.find((m) => m.id === input.id);
      if (member) {
        member.status = input.status;
      }
      return member;
    }),
  
  getRedemptionRequests: privateProcedure.query(async () => {
    // In a real app, you'd fetch this from your smart contract events or a database
    return mockRedemptions;
  }),

  processRedemption: privateProcedure
    .input(z.object({ id: z.string(), action: z.string() }))
    .mutation(async ({ input }) => {
      // In a real app, you would call the corresponding smart contract function
      console.log(`Processing redemption ${input.id} with action: ${input.action}`);
      const index = mockRedemptions.findIndex((r) => r.id === input.id);
      if (index > -1) {
        mockRedemptions.splice(index, 1);
      }
      return { success: true, id: input.id, action: input.action };
    }),

  /**
   * Get all users without wallets
   */
  getUsersWithoutWallets: privateProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 getUsersWithoutWallets - START');

      try {
        const users = await context.db.user.findMany({
          where: {
            walletAddress: null,
            status: "ACTIVE", // Only show active users
          },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        console.log(`✅ Found ${users.length} users without wallets`);
        return users;
      } catch (error) {
        console.error('💥 ERROR in getUsersWithoutWallets:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users without wallets",
          cause: error,
        });
      }
    }),

  /**
   * Create wallet for a specific user (admin action)
   */
  createWalletForUserAdmin: privateProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
      walletAddress: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 createWalletForUserAdmin - START');
      console.log('👤 User ID:', input.userId);

      try {
        // Check if user exists
        const user = await context.db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            email: true,
            name: true,
            walletAddress: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        if (user.walletAddress) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has a wallet",
          });
        }

        // Create wallet
        console.log('🔐 Creating wallet...');
        const walletAddress = await createWalletForUser(input.userId);
        console.log('✅ Wallet created:', walletAddress);

        return {
          success: true,
          walletAddress,
          message: `Wallet ${walletAddress} created for ${user.name || user.email}`,
        };
      } catch (error) {
        console.error('💥 ERROR in createWalletForUserAdmin:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create wallet",
          cause: error,
        });
      }
    }),

  /**
   * Bulk create wallets for multiple users
   */
  createBulkWallets: privateProcedure
    .input(z.object({
      userIds: z.array(z.string()),
    }))
    .output(z.object({
      success: z.boolean(),
      results: z.array(z.object({
        userId: z.string(),
        walletAddress: z.string().optional(),
        error: z.string().optional(),
      })),
      successCount: z.number(),
      failureCount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 createBulkWallets - START');
      console.log(`📦 Creating wallets for ${input.userIds.length} users`);

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const userId of input.userIds) {
        try {
          console.log(`\n🔐 Creating wallet for user ${userId}...`);

          // Check if user exists and doesn't have a wallet
          const user = await context.db.user.findUnique({
            where: { id: userId },
            select: { id: true, walletAddress: true },
          });

          if (!user) {
            console.log(`❌ User ${userId} not found`);
            results.push({
              userId,
              error: "User not found",
            });
            failureCount++;
            continue;
          }

          if (user.walletAddress) {
            console.log(`⚠️ User ${userId} already has wallet`);
            results.push({
              userId,
              walletAddress: user.walletAddress,
              error: "User already has a wallet",
            });
            failureCount++;
            continue;
          }

          // Create wallet
          const walletAddress = await createWalletForUser(userId);
          console.log(`✅ Wallet created for ${userId}: ${walletAddress}`);

          results.push({
            userId,
            walletAddress,
          });
          successCount++;
        } catch (error) {
          console.error(`💥 Error creating wallet for ${userId}:`, error);
          results.push({
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          failureCount++;
        }
      }

      console.log(`\n✅ Bulk wallet creation complete`);
      console.log(`✓ Success: ${successCount}`);
      console.log(`✗ Failed: ${failureCount}`);

      return {
        success: true,
        results,
        successCount,
        failureCount,
      };
    }),

  /**
   * Get all users with wallet information
   */
  getAllUsersWithWallets: privateProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 getAllUsersWithWallets - START');

      try {
        const users = await context.db.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            walletAddress: true,
            walletCreatedAt: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        console.log(`✅ Found ${users.length} users`);
        return users.map(user => ({
          ...user,
          hasWallet: !!user.walletAddress,
          walletCreatedAt: user.walletCreatedAt?.toISOString(),
          createdAt: user.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error('💥 ERROR in getAllUsersWithWallets:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users",
          cause: error,
        });
      }
    }),
});
