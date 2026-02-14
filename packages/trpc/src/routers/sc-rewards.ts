import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Context } from "../context.js";
import { authenticatedProcedure, privateProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { checkAdminStatusWithRole } from "../services/admin-verification.js";
import { 
  validateSCBalance, 
  verifySCTransaction, 
  getTotalSCMinted, 
  reconcileSCRecords,
  checkMemberStatus
} from "../services/sc-validation-service.js";
import { mintSCToUser, SC_REWARD_REASONS } from "../services/wallet-service.js";

export const scRewardsRouter = router({
  /**
   * Get SC rewards with filtering and pagination
   */
  getSCRewards: authenticatedProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
      userId: z.string().optional(),
      storeId: z.string().optional(),
      reason: z.enum(['STORE_PURCHASE_REWARD', 'STORE_SALE_REWARD', 'MANUAL_ADJUSTMENT']).optional(),
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const context = ctx as Context;
      const walletAddress = (ctx as any).walletAddress as string | undefined;
      const caller = walletAddress
        ? await context.db.user.findUnique({
            where: { walletAddress },
            select: { id: true },
          })
        : null;

      if (!caller) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authenticated user not found',
        });
      }

      const isAdmin = walletAddress
        ? (await checkAdminStatusWithRole(walletAddress as `0x${string}`)).isAdmin
        : false;

      const where: any = {};
      
      if (input.status) where.status = input.status;
      if (input.userId) {
        if (!isAdmin && input.userId !== caller.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your own SC rewards',
          });
        }
        where.userId = input.userId;
      } else if (!isAdmin) {
        // Non-admin callers default to their own rewards only.
        where.userId = caller.id;
      }
      if (input.storeId) where.relatedStoreId = input.storeId;
      if (input.reason) where.reason = input.reason;
      
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = new Date(input.startDate);
        if (input.endDate) where.createdAt.lte = new Date(input.endDate);
      }

      const [rewards, total] = await Promise.all([
        context.db.sCRewardTransaction.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                walletAddress: true,
              },
            },
            relatedStore: {
              select: {
                id: true,
                name: true,
              },
            },
            relatedOrder: {
              select: {
                id: true,
                totalUSD: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        context.db.sCRewardTransaction.count({ where }),
      ]);

      return {
        rewards,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get SC reward statistics for dashboard
   */
  getSCRewardStats: privateProcedure
    .query(async ({ ctx }) => {
      const context = ctx as Context;

      const [
        totalMinted,
        pending,
        failed,
        completed,
        totalOnChain,
        todayRewards,
        weekRewards,
      ] = await Promise.all([
        // Total SC from completed rewards
        context.db.sCRewardTransaction.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amountSC: true },
        }),
        // Pending count
        context.db.sCRewardTransaction.count({
          where: { status: 'PENDING' },
        }),
        // Failed count
        context.db.sCRewardTransaction.count({
          where: { status: 'FAILED' },
        }),
        // Completed count
        context.db.sCRewardTransaction.count({
          where: { status: 'COMPLETED' },
        }),
        // Get on-chain total
        getTotalSCMinted().catch(() => 0),
        // Today's rewards
        context.db.sCRewardTransaction.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          _sum: { amountSC: true },
        }),
        // This week's rewards
        context.db.sCRewardTransaction.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          _sum: { amountSC: true },
        }),
      ]);

      const total = pending + failed + completed;
      const successRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        totalMintedDB: totalMinted._sum.amountSC || 0,
        totalOnChain: totalOnChain,
        pending,
        failed,
        completed,
        total,
        successRate: Math.round(successRate * 100) / 100,
        todayMinted: todayRewards._sum.amountSC || 0,
        weekMinted: weekRewards._sum.amountSC || 0,
      };
    }),

  /**
   * Get single SC reward by ID
   */
  getSCRewardById: privateProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const context = ctx as Context;

      const reward = await context.db.sCRewardTransaction.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              walletAddress: true,
            },
          },
          relatedStore: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
          relatedOrder: {
            select: {
              id: true,
              totalUSD: true,
              createdAt: true,
            },
          },
        },
      });

      if (!reward) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SC reward not found',
        });
      }

      return reward;
    }),

  /**
   * Retry a failed SC reward mint
   */
  retrySCReward: privateProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const context = ctx as Context;

      // Get the reward record
      const reward = await context.db.sCRewardTransaction.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
            },
          },
        },
      });

      if (!reward) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SC reward not found',
        });
      }

      if (reward.status === 'COMPLETED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Reward already completed',
        });
      }

      // Check retry limit
      if (reward.retryCount >= 3) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Maximum retry attempts reached. Manual review required.',
        });
      }

      // Pre-validation: Check if already minted on-chain
      if (reward.txHash) {
        try {
          const verification = await verifySCTransaction(reward.txHash);
          if (verification.exists && verification.success) {
            // Already minted! Update record to COMPLETED
            await context.db.sCRewardTransaction.update({
              where: { id: input.id },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                failureReason: null,
              },
            });
            return {
              success: true,
              message: 'Reward was already minted on-chain. Record updated to COMPLETED.',
              txHash: reward.txHash,
            };
          }
        } catch (error) {
          console.log('Could not verify existing txHash, proceeding with retry');
        }
      }

      // Attempt to mint SC
      try {
        const txHash = await mintSCToUser(
          reward.userId,
          reward.amountSC,
          reward.reason // Use the reason directly from the database
        );

        // Update record to COMPLETED
        await context.db.sCRewardTransaction.update({
          where: { id: input.id },
          data: {
            status: 'COMPLETED',
            txHash,
            completedAt: new Date(),
            failureReason: null,
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
          },
        });

        console.log(`✅ Successfully retried SC reward ${input.id}`);

        return {
          success: true,
          message: 'SC reward minted successfully',
          txHash,
        };
      } catch (error) {
        // Update retry count and failure reason
        await context.db.sCRewardTransaction.update({
          where: { id: input.id },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
            failureReason: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        console.error(`❌ Retry failed for SC reward ${input.id}:`, error);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to mint SC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Validate SC reward against blockchain
   */
  validateSCReward: privateProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const context = ctx as Context;

      const reward = await context.db.sCRewardTransaction.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
            },
          },
        },
      });

      if (!reward) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SC reward not found',
        });
      }

      let onChainBalance = 0;
      let txVerification = null;

      try {
        onChainBalance = await validateSCBalance(reward.userId);
      } catch (error) {
        console.error('Failed to get on-chain balance:', error);
      }

      if (reward.txHash) {
        try {
          txVerification = await verifySCTransaction(reward.txHash);
        } catch (error) {
          console.error('Failed to verify transaction:', error);
        }
      }

      return {
        reward,
        onChainBalance,
        txVerification,
        isValid: reward.status === 'COMPLETED' && txVerification?.success === true,
      };
    }),

  /**
   * Get SC rewards for a specific store
   */
  getSCRewardsForStore: privateProcedure
    .input(z.object({
      storeId: z.string(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const context = ctx as Context;

      const rewards = await context.db.sCRewardTransaction.findMany({
        where: {
          relatedStoreId: input.storeId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          relatedOrder: {
            select: {
              id: true,
              totalUSD: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      const stats = await context.db.sCRewardTransaction.aggregate({
        where: {
          relatedStoreId: input.storeId,
          status: 'COMPLETED',
        },
        _sum: { amountSC: true },
        _count: true,
      });

      return {
        rewards,
        totalDistributed: stats._sum.amountSC || 0,
        totalCount: stats._count,
      };
    }),

  /**
   * Get SC rewards for a specific order
   */
  getSCRewardsForOrder: privateProcedure
    .input(z.object({
      orderId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const context = ctx as Context;

      const rewards = await context.db.sCRewardTransaction.findMany({
        where: {
          relatedOrderId: input.orderId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return rewards;
    }),

  /**
   * Reconcile all SC rewards with blockchain
   */
  reconcileSCRewards: privateProcedure
    .mutation(async ({ ctx }) => {
      const context = ctx as Context;

      try {
        const report = await reconcileSCRecords();

        // Auto-fix discrepancies
        for (const discrepancy of report.discrepancies) {
          if (discrepancy.shouldUpdate) {
            await context.db.sCRewardTransaction.update({
              where: { id: discrepancy.recordId },
              data: {
                status: discrepancy.suggestedStatus,
                completedAt: discrepancy.suggestedStatus === 'COMPLETED' ? new Date() : null,
                failedAt: discrepancy.suggestedStatus === 'FAILED' ? new Date() : null,
              },
            });
          }
        }

        return {
          success: true,
          report,
          fixedCount: report.discrepancies.filter(d => d.shouldUpdate).length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Reconciliation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Check if a user is an active member on-chain
   */
  checkUserMemberStatus: privateProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const memberStatus = await checkMemberStatus(input.userId);
        
        // Map status enum to human-readable string
        const statusMap = {
          0: 'Not Member',
          1: 'Active',
          2: 'Suspended',
          3: 'Banned',
        };

        return {
          ...memberStatus,
          memberStatusText: statusMap[memberStatus.memberStatus as keyof typeof statusMap] || 'Unknown',
          memberSinceDate: memberStatus.memberSince > 0 ? new Date(memberStatus.memberSince * 1000) : null,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to check member status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});
