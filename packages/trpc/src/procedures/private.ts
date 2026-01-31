import { TRPCError } from "@trpc/server";
import type { Context } from "../context.js";
import type { Address } from "viem";
import { t } from "../trpc.js";
import { checkAdminStatusWithRole } from "../services/admin-verification.js";

const isAuthed = t.middleware(async ({ ctx, next }) => {
  // Explicitly type the context
  const context = ctx as Context;

  console.log('\n🔐 privateProcedure - Admin Verification (Blockchain)');

  try {
    // Get wallet address from request header
    const walletAddress = context.req.headers['x-wallet-address'] as string | undefined;

    console.log('📋 Wallet Address from header:', walletAddress);

    if (!walletAddress) {
      console.log('❌ No wallet address provided');
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No wallet address provided"
      });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      console.log('❌ Invalid wallet address format');
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid wallet address format"
      });
    }

    // Check admin status directly on blockchain (secure!)
    console.log('🔍 Checking admin status on blockchain...');
    const adminStatus = await checkAdminStatusWithRole(walletAddress as Address);

    if (!adminStatus.isAdmin) {
      console.log('❌ Wallet is not an admin on blockchain');
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be an admin to perform this action"
      });
    }

    console.log('✅ Admin verified on blockchain:', walletAddress, '-', adminStatus.role);

    return next({
      ctx: {
        ...ctx,
        walletAddress,
        adminRole: adminStatus.role,
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error('❌ Error in admin verification:', error);
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin verification failed"
    });
  }
});

export const privateProcedure = t.procedure.use(isAuthed);
