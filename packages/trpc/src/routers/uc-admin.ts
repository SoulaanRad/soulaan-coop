import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { Context } from "../context.js";
import { privateProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import {
  getAllTransferEvents,
  getTransferEvents,
  formatUCAmount,
} from "../services/blockchain.js";

export const ucAdminRouter = router({
  /**
   * Get all UC transfers (admin monitoring)
   * Queries blockchain Transfer events
   */
  getAllTransfers: privateProcedure
    .input(z.object({
      fromBlock: z.string().optional(),
      toBlock: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .output(z.object({
      transfers: z.array(z.object({
        from: z.string(),
        to: z.string(),
        value: z.string(),
        valueFormatted: z.string(),
        blockNumber: z.string(),
        transactionHash: z.string(),
        timestamp: z.number(),
      })),
      total: z.number(),
      hasMore: z.boolean(),
      lastBlock: z.string(),
    }))
    .query(async ({ input }) => {
      console.log('\n🔷 getAllTransfers - START');
      console.log('📊 Limit:', input.limit, 'Offset:', input.offset);

      try {
        const fromBlock = input.fromBlock ? BigInt(input.fromBlock) : undefined;
        const toBlock = input.toBlock ? BigInt(input.toBlock) : 'latest';

        // Get all transfers from blockchain
        const allTransfers = await getAllTransferEvents(fromBlock, toBlock);

        console.log(`✅ Found ${allTransfers.length} total transfers`);

        // Paginate results
        const paginatedTransfers = allTransfers.slice(input.offset, input.offset + input.limit);
        const hasMore = input.offset + input.limit < allTransfers.length;

        const formattedTransfers = paginatedTransfers.map(transfer => ({
          from: transfer.from,
          to: transfer.to,
          value: transfer.value.toString(),
          valueFormatted: transfer.valueFormatted,
          blockNumber: transfer.blockNumber.toString(),
          transactionHash: transfer.transactionHash,
          timestamp: transfer.timestamp,
        }));

        const lastBlock: string = paginatedTransfers.length > 0
          ? paginatedTransfers[paginatedTransfers.length - 1]!.blockNumber.toString()
          : '0';

        return {
          transfers: formattedTransfers,
          total: allTransfers.length,
          hasMore,
          lastBlock,
        };
      } catch (error) {
        console.error('💥 ERROR in getAllTransfers:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch transfers from blockchain",
          cause: error,
        });
      }
    }),

  /**
   * Get transfers for a specific user (admin)
   */
  getTransfersByUser: privateProcedure
    .input(z.object({
      walletAddress: z.string(),
      limit: z.number().default(50),
    }))
    .output(z.object({
      transfers: z.array(z.object({
        from: z.string(),
        to: z.string(),
        value: z.string(),
        valueFormatted: z.string(),
        blockNumber: z.string(),
        transactionHash: z.string(),
        timestamp: z.number(),
        direction: z.enum(['sent', 'received']),
      })),
    }))
    .query(async ({ input }) => {
      console.log('\n🔷 getTransfersByUser - START');
      console.log('📍 Wallet:', input.walletAddress);

      try {
        const transfers = await getTransferEvents(input.walletAddress);

        // Limit results
        const limitedTransfers = transfers.slice(0, input.limit);

        const formattedTransfers = limitedTransfers.map(transfer => ({
          from: transfer.from,
          to: transfer.to,
          value: transfer.value.toString(),
          valueFormatted: transfer.valueFormatted,
          blockNumber: transfer.blockNumber.toString(),
          transactionHash: transfer.transactionHash,
          timestamp: transfer.timestamp,
          direction: transfer.from.toLowerCase() === input.walletAddress.toLowerCase()
            ? 'sent' as const
            : 'received' as const,
        }));

        console.log(`✅ Found ${formattedTransfers.length} transfers`);

        return {
          transfers: formattedTransfers,
        };
      } catch (error) {
        console.error('💥 ERROR in getTransfersByUser:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user transfers",
          cause: error,
        });
      }
    }),

  /**
   * Get UC transfer statistics (admin analytics)
   */
  getTransferStats: privateProcedure
    .input(z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }))
    .output(z.object({
      totalVolume: z.string(),
      totalVolumeFormatted: z.string(),
      transferCount: z.number(),
      uniqueSenders: z.number(),
      uniqueReceivers: z.number(),
      averageTransferSize: z.string(),
    }))
    .query(async ({ input }) => {
      console.log('\n🔷 getTransferStats - START');

      try {
        // Convert dates to block numbers (approximate)
        // For now, we'll just get all transfers and filter by timestamp
        const allTransfers = await getAllTransferEvents();

        // Filter by date if provided
        let filteredTransfers = allTransfers;
        if (input.fromDate || input.toDate) {
          const fromTimestamp = input.fromDate ? new Date(input.fromDate).getTime() / 1000 : 0;
          const toTimestamp = input.toDate ? new Date(input.toDate).getTime() / 1000 : Date.now() / 1000;

          filteredTransfers = allTransfers.filter(
            t => t.timestamp >= fromTimestamp && t.timestamp <= toTimestamp
          );
        }

        console.log(`✅ Analyzing ${filteredTransfers.length} transfers`);

        // Calculate stats
        const totalVolume = filteredTransfers.reduce((sum, t) => sum + t.value, 0n);
        const transferCount = filteredTransfers.length;
        const uniqueSenders = new Set(filteredTransfers.map(t => t.from.toLowerCase())).size;
        const uniqueReceivers = new Set(filteredTransfers.map(t => t.to.toLowerCase())).size;
        const averageTransferSize = transferCount > 0 ? totalVolume / BigInt(transferCount) : 0n;

        return {
          totalVolume: totalVolume.toString(),
          totalVolumeFormatted: formatUCAmount(totalVolume),
          transferCount,
          uniqueSenders,
          uniqueReceivers,
          averageTransferSize: formatUCAmount(averageTransferSize),
        };
      } catch (error) {
        console.error('💥 ERROR in getTransferStats:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate transfer stats",
          cause: error,
        });
      }
    }),

  /**
   * Export transfers as CSV (admin)
   */
  exportTransfers: privateProcedure
    .input(z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }))
    .output(z.object({
      csvData: z.string(),
      filename: z.string(),
    }))
    .query(async ({ input }) => {
      console.log('\n🔷 exportTransfers - START');

      try {
        const allTransfers = await getAllTransferEvents();

        // Filter by date if provided
        let filteredTransfers = allTransfers;
        if (input.fromDate || input.toDate) {
          const fromTimestamp = input.fromDate ? new Date(input.fromDate).getTime() / 1000 : 0;
          const toTimestamp = input.toDate ? new Date(input.toDate).getTime() / 1000 : Date.now() / 1000;

          filteredTransfers = allTransfers.filter(
            t => t.timestamp >= fromTimestamp && t.timestamp <= toTimestamp
          );
        }

        console.log(`✅ Exporting ${filteredTransfers.length} transfers`);

        // Generate CSV
        const headers = ['Timestamp', 'From', 'To', 'Amount (UC)', 'Block Number', 'Transaction Hash'];
        const rows = filteredTransfers.map(t => [
          new Date(t.timestamp * 1000).toISOString(),
          t.from,
          t.to,
          t.valueFormatted,
          t.blockNumber.toString(),
          t.transactionHash,
        ]);

        const csvData = [
          headers.join(','),
          ...rows.map(row => row.join(',')),
        ].join('\n');

        const filename = `uc-transfers-${input.fromDate || 'all'}-to-${input.toDate || 'now'}.csv`;

        return {
          csvData,
          filename,
        };
      } catch (error) {
        console.error('💥 ERROR in exportTransfers:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export transfers",
          cause: error,
        });
      }
    }),

  /**
   * Get all onramp transactions (admin monitoring)
   */
  getAllOnrampTransactions: privateProcedure
    .input(z.object({
      limit: z.number().default(100),
      offset: z.number().default(0),
      status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
      processor: z.enum(['stripe', 'paypal', 'square']).optional(),
    }))
    .output(z.object({
      transactions: z.array(z.object({
        id: z.string(),
        userId: z.string(),
        userEmail: z.string(),
        userName: z.string().optional(),
        amountUSD: z.number(),
        amountUC: z.number(),
        processor: z.string(),
        status: z.string(),
        paymentIntentId: z.string(),
        processorChargeId: z.string().optional(),
        mintTxHash: z.string().optional(),
        createdAt: z.string(),
        completedAt: z.string().optional(),
        failedAt: z.string().optional(),
        failureReason: z.string().optional(),
      })),
      total: z.number(),
      hasMore: z.boolean(),
    }))
    .query(async ({ input, ctx }) => {
      const context = ctx as Context;

      console.log('\n🔷 getAllOnrampTransactions - START');

      try {
        const where: any = {};
        if (input.status) where.status = input.status;
        if (input.processor) where.processor = input.processor;

        // Get total count
        const total = await context.db.onrampTransaction.count({ where });

        // Get transactions with user info
        const transactions = await context.db.onrampTransaction.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        });

        console.log(`✅ Found ${transactions.length} onramp transactions`);

        return {
          transactions: transactions.map(tx => ({
            id: tx.id,
            userId: tx.userId,
            userEmail: tx.user.email,
            userName: tx.user.name ?? undefined,
            amountUSD: tx.amountUSD,
            amountUC: tx.amountUC,
            processor: tx.processor,
            status: tx.status,
            paymentIntentId: tx.paymentIntentId,
            processorChargeId: tx.processorChargeId ?? undefined,
            mintTxHash: tx.mintTxHash ?? undefined,
            createdAt: tx.createdAt.toISOString(),
            completedAt: tx.completedAt?.toISOString(),
            failedAt: tx.failedAt?.toISOString(),
            failureReason: tx.failureReason ?? undefined,
          })),
          total,
          hasMore: input.offset + input.limit < total,
        };
      } catch (error) {
        console.error('💥 ERROR in getAllOnrampTransactions:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch onramp transactions",
          cause: error,
        });
      }
    }),
});
