import { z } from "zod";
import { router } from "../trpc.js";
import { publicProcedure, privateProcedure } from "../procedures/index.js";
import { CoopConfigInputZ, CoopConfigOutputZ, type CoopConfigOutput } from "@repo/validators";
import type { CoopConfig, Prisma } from "@repo/db";
import type { AuthenticatedContext } from "../context.js";

function mapDbToConfigOutput(record: CoopConfig): CoopConfigOutput {
  return {
    id: record.id,
    coopId: record.coopId,
    version: record.version,
    isActive: record.isActive,
    charterText: record.charterText,
    goalDefinitions: record.goalDefinitions as Array<{ key: string; label: string; weight: number; description?: string }>,
    quorumPercent: record.quorumPercent,
    approvalThresholdPercent: record.approvalThresholdPercent,
    votingWindowDays: record.votingWindowDays,
    scVotingCapPercent: record.scVotingCapPercent,
    proposalCategories: record.proposalCategories as Array<{ key: string; label: string; isActive: boolean }>,
    sectorExclusions: record.sectorExclusions as string[],
    minScBalanceToSubmit: record.minScBalanceToSubmit,
    scoringWeights: record.scoringWeights as { selfReliance: number; communityJobs: number; assetRetention: number; transparency: number; culturalValue: number },
    councilVoteThresholdUSD: record.councilVoteThresholdUSD ?? 5000,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
    createdBy: record.createdBy,
  };
}

function computeDiff(oldConfig: CoopConfig, newFields: Record<string, unknown>): { field: string; before: unknown; after: unknown }[] {
  const diff: { field: string; before: unknown; after: unknown }[] = [];
  for (const [field, after] of Object.entries(newFields)) {
    const before = (oldConfig as Record<string, unknown>)[field];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff.push({ field, before, after });
    }
  }
  return diff;
}

