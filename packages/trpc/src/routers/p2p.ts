import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { Context } from "../context.js";
import { authenticatedProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import {
  getUSDBalance,
  sendToSoulaanUser,
  sendToNonUser,
  getTransferHistory,
} from "../services/p2p-service.js";
import {
  createSetupIntent,
  savePaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from "../services/stripe-customer.js";
import { toE164, normalizePhoneForSearch } from "../lib/phone.js";

export const p2pRouter = router({
  /**
   * Get user's balance in USD
   * UI shows this as "Balance: $X.XX"
   */
  getBalance: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      balance: z.number(),
      formatted: z.string(),
    }))
    .query(async ({ input }) => {
      console.log('\n🔷 p2p.getBalance - START');

      try {
        const { balanceUSD, formatted } = await getUSDBalance(input.userId);

        console.log('✅ Balance:', formatted);
        return {
          balance: balanceUSD,
          formatted,
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get balance",
          cause: error,
        });
      }
    }),

  /**
   * Send payment to another user
   * Handles both Soulaan users and non-users
   */
  sendPayment: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      recipient: z.string(), // Username, phone, or user ID
      recipientType: z.enum(['username', 'phone', 'userId']),
      amount: z.number().min(0.01).max(10000),
      note: z.string().optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      transferId: z.string(),
      message: z.string(),
      claimToken: z.string().optional(), // Only for non-user transfers
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 p2p.sendPayment - START');
      console.log('💰 Amount:', `$${input.amount.toFixed(2)}`);
      console.log('📍 Recipient:', input.recipient, `(${input.recipientType})`);

      try {
        let recipientId: string | null = null;
        let recipientPhone: string | null = null;

        // Resolve recipient
        if (input.recipientType === 'userId') {
          recipientId = input.recipient;
        } else if (input.recipientType === 'username') {
          // Look up by username
          const profile = await context.db.userProfile.findUnique({
            where: { username: input.recipient },
            select: { walletAddress: true },
          });

          if (profile?.walletAddress) {
            const user = await context.db.user.findUnique({
              where: { walletAddress: profile.walletAddress },
              select: { id: true },
            });
            recipientId = user?.id || null;
          }
        } else if (input.recipientType === 'phone') {
          // Normalize phone and check all possible formats
          const phoneVariants = normalizePhoneForSearch(input.recipient);
          console.log('🔍 Searching for phone variants:', phoneVariants);

          // Check if phone belongs to a Soulaan user
          const user = await context.db.user.findFirst({
            where: { phone: { in: phoneVariants } },
            select: { id: true, phone: true },
          });

          if (user) {
            console.log('✅ Found user:', user.id, 'with phone:', user.phone);
            recipientId = user.id;
          } else {
            // Store in E.164 format for pending transfer
            recipientPhone = toE164(input.recipient);
            console.log(`📱 Non-user phone normalized: "${input.recipient}" -> "${recipientPhone}"`);
          }
        }

        // Send to Soulaan user
        if (recipientId) {
          const result = await sendToSoulaanUser({
            senderId: input.userId,
            recipientId,
            amountUSD: input.amount,
            note: input.note,
          });

          return {
            success: true,
            transferId: result.transferId,
            message: `Sent $${input.amount.toFixed(2)}`,
          };
        }

        // Send to non-user
        if (recipientPhone) {
          const result = await sendToNonUser({
            senderId: input.userId,
            recipientPhone,
            amountUSD: input.amount,
            note: input.note,
          });

          // TODO: Send SMS to recipient with claim link

          return {
            success: true,
            transferId: result.pendingTransferId,
            message: `Sent $${input.amount.toFixed(2)} to ${recipientPhone}`,
            claimToken: result.claimToken,
          };
        }

        throw new Error('Could not resolve recipient');
      } catch (error) {
        console.error('💥 ERROR:', error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Payment failed",
          cause: error,
        });
      }
    }),

  /**
   * Get payment history
   */
  getHistory: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .output(z.object({
      transfers: z.array(z.object({
        id: z.string(),
        type: z.enum(['sent', 'received', 'pending']),
        amount: z.number(),
        counterparty: z.string(),
        status: z.string(),
        note: z.string().optional(),
        createdAt: z.string(),
      })),
      total: z.number(),
    }))
    .query(async ({ input }) => {
      console.log('\n🔷 p2p.getHistory - START');

      try {
        const result = await getTransferHistory(input.userId, input.limit, input.offset);

        return {
          transfers: result.transfers.map(t => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
          })),
          total: result.total,
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get history",
          cause: error,
        });
      }
    }),

  /**
   * Look up a user by username or phone
   */
  lookupRecipient: authenticatedProcedure
    .input(z.object({
      query: z.string(),
      type: z.enum(['username', 'phone']),
    }))
    .output(z.object({
      found: z.boolean(),
      isSoulaanUser: z.boolean(),
      userId: z.string().optional(),
      displayName: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 p2p.lookupRecipient - START');

      try {
        if (input.type === 'username') {
          const profile = await context.db.userProfile.findUnique({
            where: { username: input.query },
            select: { walletAddress: true, name: true },
          });

          if (profile?.walletAddress) {
            const user = await context.db.user.findUnique({
              where: { walletAddress: profile.walletAddress },
              select: { id: true },
            });

            return {
              found: true,
              isSoulaanUser: true,
              userId: user?.id,
              displayName: profile.name,
            };
          }
        } else if (input.type === 'phone') {
          // Normalize phone number and search for all possible formats
          const phoneVariants = normalizePhoneForSearch(input.query);
          console.log('🔍 Searching for phone variants:', phoneVariants);

          const user = await context.db.user.findFirst({
            where: {
              phone: { in: phoneVariants },
            },
            select: { id: true, name: true, phone: true },
          });

          if (user) {
            console.log('✅ Found user:', user.id, 'with phone:', user.phone);
            return {
              found: true,
              isSoulaanUser: true,
              userId: user.id,
              displayName: user.name || undefined,
            };
          }

          // Non-user - valid phone number (return E.164 format)
          console.log('ℹ️ No user found, treating as non-user');
          return {
            found: true,
            isSoulaanUser: false,
          };
        }

        return {
          found: false,
          isSoulaanUser: false,
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        return {
          found: false,
          isSoulaanUser: false,
        };
      }
    }),

  // ─────────────────────────────────────────────────────────
  // Payment Methods
  // ─────────────────────────────────────────────────────────

  /**
   * Get saved payment methods
   */
  getPaymentMethods: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      methods: z.array(z.object({
        id: z.string(),
        last4: z.string(),
        brand: z.string(),
        expiryMonth: z.number(),
        expiryYear: z.number(),
        isDefault: z.boolean(),
      })),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        const methods = await context.db.paymentMethod.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: 'desc' },
        });

        return {
          methods: methods.map(m => ({
            id: m.id,
            last4: m.last4,
            brand: m.brand,
            expiryMonth: m.expiryMonth,
            expiryYear: m.expiryYear,
            isDefault: m.isDefault,
          })),
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get payment methods",
          cause: error,
        });
      }
    }),

  /**
   * Create a SetupIntent for adding a new card
   */
  createSetupIntent: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      clientSecret: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await createSetupIntent(input.userId);
        return result;
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create setup intent",
          cause: error,
        });
      }
    }),

  /**
   * Save a payment method after SetupIntent succeeds
   */
  savePaymentMethod: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      paymentMethodId: z.string(),
    }))
    .output(z.object({
      id: z.string(),
      last4: z.string(),
      brand: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await savePaymentMethod(input.userId, input.paymentMethodId);
        return result;
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save payment method",
          cause: error,
        });
      }
    }),

  /**
   * Remove a payment method
   */
  removePaymentMethod: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      paymentMethodId: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      try {
        await removePaymentMethod(input.userId, input.paymentMethodId);
        return { success: true };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove payment method",
          cause: error,
        });
      }
    }),

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      paymentMethodId: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      try {
        await setDefaultPaymentMethod(input.userId, input.paymentMethodId);
        return { success: true };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set default payment method",
          cause: error,
        });
      }
    }),

  // ─────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────

  /**
   * Get notifications
   */
  getNotifications: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      unreadOnly: z.boolean().default(false),
      limit: z.number().default(20),
    }))
    .output(z.object({
      notifications: z.array(z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        body: z.string(),
        read: z.boolean(),
        createdAt: z.string(),
        data: z.any().optional(),
      })),
      unreadCount: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        const [notifications, unreadCount] = await Promise.all([
          context.db.notification.findMany({
            where: {
              userId: input.userId,
              ...(input.unreadOnly ? { read: false } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
          }),
          context.db.notification.count({
            where: { userId: input.userId, read: false },
          }),
        ]);

        return {
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            read: n.read,
            createdAt: n.createdAt.toISOString(),
            data: n.data,
          })),
          unreadCount,
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get notifications",
          cause: error,
        });
      }
    }),

  /**
   * Mark notification as read
   */
  markNotificationRead: authenticatedProcedure
    .input(z.object({
      notificationId: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        await context.db.notification.update({
          where: { id: input.notificationId },
          data: { read: true },
        });
        return { success: true };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
          cause: error,
        });
      }
    }),

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
      count: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        const result = await context.db.notification.updateMany({
          where: { userId: input.userId, read: false },
          data: { read: true },
        });
        return { success: true, count: result.count };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notifications as read",
          cause: error,
        });
      }
    }),

  // ─────────────────────────────────────────────────────────
  // Bank Accounts
  // ─────────────────────────────────────────────────────────

  /**
   * Get saved bank accounts
   */
  getBankAccounts: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      accounts: z.array(z.object({
        id: z.string(),
        accountHolderName: z.string(),
        bankName: z.string(),
        last4: z.string(),
        routingLast4: z.string(),
        isDefault: z.boolean(),
        isVerified: z.boolean(),
      })),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        const accounts = await context.db.bankAccount.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: 'desc' },
        });

        return {
          accounts: accounts.map(a => ({
            id: a.id,
            accountHolderName: a.accountHolderName,
            bankName: a.bankName,
            last4: a.last4,
            routingLast4: a.routingLast4,
            isDefault: a.isDefault,
            isVerified: a.isVerified,
          })),
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get bank accounts",
          cause: error,
        });
      }
    }),

  /**
   * Add a new bank account
   */
  addBankAccount: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      accountHolderName: z.string().min(2),
      routingNumber: z.string().length(9),
      accountNumber: z.string().min(4).max(17),
      bankName: z.string().optional(),
    }))
    .output(z.object({
      id: z.string(),
      last4: z.string(),
      routingLast4: z.string(),
      isDefault: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 p2p.addBankAccount - START');

      try {
        // Check if user has any existing bank accounts
        const existingCount = await context.db.bankAccount.count({
          where: { userId: input.userId },
        });

        // Derive bank name from routing number (simplified - could use a lookup service)
        const bankName = input.bankName || 'Bank Account';

        const account = await context.db.bankAccount.create({
          data: {
            userId: input.userId,
            accountHolderName: input.accountHolderName,
            bankName,
            last4: input.accountNumber.slice(-4),
            routingLast4: input.routingNumber.slice(-4),
            isDefault: existingCount === 0, // First account is default
            isVerified: false, // Would need micro-deposit verification in production
          },
        });

        console.log('✅ Bank account added:', account.id);

        return {
          id: account.id,
          last4: account.last4,
          routingLast4: account.routingLast4,
          isDefault: account.isDefault,
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add bank account",
          cause: error,
        });
      }
    }),

  /**
   * Remove a bank account
   */
  removeBankAccount: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      bankAccountId: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        // Verify ownership
        const account = await context.db.bankAccount.findFirst({
          where: { id: input.bankAccountId, userId: input.userId },
        });

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bank account not found",
          });
        }

        await context.db.bankAccount.delete({
          where: { id: input.bankAccountId },
        });

        // If this was the default, set another as default
        if (account.isDefault) {
          const nextAccount = await context.db.bankAccount.findFirst({
            where: { userId: input.userId },
            orderBy: { createdAt: 'desc' },
          });

          if (nextAccount) {
            await context.db.bankAccount.update({
              where: { id: nextAccount.id },
              data: { isDefault: true },
            });
          }
        }

        return { success: true };
      } catch (error) {
        console.error('💥 ERROR:', error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove bank account",
          cause: error,
        });
      }
    }),

  /**
   * Set default bank account
   */
  setDefaultBankAccount: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      bankAccountId: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        // Verify ownership
        const account = await context.db.bankAccount.findFirst({
          where: { id: input.bankAccountId, userId: input.userId },
        });

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bank account not found",
          });
        }

        // Unset all defaults for this user
        await context.db.bankAccount.updateMany({
          where: { userId: input.userId },
          data: { isDefault: false },
        });

        // Set new default
        await context.db.bankAccount.update({
          where: { id: input.bankAccountId },
          data: { isDefault: true },
        });

        return { success: true };
      } catch (error) {
        console.error('💥 ERROR:', error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set default bank account",
          cause: error,
        });
      }
    }),

  // ─────────────────────────────────────────────────────────
  // Withdrawals
  // ─────────────────────────────────────────────────────────

  /**
   * Withdraw funds to bank account
   */
  withdraw: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      bankAccountId: z.string(),
      amountUSD: z.number().min(1).max(10000),
    }))
    .output(z.object({
      success: z.boolean(),
      withdrawalId: z.string(),
      message: z.string(),
      eta: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 p2p.withdraw - START');
      console.log('💰 Amount:', `$${input.amountUSD.toFixed(2)}`);

      try {
        // Verify bank account ownership
        const bankAccount = await context.db.bankAccount.findFirst({
          where: { id: input.bankAccountId, userId: input.userId },
        });

        if (!bankAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bank account not found",
          });
        }

        // Check balance
        const { balanceUSD } = await getUSDBalance(input.userId);

        if (balanceUSD < input.amountUSD) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient balance. Available: $${balanceUSD.toFixed(2)}`,
          });
        }

        // Create withdrawal record
        const withdrawal = await context.db.withdrawal.create({
          data: {
            userId: input.userId,
            bankAccountId: input.bankAccountId,
            amountUSD: input.amountUSD,
            amountUC: input.amountUSD, // 1:1 rate
            status: 'PENDING',
          },
        });

        // TODO: Implement actual Stripe payout
        // 1. Debit UC from user's wallet
        // 2. Create Stripe payout to connected bank account
        // 3. Update withdrawal status based on payout result

        // For now, mark as processing
        await context.db.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'PROCESSING' },
        });

        // Create notification
        await context.db.notification.create({
          data: {
            userId: input.userId,
            type: 'WITHDRAWAL_INITIATED',
            title: 'Withdrawal Processing',
            body: `Your withdrawal of $${input.amountUSD.toFixed(2)} to account ending in ${bankAccount.last4} is being processed.`,
            data: {
              withdrawalId: withdrawal.id,
              amountUSD: input.amountUSD,
            },
          },
        });

        console.log('✅ Withdrawal created:', withdrawal.id);

        return {
          success: true,
          withdrawalId: withdrawal.id,
          message: `$${input.amountUSD.toFixed(2)} withdrawal initiated`,
          eta: '1-3 business days',
        };
      } catch (error) {
        console.error('💥 ERROR:', error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process withdrawal",
          cause: error,
        });
      }
    }),

  /**
   * Get withdrawal history
   */
  getWithdrawals: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .output(z.object({
      withdrawals: z.array(z.object({
        id: z.string(),
        amountUSD: z.number(),
        status: z.string(),
        bankAccountLast4: z.string(),
        createdAt: z.string(),
        completedAt: z.string().optional(),
      })),
      total: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      try {
        const [withdrawals, total] = await Promise.all([
          context.db.withdrawal.findMany({
            where: { userId: input.userId },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset,
            include: {
              user: {
                include: {
                  bankAccounts: {
                    where: { id: undefined }, // We'll get the bank account separately
                  },
                },
              },
            },
          }),
          context.db.withdrawal.count({
            where: { userId: input.userId },
          }),
        ]);

        // Get bank account info for each withdrawal
        const withdrawalIds = withdrawals.map(w => w.bankAccountId);
        const bankAccounts = await context.db.bankAccount.findMany({
          where: { id: { in: withdrawalIds } },
        });
        const bankAccountMap = new Map(bankAccounts.map(ba => [ba.id, ba]));

        return {
          withdrawals: withdrawals.map(w => ({
            id: w.id,
            amountUSD: w.amountUSD,
            status: w.status,
            bankAccountLast4: bankAccountMap.get(w.bankAccountId)?.last4 || '****',
            createdAt: w.createdAt.toISOString(),
            completedAt: w.completedAt?.toISOString(),
          })),
          total,
        };
      } catch (error) {
        console.error('💥 ERROR:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get withdrawals",
          cause: error,
        });
      }
    }),
});
