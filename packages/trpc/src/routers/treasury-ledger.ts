import { z } from 'zod';
import { router } from '../trpc.js';
import { authenticatedProcedure, privateProcedure } from '../procedures/index.js';
import { db } from '@repo/db';
import {
  getTreasurySummary,
  getAccountBalance,
  getLedgerEntries,
} from '../services/treasury-ledger-service.js';
import { getActiveFeeConfig } from '../services/payment-orchestration-service.js';

export const treasuryLedgerRouter = router({
  /**
   * Get treasury summary across all accounts
   */
  getSummary: privateProcedure
    .input(z.object({
      currency: z.string().default('USD'),
    }))
    .query(async ({ ctx, input }) => {
      const summary = await getTreasurySummary(input.currency);
      return summary;
    }),

  /**
   * Get balance for specific account type
   */
  getAccountBalance: privateProcedure
    .input(z.object({
      accountType: z.enum(['PLATFORM_FEES', 'TREASURY_FEES', 'PENDING_SETTLEMENT', 'ADJUSTMENTS', 'GRANTS']),
      currency: z.string().default('USD'),
    }))
    .query(async ({ ctx, input }) => {
      const balance = await getAccountBalance(input.accountType, input.currency);
      return balance;
    }),

  /**
   * Get ledger entries with filters
   */
  getLedgerEntries: privateProcedure
    .input(z.object({
      accountType: z.enum(['PLATFORM_FEES', 'TREASURY_FEES', 'PENDING_SETTLEMENT', 'ADJUSTMENTS', 'GRANTS']).optional(),
      entryType: z.enum(['FEE_COLLECTION', 'REFUND', 'ALLOCATION', 'ADJUSTMENT', 'SETTLEMENT']).optional(),
      currency: z.string().optional(),
      fromDate: z.date().optional(),
      toDate: z.date().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { accountType, entryType, currency, fromDate, toDate, limit, offset } = input;

      const result = await getLedgerEntries({
        accountType,
        entryType,
        currency,
        fromDate,
        toDate,
        limit,
        offset,
      });

      // Enrich with linked commerce transaction data
      const entriesWithIds = await db.treasuryLedgerEntry.findMany({
        where: {
          id: { in: result.entries.map(e => e.id) },
        },
        select: {
          id: true,
          sourceTransactionId: true,
        },
      });

      const enrichedEntries = await Promise.all(
        result.entries.map(async (entry) => {
          const entryWithId = entriesWithIds.find(e => e.id === entry.id);
          let linkedPayment = null;
          
          // If this is a fee collection, try to find the source commerce transaction
          if (entry.entryType === 'FEE_COLLECTION' && entryWithId?.sourceTransactionId) {
            linkedPayment = await db.commerceTransaction.findFirst({
              where: {
                id: entryWithId.sourceTransactionId,
              },
              select: {
                id: true,
                stripePaymentIntentId: true,
                chargedAmount: true,
                status: true,
                createdAt: true,
                customer: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
                business: {
                  select: {
                    name: true,
                  },
                },
              },
            });
          }

          return {
            ...entry,
            sourceTransactionId: entryWithId?.sourceTransactionId,
            linkedPayment,
          };
        })
      );

      return {
        entries: enrichedEntries,
        total: result.total,
        hasMore: offset + limit < result.total,
      };
    }),

  /**
   * Get current active fee configuration
   */
  getActiveFeeConfig: authenticatedProcedure
    .query(async () => {
      const config = await getActiveFeeConfig();
      return config;
    }),

  /**
   * Update fee configuration (creates new config with effective date)
   */
  updateFeeConfig: privateProcedure
    .input(z.object({
      platformMarkupBps: z.number().int().min(0).max(2000),
      treasuryFeeBps: z.number().int().min(0).max(2000),
      merchantFeeBps: z.number().int().min(0).max(2000).default(0),
      effectiveFrom: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { platformMarkupBps, treasuryFeeBps, merchantFeeBps, effectiveFrom } = input;

      const newConfig = await db.feeConfig.create({
        data: {
          platformMarkupBps,
          treasuryFeeBps,
          merchantFeeBps,
          effectiveFrom: effectiveFrom || new Date(),
          createdBy: ctx.walletAddress,
        },
      });

      return newConfig;
    }),

  /**
   * Get fee config history
   */
  getFeeConfigHistory: privateProcedure
    .input(z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const [configs, total] = await Promise.all([
        db.feeConfig.findMany({
          orderBy: {
            effectiveFrom: 'desc',
          },
          take: input.limit,
          skip: input.offset,
        }),
        db.feeConfig.count(),
      ]);

      return {
        configs,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),
});
