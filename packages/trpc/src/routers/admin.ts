import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createWalletForUser } from "../services/wallet-service.js";
import { Context } from "../context.js";
import { publicProcedure, privateProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";

export const adminRouter = router({
  /**
   * Get all users with their applications
   * TODO: Add proper authentication - only admins should access this
   */
  getAllUsersWithApplications: publicProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      const users = await context.db.user.findMany({
        include: {
          application: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users;
    }),

  /**
   * Get users by status
   */
  getUsersByStatus: publicProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const users = await context.db.user.findMany({
        where: {
          status: input.status,
        },
        include: {
          application: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users;
    }),

  /**
   * Get a single user with full application data
   */
  getUserWithApplication: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const user = await context.db.user.findUnique({
        where: {
          id: input.userId,
        },
        include: {
          application: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  /**
   * Update user status
   * TODO: Add permission check - only admins with proper role should be able to update
   */
  updateUserStatus: publicProcedure
    .input(z.object({
      userId: z.string(),
      status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']),
      reviewNotes: z.string().optional(),
      // TODO: Add adminUserId to track who made the change
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('\n🔷 updateUserStatus - START');
      console.log('📥 Received input:', JSON.stringify(input, null, 2));
      const context = ctx as Context;

      // TODO: Add permission check here
      // const adminUser = await context.db.user.findUnique({
      //   where: { id: input.adminUserId },
      // });
      // if (!adminUser || !adminUser.roles.includes('admin')) {
      //   throw new TRPCError({
      //     code: 'FORBIDDEN',
      //     message: 'Only admins can update user status',
      //   });
      // }

      const user = await context.db.user.update({
        where: {
          id: input.userId,
        },
        data: {
          status: input.status,
        },
      });

      // If there's an application, update its status and review info
      if (input.reviewNotes) {
        await context.db.application.updateMany({
          where: {
            userId: input.userId,
          },
          data: {
            status: input.status === 'ACTIVE' ? 'APPROVED' :
                   input.status === 'REJECTED' ? 'REJECTED' : 'SUBMITTED',
            reviewNotes: input.reviewNotes,
            reviewedAt: new Date(),
            // TODO: Add reviewedBy: input.adminUserId,
          },
        });
      }

      return user;
    }),

  /**
   * Get pending applications (users with PENDING status)
   */
  getPendingApplications: publicProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      const users = await context.db.user.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          application: true,
        },
        orderBy: {
          createdAt: 'asc', // Oldest first
        },
      });

      return users;
    }),

  /**
   * Batch approve/reject applications
   */
  batchUpdateStatus: publicProcedure
    .input(z.object({
      userIds: z.array(z.string()),
      status: z.enum(['ACTIVE', 'REJECTED']),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Update all users
      await context.db.user.updateMany({
        where: {
          id: {
            in: input.userIds,
          },
        },
        data: {
          status: input.status,
        },
      });

      // Update all applications
      await context.db.application.updateMany({
        where: {
          userId: {
            in: input.userIds,
          },
        },
        data: {
          status: input.status === 'ACTIVE' ? 'APPROVED' : 'REJECTED',
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
        },
      });

      return { success: true, count: input.userIds.length };
    }),

  /**
   * Get application statistics
   */
  getApplicationStats: publicProcedure
    .query(async ({ ctx }) => {
      console.log('\n🔷 getApplicationStats - START');
      console.log("📊 DATABASE_URL:", process.env.DATABASE_URL ? 'Connected' : 'NOT SET');
      const context = ctx as Context;

      try {
        // First, let's check if we can query any users at all
        const allUsers = await context.db.user.findMany();
        console.log(`📈 Total users in DB: ${allUsers.length}`);
        console.log(`📋 User statuses:`, allUsers.map(u => ({ email: u.email, status: u.status })));

        const [pending, active, rejected, suspended] = await Promise.all([
          context.db.user.count({ where: { status: 'PENDING' } }),
          context.db.user.count({ where: { status: 'ACTIVE' } }),
          context.db.user.count({ where: { status: 'REJECTED' } }),
          context.db.user.count({ where: { status: 'SUSPENDED' } }),
        ]);

        console.log(`✅ Stats calculated:`, { pending, active, rejected, suspended });

        const result = {
          pending,
          active,
          rejected,
          suspended,
          total: pending + active + rejected + suspended,
        };
        
        console.log('🎉 getApplicationStats - SUCCESS');
        console.log('📤 Returning:', result);
        return result;
      } catch (error) {
        console.error('❌ Error in getApplicationStats:', error);
        throw error;
      }
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
