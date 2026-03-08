import { z } from 'zod';
import { router } from '../trpc.js';
import { authenticatedProcedure, privateProcedure } from '../procedures/index.js';
import { db } from '@repo/db';
import { retryFailedMints, getMintHistory, getTotalSCMinted } from '../services/sc-token-service.js';

export const scMintEventsRouter = router({
  /**
   * Get SC mint event stats
   */
  getStats: privateProcedure
    .query(async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [totalStats, weekStats, todayStats] = await Promise.all([
        db.sCMintEvent.aggregate({
          _sum: {
            actualAmount: true,
          },
          _count: {
            id: true,
          },
          where: {
            status: 'COMPLETED',
          },
        }),
        db.sCMintEvent.aggregate({
          _sum: {
            actualAmount: true,
          },
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: weekAgo,
            },
          },
        }),
        db.sCMintEvent.aggregate({
          _sum: {
            actualAmount: true,
          },
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: dayAgo,
            },
          },
        }),
      ]);

      const [completed, pending, failed] = await Promise.all([
        db.sCMintEvent.count({ where: { status: 'COMPLETED' } }),
        db.sCMintEvent.count({ where: { status: 'PENDING' } }),
        db.sCMintEvent.count({ where: { status: 'FAILED' } }),
      ]);

      const total = completed + pending + failed;
      const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        totalMintedDB: totalStats._sum?.actualAmount || 0,
        weekMinted: weekStats._sum?.actualAmount || 0,
        todayMinted: todayStats._sum?.actualAmount || 0,
        total,
        completed,
        pending,
        failed,
        successRate,
      };
    }),

  /**
   * Get SC mint events with filters
   */
  getMintEvents: privateProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
      sourceType: z.string().optional(),
      userId: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { status, sourceType, userId, limit, offset } = input;

      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (sourceType) {
        where.sourceType = sourceType;
      }
      
      if (userId) {
        where.userId = userId;
      }

      const [events, total] = await Promise.all([
        db.sCMintEvent.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        db.sCMintEvent.count({ where }),
      ]);

      return {
        events,
        total,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * Get mint history for a specific user
   */
  getUserMintHistory: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const history = await getMintHistory(input.userId, input.limit);
      return history;
    }),

  /**
   * Retry failed mints
   */
  retryFailedMints: privateProcedure
    .mutation(async () => {
      const result = await retryFailedMints();
      return result;
    }),

  /**
   * Get mint event detail with mismatch detection
   */
  getMintEventDetail: privateProcedure
    .input(z.object({
      eventId: z.string(),
    }))
    .query(async ({ input }) => {
      const event = await db.sCMintEvent.findUnique({
        where: { id: input.eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error('Mint event not found');
      }

      // Check for related commerce transaction
      let linkedTransaction = null;
      if (event.sourceTransactionId) {
        linkedTransaction = await db.commerceTransaction.findUnique({
          where: { id: event.sourceTransactionId },
          select: {
            id: true,
            status: true,
            chargedAmount: true,
            stripePaymentIntentId: true,
            createdAt: true,
            business: {
              select: {
                name: true,
              },
            },
          },
        });
      }

      // Check for mismatch states
      const mismatches = [];
      
      if (event.status === 'FAILED' && linkedTransaction?.status === 'COMPLETED') {
        mismatches.push({
          type: 'PAYMENT_SUCCESS_MINT_FAILED',
          message: 'Payment completed but SC mint failed',
          severity: 'HIGH',
        });
      }

      if (event.status === 'COMPLETED' && linkedTransaction?.status === 'FAILED') {
        mismatches.push({
          type: 'MINT_SUCCESS_PAYMENT_FAILED',
          message: 'SC minted but payment failed',
          severity: 'CRITICAL',
        });
      }

      if (event.status === 'PENDING' && linkedTransaction?.status === 'COMPLETED') {
        const hoursSincePayment = linkedTransaction.createdAt 
          ? (Date.now() - linkedTransaction.createdAt.getTime()) / (1000 * 60 * 60)
          : 0;
        
        if (hoursSincePayment > 1) {
          mismatches.push({
            type: 'DELAYED_MINT',
            message: `SC mint pending for ${Math.round(hoursSincePayment)} hours after payment`,
            severity: 'MEDIUM',
          });
        }
      }

      return {
        event,
        linkedTransaction,
        mismatches,
      };
    }),

});
