import { z } from "zod";
import { router } from "../trpc.js";
import { authenticatedProcedure } from "../procedures/index.js";
import { AuthenticatedContext, CoopScopedContext } from "../context.js";
import { db } from "@repo/db";
import { getTreasuryReserveStats, markReserveAsSettled } from "../services/treasury-reserve-service.js";
import { checkAdminStatusWithRole } from "../services/admin-verification.js";
import { getTreasuryAddress, setTreasuryAddress, getDefaultReserveRate, setDefaultReserveRate, getWealthFundBalance } from "../services/uc-contract-service.js";
import { getWealthFundAddressChanges, getAllPrivilegedChanges } from "../services/contract-events-service.js";
import { runRetryCycle } from "../services/reward-retry-service.js";

export const treasuryRouter = router({
  /**
   * Get treasury reserve statistics
   */
  getReserveStats: authenticatedProcedure.query(async ({ ctx }) => {
    const coopId = (ctx as CoopScopedContext).coopId || 'soulaan';
    return await getTreasuryReserveStats(coopId);
  }),

  /**
   * Get reserve entry history with pagination
   */
  getReserveHistory: authenticatedProcedure
    .input(
      z.object({
        coopId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(['PENDING', 'SETTLING', 'SETTLED', 'FAILED']).optional(),
      })
    )
    .query(async ({ input }: { input: { coopId: string; limit: number; offset: number; status?: 'PENDING' | 'SETTLING' | 'SETTLED' | 'FAILED' } }) => {
      const { coopId, limit, offset, status } = input;

      const where = {
        coopId,
        ...(status && { status }),
      };

      const [entries, total] = await Promise.all([
        db.treasuryReserveEntry.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.treasuryReserveEntry.count({ where }),
      ]);

      return {
        entries,
        total,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * Get reserve entry by source transaction
   */
  getReserveBySourceTx: authenticatedProcedure
    .input(z.object({ sourceUcTxHash: z.string() }))
    .query(async ({ input }: { input: { sourceUcTxHash: string } }) => {
      return await db.treasuryReserveEntry.findFirst({
        where: { sourceUcTxHash: input.sourceUcTxHash },
      });
    }),

  /**
   * Manually mark reserve as settled (admin correction only)
   */
  markReserveSettled: authenticatedProcedure
    .input(z.object({ 
      entryId: z.string(),
      txHash: z.string(),
    }))
    .mutation(async ({ input, ctx }: { input: { entryId: string; txHash: string }; ctx: AuthenticatedContext }) => {
      // Check if user is admin
      const adminStatus = await checkAdminStatusWithRole(ctx.walletAddress as `0x${string}`);
      if (!adminStatus.isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      await markReserveAsSettled(input.entryId, input.txHash);
      return { success: true };
    }),

  /**
   * Get the actual on-chain UC balance held at the wealth fund address
   */
  getWealthFundBalance: authenticatedProcedure.query(async () => {
    const balance = await getWealthFundBalance();
    return { balanceUC: balance };
  }),

  /**
   * Get wealth fund configuration from on-chain contract
   */
  getTreasuryConfig: authenticatedProcedure.query(async () => {
    const [wealthFundAddress, reserveBps] = await Promise.all([
      getTreasuryAddress(),
      getDefaultReserveRate(),
    ]);

    return {
      treasuryAddress: wealthFundAddress || null, // Keep field name for backward compatibility
      defaultReserveBps: reserveBps !== null ? reserveBps : 500, // Default to 500 (5%) if not available
      contractUpgradeNeeded: wealthFundAddress === null || reserveBps === null,
    };
  }),

  /**
   * Set wealth fund address (admin only)
   */
  setTreasuryAddress: authenticatedProcedure
    .input(z.object({ 
      treasuryAddress: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }: { input: { treasuryAddress: string; reason?: string }; ctx: AuthenticatedContext }) => {
      const adminStatus = await checkAdminStatusWithRole(ctx.walletAddress as `0x${string}`);
      if (!adminStatus.isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Update on-chain (event will be emitted by contract)
      const txHash = await setTreasuryAddress(input.treasuryAddress, input.reason);

      return { success: true, txHash };
    }),

  /**
   * Get wealth fund address change history from blockchain events
   */
  getAddressChangeHistory: authenticatedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }: { input: { limit: number; offset: number } }) => {
      const { limit, offset } = input;

      // Get all changes from blockchain
      const allChanges = await getWealthFundAddressChanges();
      
      // Convert to format expected by frontend
      const changes = allChanges.slice(offset, offset + limit).map(change => ({
        id: change.txHash,
        oldAddress: change.oldAddress,
        newAddress: change.newAddress,
        changedBy: change.changedBy,
        reason: change.reason,
        txHash: change.txHash,
        createdAt: new Date(Number(change.timestamp) * 1000),
      }));

      return {
        changes,
        total: allChanges.length,
        hasMore: offset + limit < allChanges.length,
      };
    }),

  /**
   * Get all privileged address and role changes across all contracts
   */
  getAllPrivilegedChanges: authenticatedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }: { input: { limit: number; offset: number } }) => {
      const { limit, offset } = input;

      const { addressChanges, roleChanges } = await getAllPrivilegedChanges();
      
      return {
        addressChanges: addressChanges.slice(offset, Math.min(offset + limit, addressChanges.length)).map(change => ({
          ...change,
          timestamp: Number(change.timestamp),
          createdAt: new Date(Number(change.timestamp) * 1000),
        })),
        roleChanges: roleChanges.slice(offset, Math.min(offset + limit, roleChanges.length)).map(change => ({
          ...change,
          timestamp: Number(change.timestamp),
          createdAt: new Date(Number(change.timestamp) * 1000),
        })),
        totalAddressChanges: addressChanges.length,
        totalRoleChanges: roleChanges.length,
      };
    }),

  /**
   * Set default reserve rate (admin only)
   */
  setDefaultReserveRate: authenticatedProcedure
    .input(z.object({ reserveBps: z.number().min(0).max(2000) }))
    .mutation(async ({ input, ctx }: { input: { reserveBps: number }; ctx: AuthenticatedContext }) => {
      const adminStatus = await checkAdminStatusWithRole(ctx.walletAddress as `0x${string}`);
      if (!adminStatus.isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const txHash = await setDefaultReserveRate(input.reserveBps);
      return { success: true, txHash };
    }),

  /**
   * Get active reserve policy (legacy - for backward compatibility)
   */
  getActivePolicy: authenticatedProcedure.query(async () => {
    const policy = await db.treasuryReservePolicy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return policy || {
      defaultReserveBps: 500,
      badgeReserveBps: null,
      programReserveBps: null,
    };
  }),

  /**
   * Update reserve policy (admin only)
   */
  updatePolicy: authenticatedProcedure
    .input(
      z.object({
        defaultReserveBps: z.number().min(0).max(10000),
        badgeReserveBps: z.number().min(0).max(10000).optional(),
        programReserveBps: z.record(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }: { input: { defaultReserveBps: number; badgeReserveBps?: number; programReserveBps?: Record<string, number> }; ctx: AuthenticatedContext }) => {
      // Check if user is admin
      const adminStatus = await checkAdminStatusWithRole(ctx.walletAddress as `0x${string}`);
      if (!adminStatus.isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Deactivate existing policies
      await db.treasuryReservePolicy.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new policy
      const newPolicy = await db.treasuryReservePolicy.create({
        data: {
          defaultReserveBps: input.defaultReserveBps,
          badgeReserveBps: input.badgeReserveBps ?? null,
          programReserveBps: input.programReserveBps ? JSON.parse(JSON.stringify(input.programReserveBps)) : null,
          createdBy: ctx.walletAddress,
        },
      });

      return newPolicy;
    }),

  /**
   * Scan for COMPLETED SC rewards with no matching TreasuryReserveEntry.
   * Creates FAILED entries for any that are missing so they're visible in the portal.
   * Admin only.
   */
  syncMissingReserves: authenticatedProcedure.mutation(async ({ ctx }: { ctx: AuthenticatedContext }) => {
    const adminStatus = await checkAdminStatusWithRole(ctx.walletAddress as `0x${string}`);
    if (!adminStatus.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const results = await runRetryCycle();
    return {
      scRetriedCount: results.scRetriedCount,
      reserveSettled: results.reserveSettled,
      reserveFailed: results.reserveFailed,
      reserveSkipped: results.reserveSkipped,
    };
  }),
});
