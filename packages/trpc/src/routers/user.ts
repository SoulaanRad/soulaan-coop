import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

import { Context } from "../context.js";
import { privateProcedure, publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { getUserWallet } from "../services/wallet-service.js";

export const userRouter = router({
  // Public procedures
  getAllUsers: publicProcedure.query(({ ctx }) => {
    const context = ctx as Context;
    return context.db.user.findMany();
  }),

  // Private procedures (require authentication)
  me: privateProcedure.query(({ ctx }) => {
    // Get the current user based on auth context
    // In a real app, you'd get the user ID from the auth token
    // For demo purposes, using a hardcoded ID:
    // const userId = "current-user-id";
    // return ctx.db.user.findUnique({
    //   where: { id: userId }
    // });
  }),

  /**
   * Export wallet private key (requires password re-authentication)
   * SECURITY: Only call this when user explicitly requests to export their wallet
   */
  exportWallet: privateProcedure
    .input(z.object({
      userId: z.string(),
      password: z.string(),
    }))
    .output(z.object({
      address: z.string(),
      privateKey: z.string(),
      warning: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 exportWallet - START');
      console.log('👤 User ID:', input.userId);

      try {
        // 1. Verify user exists and has a wallet
        console.log('🔍 Checking user...');
        const user = await context.db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            password: true,
            walletAddress: true,
            encryptedPrivateKey: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        if (!user.walletAddress || !user.encryptedPrivateKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User does not have a wallet",
          });
        }

        // 2. Verify password
        console.log('🔒 Verifying password...');
        if (!user.password) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot verify password for this user",
          });
        }

        const passwordValid = await bcrypt.compare(input.password, user.password);
        if (!passwordValid) {
          console.log('❌ Invalid password');
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
        console.log('✅ Password verified');

        // 3. Get wallet with decrypted private key
        console.log('🔐 Retrieving wallet...');
        const wallet = await getUserWallet(input.userId);
        console.log('✅ Wallet retrieved');

        // 4. Log the export event for security audit
        console.log('📝 Logging wallet export event...');
        // TODO: Add audit log table and record this event

        const response = {
          address: wallet.address,
          privateKey: wallet.privateKey,
          warning: "⚠️ CRITICAL: Store this private key safely. Anyone with this key can access your funds. Never share it with anyone. Write it down and store it in a secure location.",
        };

        console.log('🎉 exportWallet - SUCCESS');
        console.log('📤 Wallet address:', wallet.address);
        return response;
      } catch (error) {
        console.error('\n💥 ERROR in exportWallet:');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', error instanceof Error ? error.message : String(error));

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export wallet. Please try again.",
          cause: error,
        });
      }
    }),

  /**
   * Get wallet info (address and balance only, no private key)
   */
  getWalletInfo: privateProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      address: z.string(),
      hasWallet: z.boolean(),
      walletCreatedAt: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const user = await context.db.user.findUnique({
        where: { id: input.userId },
        select: {
          walletAddress: true,
          walletCreatedAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        address: user.walletAddress || "",
        hasWallet: !!user.walletAddress,
        walletCreatedAt: user.walletCreatedAt?.toISOString(),
      };
    }),
});
