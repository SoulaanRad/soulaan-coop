import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";

import { Context } from "../context.js";
import { privateProcedure, publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";

// Blockchain client for fetching balances
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.RPC_URL || 'https://sepolia.base.org'),
});

// Contract ABIs
const BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const userRouter = router({
  // Public procedures
  getAllUsers: publicProcedure.query(({ ctx }) => {
    const context = ctx as Context;
    return context.db.user.findMany();
  }),

  /**
   * Get token balances from blockchain
   */
  getBalances: publicProcedure
    .input(z.object({
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }))
    .output(z.object({
      sc: z.string(),
      uc: z.string(),
      scRaw: z.string(),
      ucRaw: z.string(),
    }))
    .query(async ({ input }) => {
      const scContract = process.env.SC_CONTRACT_ADDRESS;
      const ucContract = process.env.UC_CONTRACT_ADDRESS;

      if (!scContract || !ucContract) {
        console.warn('Contract addresses not configured, returning zero balances');
        return {
          sc: '0',
          uc: '0',
          scRaw: '0',
          ucRaw: '0',
        };
      }

      try {
        const [scBalance, ucBalance] = await Promise.all([
          publicClient.readContract({
            address: scContract as `0x${string}`,
            abi: BALANCE_ABI,
            functionName: 'balanceOf',
            args: [input.walletAddress as `0x${string}`],
          }),
          publicClient.readContract({
            address: ucContract as `0x${string}`,
            abi: BALANCE_ABI,
            functionName: 'balanceOf',
            args: [input.walletAddress as `0x${string}`],
          }),
        ]);

        return {
          sc: formatUnits(scBalance, 18),
          uc: formatUnits(ucBalance, 18),
          scRaw: scBalance.toString(),
          ucRaw: ucBalance.toString(),
        };
      } catch (error) {
        console.error('Error fetching balances:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch balances from blockchain',
        });
      }
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
});
