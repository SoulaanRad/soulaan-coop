import { z } from 'zod';
import { router } from '../trpc.js';
import { authenticatedProcedure, privateProcedure } from '../procedures/index.js';
import { db } from '@repo/db';
import { 
  getActiveFeeConfig, 
  calculatePriceBreakdown, 
  createCommerceTransaction,
  getTransactionByPaymentIntent 
} from '../services/payment-orchestration-service.js';
import { validateRewardEligibility } from '../services/reward-policy-service.js';

export const commerceTransactionsRouter = router({
  /**
   * Preview commerce checkout pricing before creating payment intent
   */
  previewCheckout: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      businessId: z.string(),
      listedAmountCents: z.number().int().positive(),
      currency: z.string().default('USD'),
    }))
    .query(async ({ input }) => {
      const { userId, businessId, listedAmountCents, currency } = input;

      // Get business and check eligibility
      const business = await db.business.findUnique({
        where: { id: businessId },
        include: {
          stripeAccount: true,
          owner: true,
        },
      });
      
      // Get owner's wallets separately
      const ownerWallets = business?.ownerId ? await db.wallet.findMany({
        where: {
          userId: business.ownerId,
          walletType: 'MANAGED',
        },
        take: 1,
      }) : [];

      if (!business) {
        throw new Error('Business not found');
      }

      // Get active fee config
      const feeConfig = await getActiveFeeConfig();
      
      // Calculate price breakdown
      const breakdown = calculatePriceBreakdown(listedAmountCents, feeConfig);

      // Check SC reward eligibility
      const customerWallets = await db.wallet.findMany({
        where: {
          userId,
          walletType: 'MANAGED',
        },
        orderBy: {
          isPrimary: 'desc',
        },
        take: 1,
      });
      const customerWallet = customerWallets[0];
      const merchantWallet = ownerWallets[0];

      const eligibility = (customerWallet && merchantWallet)
        ? await validateRewardEligibility({
            customerId: userId,
            customerWalletAddress: customerWallet.address,
            businessId,
            businessOwnerId: business.ownerId,
            businessOwnerWalletAddress: merchantWallet.address,
            amountUSD: listedAmountCents / 100,
          })
        : { customerEligible: false, customerReason: 'NO_WALLET', merchantEligible: false, merchantReason: 'NO_WALLET', customerEstimatedReward: 0, merchantEstimatedReward: 0, businessScVerified: false };

      return {
        listedAmountCents,
        platformMarkupCents: breakdown.platformFeeAmount,
        treasuryFeeCents: breakdown.treasuryFeeAmount,
        totalChargedCents: breakdown.chargedAmount,
        merchantSettlementCents: breakdown.merchantSettlementAmount,
        currency,
        feeConfig: {
          platformMarkupBps: feeConfig.platformMarkupBps,
          treasuryFeeBps: feeConfig.treasuryFeeBps,
        },
        customerReward: {
          eligible: eligibility.customerEligible,
          estimatedAmount: eligibility.customerEstimatedReward,
          reason: eligibility.customerReason,
        },
        merchantReward: {
          eligible: eligibility.merchantEligible,
          estimatedAmount: eligibility.merchantEstimatedReward,
          reason: eligibility.merchantReason,
        },
        businessEligible: !!business.stripeAccount?.chargesEnabled,
      };
    }),

  /**
   * Create commerce transaction and Stripe payment intent
   */
  createCheckout: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      businessId: z.string(),
      listedAmountCents: z.number().int().positive(),
      currency: z.string().default('USD'),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, businessId, listedAmountCents, currency, metadata } = input;

      const result = await createCommerceTransaction({
        customerId: userId,
        businessId,
        listedAmountCents,
        currency,
        metadata,
      });

      // Calculate breakdown for response
      const feeConfig = await getActiveFeeConfig();
      const breakdown = calculatePriceBreakdown(listedAmountCents, feeConfig);

      return {
        transactionId: result.transaction.id,
        clientSecret: result.paymentIntent.clientSecret,
        totalChargedCents: Math.round(result.transaction.chargedAmount * 100),
        merchantSettlementCents: Math.round(result.transaction.merchantSettlementAmount * 100),
        platformFeeCents: breakdown.platformFeeAmount,
        treasuryFeeCents: Math.round(result.transaction.treasuryFeeAmount * 100),
      };
    }),

  /**
   * Get commerce transaction detail
   */
  getTransaction: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      transactionId: z.string(),
    }))
    .query(async ({ input }) => {
      const transaction = await db.commerceTransaction.findUnique({
        where: { id: input.transactionId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
            },
          },
          scMintEvents: {
            select: {
              id: true,
              userId: true,
              requestedAmount: true,
              status: true,
              sourceType: true,
              createdAt: true,
            },
          },
          treasuryLedgerEntries: {
            select: {
              id: true,
              accountType: true,
              entryType: true,
              amount: true,
              direction: true,
              occurredAt: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check access
      const userBusiness = await db.business.findFirst({
        where: { ownerId: input.userId },
        select: { id: true },
      });
      
      if (transaction.customerId !== input.userId && userBusiness?.id !== transaction.businessId) {
        throw new Error('Unauthorized');
      }

      return {
        ...transaction,
        // Include the fee snapshot that was used at purchase time
        feeSnapshot: {
          platformMarkupBps: transaction.platformMarkupBps,
          treasuryFeeBps: transaction.treasuryFeeBps,
        },
      };
    }),

  /**
   * List commerce transactions
   */
  listTransactions: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
      businessId: z.string().optional(),
      customerId: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const { status, businessId, customerId, limit, offset } = input;

      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (businessId) {
        where.businessId = businessId;
      }
      
      if (customerId) {
        where.customerId = customerId;
      }

      const [transactions, total] = await Promise.all([
        db.commerceTransaction.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            business: {
              select: {
                id: true,
                name: true,
              },
            },
            scMintEvents: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        db.commerceTransaction.count({ where }),
      ]);

      return {
        transactions,
        total,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * Get payment stats (admin only)
   */
  getPaymentStats: privateProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { startDate, endDate } = input;

      const where: any = {
        status: 'COMPLETED',
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [stats, recentTransactions] = await Promise.all([
        db.commerceTransaction.aggregate({
          where,
          _count: true,
          _sum: {
            chargedAmount: true,
            treasuryFeeAmount: true,
            merchantSettlementAmount: true,
          },
        }),
        db.commerceTransaction.findMany({
          where,
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            customer: {
              select: {
                name: true,
              },
            },
            business: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

      return {
        totalPayments: stats._count,
        totalVolumeCents: Math.round((stats._sum.chargedAmount || 0) * 100),
        totalTreasuryFeesCents: Math.round((stats._sum.treasuryFeeAmount || 0) * 100),
        totalMerchantSettlementCents: Math.round((stats._sum.merchantSettlementAmount || 0) * 100),
        averageTransactionCents: stats._count > 0 
          ? Math.round(((stats._sum.chargedAmount || 0) * 100) / stats._count)
          : 0,
        recentTransactions,
      };
    }),
});