export const coopConfigRouter = router({
  /**
   * Get active config for a coopId (default "soulaan")
   */
  getActive: publicProcedure
    .input(z.object({ coopId: z.string().default("soulaan") }))
    .output(CoopConfigOutputZ.nullable())
    .query(async ({ input, ctx }) => {
      const config = await ctx.db.coopConfig.findFirst({
        where: { coopId: input.coopId, isActive: true },
        orderBy: { version: "desc" },
      });
      if (!config) return null;
      return mapDbToConfigOutput(config);
    }),

  /**
   * Get specific version by coopId + version number
   */
  getVersion: publicProcedure
    .input(z.object({ coopId: z.string(), version: z.number().int().positive() }))
    .output(CoopConfigOutputZ.nullable())
    .query(async ({ input, ctx }) => {
      const config = await ctx.db.coopConfig.findUnique({
        where: { coopId_version: { coopId: input.coopId, version: input.version } },
      });
      if (!config) return null;
      return mapDbToConfigOutput(config);
    }),

  /**
   * List all versions for a coopId
   */
  listVersions: publicProcedure
    .input(z.object({ coopId: z.string().default("soulaan") }))
    .output(z.array(z.object({
      id: z.string(),
      version: z.number(),
      isActive: z.boolean(),
      createdAt: z.string(),
      createdBy: z.string(),
    })))
    .query(async ({ input, ctx }) => {
      const versions = await ctx.db.coopConfig.findMany({
        where: { coopId: input.coopId },
        orderBy: { version: "desc" },
        select: { id: true, version: true, isActive: true, createdAt: true, createdBy: true },
      });
      return versions.map((v: any) => ({
        id: v.id,
        version: v.version,
        isActive: v.isActive,
        createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
        createdBy: v.createdBy,
      }));
    }),

  /**
   * Update config — creates new version, deactivates old, creates audit record
   */
  update: privateProcedure
    .input(CoopConfigInputZ)
    .output(CoopConfigOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { coopId, reason, ...updates } = input;
      const { walletAddress } = ctx as AuthenticatedContext;

      // Fetch current active config
      const current = await ctx.db.coopConfig.findFirst({
        where: { coopId, isActive: true },
        orderBy: { version: "desc" },
      });

      if (!current) {
        throw new Error(`No active config found for coopId: ${coopId}`);
      }

      // Build new config fields (merge with current)
      const newFields: Record<string, any> = {};
      if (updates.charterText !== undefined) newFields.charterText = updates.charterText;
      if (updates.goalDefinitions !== undefined) newFields.goalDefinitions = updates.goalDefinitions;
      if (updates.quorumPercent !== undefined) newFields.quorumPercent = updates.quorumPercent;
      if (updates.approvalThresholdPercent !== undefined) newFields.approvalThresholdPercent = updates.approvalThresholdPercent;
      if (updates.votingWindowDays !== undefined) newFields.votingWindowDays = updates.votingWindowDays;
      if (updates.scVotingCapPercent !== undefined) newFields.scVotingCapPercent = updates.scVotingCapPercent;
      if (updates.proposalCategories !== undefined) newFields.proposalCategories = updates.proposalCategories;
      if (updates.sectorExclusions !== undefined) newFields.sectorExclusions = updates.sectorExclusions;
      if (updates.minScBalanceToSubmit !== undefined) newFields.minScBalanceToSubmit = updates.minScBalanceToSubmit;
      if (updates.scoringWeights !== undefined) newFields.scoringWeights = updates.scoringWeights;
      if (updates.councilVoteThresholdUSD !== undefined) newFields.councilVoteThresholdUSD = updates.councilVoteThresholdUSD;

      // Compute diff
      const diff = computeDiff(current, newFields);

      // Transaction: deactivate old → create new → create audit
      const [, newConfig] = await ctx.db.$transaction([
        ctx.db.coopConfig.update({
          where: { id: current.id },
          data: { isActive: false },
        }),
        ctx.db.coopConfig.create({
          data: {
            coopId,
            version: current.version + 1,
            isActive: true,
            charterText: newFields.charterText ?? current.charterText,
            goalDefinitions: newFields.goalDefinitions ?? current.goalDefinitions,
            quorumPercent: newFields.quorumPercent ?? current.quorumPercent,
            approvalThresholdPercent: newFields.approvalThresholdPercent ?? current.approvalThresholdPercent,
            votingWindowDays: newFields.votingWindowDays ?? current.votingWindowDays,
            scVotingCapPercent: newFields.scVotingCapPercent ?? current.scVotingCapPercent,
            proposalCategories: newFields.proposalCategories ?? current.proposalCategories,
            sectorExclusions: newFields.sectorExclusions ?? current.sectorExclusions,
            minScBalanceToSubmit: newFields.minScBalanceToSubmit ?? current.minScBalanceToSubmit,
            scoringWeights: newFields.scoringWeights ?? current.scoringWeights,
            councilVoteThresholdUSD: newFields.councilVoteThresholdUSD ?? current.councilVoteThresholdUSD ?? 5000,
            createdBy: walletAddress,
          },
        }),
      ]);

      // Create audit record
      await ctx.db.coopConfigAudit.create({
        data: {
          coopConfigId: newConfig.id,
          changedBy: walletAddress,
          reason,
          diff: diff as Prisma.InputJsonValue,
        },
      });

      return mapDbToConfigOutput(newConfig);
    }),

  /**
   * Get audit trail for a coopId with pagination
   */
  getAuditTrail: privateProcedure
    .input(z.object({
      coopId: z.string().default("soulaan"),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .output(z.object({
      entries: z.array(z.object({
        id: z.string(),
        configVersion: z.number(),
        changedBy: z.string(),
        changedAt: z.string(),
        reason: z.string(),
        diff: z.any(),
      })),
      total: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Find all config IDs for this coop
      const configs = await ctx.db.coopConfig.findMany({
        where: { coopId: input.coopId },
        select: { id: true, version: true },
      });
      const configMap = new Map(configs.map((c: any) => [c.id, c.version]));
      const configIds = configs.map((c: any) => c.id);

      const [entries, total] = await Promise.all([
        ctx.db.coopConfigAudit.findMany({
          where: { coopConfigId: { in: configIds } },
          orderBy: { changedAt: "desc" },
          skip: input.offset,
          take: input.limit,
        }),
        ctx.db.coopConfigAudit.count({
          where: { coopConfigId: { in: configIds } },
        }),
      ]);

      return {
        entries: entries.map((e: any) => ({
          id: e.id,
          configVersion: configMap.get(e.coopConfigId) ?? 0,
          changedBy: e.changedBy,
          changedAt: e.changedAt instanceof Date ? e.changedAt.toISOString() : e.changedAt,
          reason: e.reason,
          diff: e.diff,
        })),
        total,
      };
    }),
});
