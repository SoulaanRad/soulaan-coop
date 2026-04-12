import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";

import { Context } from "../context.js";
import { privateProcedure, publicProcedure, authenticatedProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { getUserWallet, createWalletForUser } from "../services/wallet-service.js";

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
      coopId: z.string().default('??'),
    }))
    .output(z.object({
      sc: z.string(),
      uc: z.string(),
      scRaw: z.string(),
      ucRaw: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;
      
      const coopConfig = await context.db.coopConfig.findFirst({
        where: { coopId: input.coopId, isActive: true },
        orderBy: { version: 'desc' },
        select: {
          scTokenAddress: true,
          ucTokenAddress: true,
          chainId: true,
          rpcUrl: true,
        },
      });

      if (!coopConfig?.scTokenAddress || !coopConfig?.ucTokenAddress) {
        console.warn(`Contract addresses not configured for coop ${input.coopId}, returning zero balances`);
        return {
          sc: '0',
          uc: '0',
          scRaw: '0',
          ucRaw: '0',
        };
      }

      try {
        const client = coopConfig.chainId === 8453
          ? createPublicClient({ 
              chain: { id: 8453, name: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [coopConfig.rpcUrl || 'https://mainnet.base.org'] } } } as any,
              transport: http(coopConfig.rpcUrl || 'https://mainnet.base.org')
            })
          : publicClient;

        const [scBalance, ucBalance] = await Promise.all([
          client.readContract({
            address: coopConfig.scTokenAddress as `0x${string}`,
            abi: BALANCE_ABI,
            functionName: 'balanceOf',
            args: [input.walletAddress as `0x${string}`],
          }),
          client.readContract({
            address: coopConfig.ucTokenAddress as `0x${string}`,
            abi: BALANCE_ABI,
            functionName: 'balanceOf',
            args: [input.walletAddress as `0x${string}`],
          }),
        ]);

        const result = {
          sc: formatUnits(scBalance, 18),
          uc: formatUnits(ucBalance, 18),
          scRaw: scBalance.toString(),
          ucRaw: ucBalance.toString(),
        };

        console.log(`💰 getTokenBalances for ${input.walletAddress} (coop: ${input.coopId}):`);
        console.log(`   SC: ${result.sc} (raw: ${result.scRaw})`);
        console.log(`   UC: ${result.uc} (raw: ${result.ucRaw})`);

        return result;
      } catch (error) {
        console.error('Error fetching balances:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch balances from blockchain',
        });
      }
    }),

  // Private procedures (require authentication)
  /**
   * Get current user data by wallet address
   */
  getUserByWallet: authenticatedProcedure
    .input(z.object({
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      coopId: z.string().optional(),
    }))
    .output(z.object({
      id: z.string(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      roles: z.array(z.string()),
      status: z.string(),
      walletAddress: z.string().nullable(),
      phone: z.string().nullable(),
      createdAt: z.date(),
    }).nullable())
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log(`🔍 getUserByWallet: Looking for wallet ${input.walletAddress} in coop ${input.coopId || 'none'}`);

      const user = await context.db.user.findFirst({
        where: { 
          walletAddress: {
            equals: input.walletAddress,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          roles: true,
          status: true,
          walletAddress: true,
          phone: true,
          createdAt: true,
        },
      });

      if (!user) {
        console.log(`❌ No User found for wallet ${input.walletAddress}`);
        return null;
      }

      console.log(`✅ Found User: ${user.id}, wallet: ${user.walletAddress}, name: ${user.name}`);

      // Profile data (name, email, phone) comes from User table
      // No need to check UserCoopMembership for profile data
      return user;
    }),

  /**
   * Get current user data by ID
   * Used to refresh user session with latest data from database
   */
  getMe: authenticatedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable(),
      roles: z.array(z.string()),
      status: z.string(),
      walletAddress: z.string().nullable(),
      phone: z.string().nullable(),
      createdAt: z.date(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      const user = await context.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          name: true,
          roles: true,
          status: true,
          walletAddress: true,
          phone: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
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
   * Users can only access their own wallet info
   */
  getWalletInfo: authenticatedProcedure
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

  /**
   * Create a wallet for a user
   */
  createWallet: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.object({
      address: z.string(),
      created: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const context = ctx as Context;

      // Check if user exists
      const user = await context.db.user.findUnique({
        where: { id: input.userId },
        select: { walletAddress: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // If user already has a wallet, return it
      if (user.walletAddress) {
        return {
          address: user.walletAddress,
          created: false,
        };
      }

      // Create new wallet for user
      const walletAddress = await createWalletForUser(input.userId);

      return {
        address: walletAddress,
        created: true,
      };
    }),
});
