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
    missionGoals: record.missionGoals as Array<{ key: string; label: string; priorityWeight: number; description?: string; domain?: string; expertRequired?: boolean; scoringRubric?: string }>,
    structuralWeights: record.structuralWeights as { feasibility: number; risk: number; accountability: number },
    scoreMix: record.scoreMix as { missionWeight: number; structuralWeight: number },
    screeningPassThreshold: record.screeningPassThreshold,
    quorumPercent: record.quorumPercent,
    approvalThresholdPercent: record.approvalThresholdPercent,
    votingWindowDays: record.votingWindowDays,
    scVotingCapPercent: record.scVotingCapPercent,
    proposalCategories: record.proposalCategories as Array<{ key: string; label: string; isActive: boolean }>,
    // Normalize legacy string[] → { value, description? }[] transparently
    sectorExclusions: (record.sectorExclusions as Array<string | { value: string; description?: string }>)
      .map(e => typeof e === "string" ? { value: e } : e),
    scorerAgents: ((record as any).scorerAgents as Array<{ agentKey: string; label: string; enabled: boolean; promptTemplate?: string; model?: string }> | undefined) ?? [],
    minScBalanceToSubmit: record.minScBalanceToSubmit,
    aiAutoApproveThresholdUSD: record.aiAutoApproveThresholdUSD ?? 500,
    councilVoteThresholdUSD: record.councilVoteThresholdUSD ?? 5000,
    strongGoalThreshold: record.strongGoalThreshold,
    missionMinThreshold: record.missionMinThreshold,
    structuralGate: record.structuralGate,
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
   * Create initial config for a coopId (only when none exists)
   */
  create: privateProcedure
    .input(CoopConfigInputZ)
    .output(CoopConfigOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { coopId, reason, ...fields } = input;
      const { walletAddress } = ctx as AuthenticatedContext;

      const existing = await ctx.db.coopConfig.findFirst({
        where: { coopId, isActive: true },
      });

      if (existing) {
        throw new Error(`Active config already exists for coopId: ${coopId}. Use update instead.`);
      }

      const defaultMissionGoals = [
        { key: "income_stability",  label: "Income Stability",  priorityWeight: 0.35 },
        { key: "asset_creation",    label: "Asset Creation",    priorityWeight: 0.25 },
        { key: "leakage_reduction", label: "Leakage Reduction", priorityWeight: 0.20 },
        { key: "export_expansion",  label: "Export Expansion",  priorityWeight: 0.20 },
      ];

      const newConfig = await ctx.db.coopConfig.create({
        data: {
          coopId,
          version: 1,
          isActive: true,
          charterText: fields.charterText ?? `${coopId} Co-op Charter`,
          missionGoals: fields.missionGoals ?? defaultMissionGoals,
          structuralWeights: fields.structuralWeights ?? { feasibility: 0.40, risk: 0.35, accountability: 0.25 },
          scoreMix: fields.scoreMix ?? { missionWeight: 0.60, structuralWeight: 0.40 },
          screeningPassThreshold: fields.screeningPassThreshold ?? 0.6,
          quorumPercent: fields.quorumPercent ?? 15,
          approvalThresholdPercent: fields.approvalThresholdPercent ?? 51,
          votingWindowDays: fields.votingWindowDays ?? 7,
          scVotingCapPercent: fields.scVotingCapPercent ?? 2,
          proposalCategories: fields.proposalCategories ?? [
            { key: "business_funding", label: "Business Funding", isActive: true, description: "Capital requests to start, expand, or stabilise a member-owned business. Includes equipment, working capital, licensing, and growth investment." },
            { key: "procurement",      label: "Procurement",      isActive: true, description: "Proposals to establish or formalise collective purchasing agreements, supplier contracts, or bulk-buying arrangements that reduce costs for members." },
            { key: "infrastructure",   label: "Infrastructure",   isActive: true, description: "Investment in shared physical or digital infrastructure — facilities, tools, platforms, or systems that multiple members or the coop as a whole relies on." },
            { key: "governance",       label: "Governance",       isActive: true, description: "Changes to coop rules, policies, bylaws, voting structures, or operational procedures. Requires heightened scrutiny and broad member input." },
            { key: "other",            label: "Other",            isActive: true, description: "Proposals that don't fit an existing category. AI will apply general screening; the council may re-categorise before voting." },
          ],
          sectorExclusions: fields.sectorExclusions ?? [
            { value: "fashion",           description: "Clothing, apparel, or personal style businesses — excluded due to low community multiplier and high individual-brand risk." },
            { value: "restaurant",        description: "Dine-in food service establishments — excluded due to high failure rate and limited scalability within the coop model." },
            { value: "cafe",              description: "Coffee shops and casual eateries — excluded for the same reasons as restaurants." },
            { value: "food truck",        description: "Mobile food vending — excluded due to logistical complexity and thin margins that rarely generate shared returns." },
            { value: "personality brand", description: "Businesses built around a single individual's public profile — excluded because they cannot be collectively owned or scaled cooperatively." },
            { value: "lifestyle brand",   description: "Consumer identity or aspirational brands — excluded as they prioritise aesthetics over productive economic impact." },
          ],
          scorerAgents: fields.scorerAgents ?? [
            { agentKey: "finance",   label: "Finance & Treasury",       enabled: true },
            { agentKey: "market",    label: "Market & Revenue",         enabled: true },
            { agentKey: "community", label: "Community Economy",        enabled: true },
            { agentKey: "ops",       label: "Operations & Execution",   enabled: true },
            { agentKey: "general",   label: "General (Fallback)",       enabled: true },
          ],
          minScBalanceToSubmit: fields.minScBalanceToSubmit ?? 0,
          aiAutoApproveThresholdUSD: fields.aiAutoApproveThresholdUSD ?? 500,
          councilVoteThresholdUSD: fields.councilVoteThresholdUSD ?? 5000,
          strongGoalThreshold: fields.strongGoalThreshold ?? 0.70,
          missionMinThreshold: fields.missionMinThreshold ?? 0.50,
          structuralGate: fields.structuralGate ?? 0.65,
          createdBy: walletAddress,
        },
      });

      return mapDbToConfigOutput(newConfig);
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

      const current = await ctx.db.coopConfig.findFirst({
        where: { coopId, isActive: true },
        orderBy: { version: "desc" },
      });

      if (!current) {
        throw new Error(`No active config found for coopId: ${coopId}`);
      }

      const newFields: Record<string, any> = {};
      if (updates.missionGoals !== undefined) newFields.missionGoals = updates.missionGoals;
      if (updates.structuralWeights !== undefined) newFields.structuralWeights = updates.structuralWeights;
      if (updates.scoreMix !== undefined) newFields.scoreMix = updates.scoreMix;
      if (updates.screeningPassThreshold !== undefined) newFields.screeningPassThreshold = updates.screeningPassThreshold;
      if (updates.quorumPercent !== undefined) newFields.quorumPercent = updates.quorumPercent;
      if (updates.approvalThresholdPercent !== undefined) newFields.approvalThresholdPercent = updates.approvalThresholdPercent;
      if (updates.votingWindowDays !== undefined) newFields.votingWindowDays = updates.votingWindowDays;
      if (updates.scVotingCapPercent !== undefined) newFields.scVotingCapPercent = updates.scVotingCapPercent;
      if (updates.proposalCategories !== undefined) newFields.proposalCategories = updates.proposalCategories;
      if (updates.sectorExclusions !== undefined) newFields.sectorExclusions = updates.sectorExclusions;
      if (updates.scorerAgents !== undefined) newFields.scorerAgents = updates.scorerAgents;
      if (updates.minScBalanceToSubmit !== undefined) newFields.minScBalanceToSubmit = updates.minScBalanceToSubmit;
      if (updates.aiAutoApproveThresholdUSD !== undefined) newFields.aiAutoApproveThresholdUSD = updates.aiAutoApproveThresholdUSD;
      if (updates.councilVoteThresholdUSD !== undefined) newFields.councilVoteThresholdUSD = updates.councilVoteThresholdUSD;
      if (updates.strongGoalThreshold !== undefined) newFields.strongGoalThreshold = updates.strongGoalThreshold;
      if (updates.missionMinThreshold !== undefined) newFields.missionMinThreshold = updates.missionMinThreshold;
      if (updates.structuralGate !== undefined) newFields.structuralGate = updates.structuralGate;

      const diff = computeDiff(current, newFields);

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
            missionGoals: newFields.missionGoals ?? current.missionGoals,
            structuralWeights: newFields.structuralWeights ?? current.structuralWeights,
            scoreMix: newFields.scoreMix ?? current.scoreMix,
            screeningPassThreshold: newFields.screeningPassThreshold ?? current.screeningPassThreshold,
            quorumPercent: newFields.quorumPercent ?? current.quorumPercent,
            approvalThresholdPercent: newFields.approvalThresholdPercent ?? current.approvalThresholdPercent,
            votingWindowDays: newFields.votingWindowDays ?? current.votingWindowDays,
            scVotingCapPercent: newFields.scVotingCapPercent ?? current.scVotingCapPercent,
            proposalCategories: newFields.proposalCategories ?? current.proposalCategories,
            sectorExclusions: newFields.sectorExclusions ?? current.sectorExclusions,
            scorerAgents: newFields.scorerAgents ?? (current as any).scorerAgents ?? [],
            minScBalanceToSubmit: newFields.minScBalanceToSubmit ?? current.minScBalanceToSubmit,
            aiAutoApproveThresholdUSD: newFields.aiAutoApproveThresholdUSD ?? current.aiAutoApproveThresholdUSD ?? 500,
            councilVoteThresholdUSD: newFields.councilVoteThresholdUSD ?? current.councilVoteThresholdUSD ?? 5000,
            strongGoalThreshold: (newFields as any).strongGoalThreshold ?? (current as any).strongGoalThreshold ?? 0.70,
            missionMinThreshold: (newFields as any).missionMinThreshold ?? (current as any).missionMinThreshold ?? 0.50,
            structuralGate: (newFields as any).structuralGate ?? (current as any).structuralGate ?? 0.65,
            createdBy: walletAddress,
          },
        }),
      ]);

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
   * Propose a charter text change — creates a PENDING CharterAmendment.
   * The current charter is NOT changed until acknowledged.
   */
  proposeCharterChange: privateProcedure
    .input(z.object({
      coopId: z.string().min(1),
      proposedText: z.string().min(10),
      reason: z.string().min(3).max(500),
    }))
    .output(z.object({
      id: z.string(),
      status: z.string(),
      proposedAt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      // Cancel any existing pending amendment first (only one can be pending)
      await ctx.db.charterAmendment.updateMany({
        where: { coopId: input.coopId, status: "PENDING" },
        data: { status: "SUPERSEDED", reviewedBy: walletAddress, reviewedAt: new Date() },
      });

      const current = await ctx.db.coopConfig.findFirst({
        where: { coopId: input.coopId, isActive: true },
        orderBy: { version: "desc" },
      });

      const amendment = await ctx.db.charterAmendment.create({
        data: {
          coopId: input.coopId,
          proposedText: input.proposedText,
          currentText: current?.charterText ?? "",
          reason: input.reason,
          status: "PENDING",
          proposedBy: walletAddress,
        },
      });

      return {
        id: amendment.id,
        status: amendment.status,
        proposedAt: amendment.proposedAt instanceof Date ? amendment.proposedAt.toISOString() : amendment.proposedAt,
      };
    }),

  /**
   * Get the current pending charter amendment for a coopId, if any.
   */
  getPendingCharterAmendment: privateProcedure
    .input(z.object({ coopId: z.string().min(1) }))
    .output(z.object({
      amendment: z.object({
        id: z.string(),
        proposedText: z.string(),
        currentText: z.string(),
        reason: z.string(),
        status: z.string(),
        proposedBy: z.string(),
        proposedAt: z.string(),
      }).nullable(),
    }))
    .query(async ({ input, ctx }) => {
      const amendment = await ctx.db.charterAmendment.findFirst({
        where: { coopId: input.coopId, status: "PENDING" },
        orderBy: { proposedAt: "desc" },
      });

      if (!amendment) return { amendment: null };

      return {
        amendment: {
          id: amendment.id,
          proposedText: amendment.proposedText,
          currentText: amendment.currentText,
          reason: amendment.reason,
          status: amendment.status,
          proposedBy: amendment.proposedBy,
          proposedAt: amendment.proposedAt instanceof Date ? amendment.proposedAt.toISOString() : amendment.proposedAt,
        },
      };
    }),

  /**
   * Acknowledge a pending charter amendment — applies the change as a new config version.
   */
  acknowledgeCharterAmendment: privateProcedure
    .input(z.object({
      amendmentId: z.string().min(1),
      coopId: z.string().min(1),
    }))
    .output(CoopConfigOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      const amendment = await ctx.db.charterAmendment.findUnique({
        where: { id: input.amendmentId },
      });

      if (!amendment || amendment.status !== "PENDING") {
        throw new Error("Amendment not found or is no longer pending.");
      }

      const current = await ctx.db.coopConfig.findFirst({
        where: { coopId: input.coopId, isActive: true },
        orderBy: { version: "desc" },
      });

      if (!current) {
        throw new Error(`No active config found for coopId: ${input.coopId}`);
      }

      const [, newConfig] = await ctx.db.$transaction([
        // Mark old config inactive
        ctx.db.coopConfig.update({
          where: { id: current.id },
          data: { isActive: false },
        }),
        // Create new config version with the acknowledged charter text
        ctx.db.coopConfig.create({
          data: {
            coopId: input.coopId,
            version: current.version + 1,
            isActive: true,
            charterText: amendment.proposedText,
            missionGoals: current.missionGoals as Prisma.InputJsonValue,
            structuralWeights: current.structuralWeights as Prisma.InputJsonValue,
            scoreMix: current.scoreMix as Prisma.InputJsonValue,
            screeningPassThreshold: current.screeningPassThreshold,
            quorumPercent: current.quorumPercent,
            approvalThresholdPercent: current.approvalThresholdPercent,
            votingWindowDays: current.votingWindowDays,
            scVotingCapPercent: current.scVotingCapPercent,
            proposalCategories: current.proposalCategories as Prisma.InputJsonValue,
            sectorExclusions: current.sectorExclusions as Prisma.InputJsonValue,
            scorerAgents: ((current as any).scorerAgents ?? []) as Prisma.InputJsonValue,
            minScBalanceToSubmit: current.minScBalanceToSubmit,
            aiAutoApproveThresholdUSD: current.aiAutoApproveThresholdUSD,
            councilVoteThresholdUSD: current.councilVoteThresholdUSD,
            strongGoalThreshold: (current as any).strongGoalThreshold ?? 0.70,
            missionMinThreshold: (current as any).missionMinThreshold ?? 0.50,
            structuralGate: (current as any).structuralGate ?? 0.65,
            createdBy: walletAddress,
          },
        }),
      ]);

      // Mark amendment as acknowledged and record audit
      await Promise.all([
        ctx.db.charterAmendment.update({
          where: { id: amendment.id },
          data: { status: "ACKNOWLEDGED", reviewedBy: walletAddress, reviewedAt: new Date() },
        }),
        ctx.db.coopConfigAudit.create({
          data: {
            coopConfigId: newConfig.id,
            changedBy: walletAddress,
            reason: `Charter amendment acknowledged: ${amendment.reason}`,
            diff: [{ field: "charterText", before: amendment.currentText.substring(0, 200), after: amendment.proposedText.substring(0, 200) }] as Prisma.InputJsonValue,
          },
        }),
      ]);

      return mapDbToConfigOutput(newConfig);
    }),

  /**
   * Reject a pending charter amendment — marks it rejected without changing the charter.
   */
  rejectCharterAmendment: privateProcedure
    .input(z.object({
      amendmentId: z.string().min(1),
      reason: z.string().min(3).max(500),
    }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      const amendment = await ctx.db.charterAmendment.findUnique({
        where: { id: input.amendmentId },
      });

      if (!amendment || amendment.status !== "PENDING") {
        throw new Error("Amendment not found or is no longer pending.");
      }

      await ctx.db.charterAmendment.update({
        where: { id: input.amendmentId },
        data: { status: "REJECTED", reviewedBy: walletAddress, reviewedAt: new Date() },
      });

      return { success: true };
    }),

  // ── Generic Config Amendments ─────────────────────────────────────────────

  /**
   * Propose a change to any config section.
   * One pending amendment per section; proposing supersedes the existing one.
   */
  proposeConfigChange: privateProcedure
    .input(z.object({
      coopId: z.string().min(1),
      section: z.string().min(1),
      proposedChanges: z.record(z.unknown()),
      currentSnapshot: z.record(z.unknown()),
      reason: z.string().min(3).max(500),
    }))
    .output(z.object({
      id: z.string(),
      section: z.string(),
      status: z.string(),
      proposedAt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      await ctx.db.configAmendment.updateMany({
        where: { coopId: input.coopId, section: input.section, status: "PENDING" },
        data: { status: "SUPERSEDED", reviewedBy: walletAddress, reviewedAt: new Date() },
      });

      const amendment = await ctx.db.configAmendment.create({
        data: {
          coopId: input.coopId,
          section: input.section,
          proposedChanges: input.proposedChanges as Prisma.InputJsonValue,
          currentSnapshot: input.currentSnapshot as Prisma.InputJsonValue,
          reason: input.reason,
          status: "PENDING",
          proposedBy: walletAddress,
        },
      });

      return {
        id: amendment.id,
        section: amendment.section,
        status: amendment.status,
        proposedAt: amendment.proposedAt instanceof Date ? amendment.proposedAt.toISOString() : amendment.proposedAt,
      };
    }),

  /**
   * Return all pending ConfigAmendments for a coopId.
   */
  getPendingConfigAmendments: privateProcedure
    .input(z.object({ coopId: z.string().min(1) }))
    .output(z.array(z.object({
      id: z.string(),
      section: z.string(),
      proposedChanges: z.record(z.unknown()),
      currentSnapshot: z.record(z.unknown()),
      reason: z.string(),
      status: z.string(),
      proposedBy: z.string(),
      proposedAt: z.string(),
    })))
    .query(async ({ input, ctx }) => {
      const amendments = await ctx.db.configAmendment.findMany({
        where: { coopId: input.coopId, status: "PENDING" },
        orderBy: { proposedAt: "asc" },
      });

      return amendments.map(a => ({
        id: a.id,
        section: a.section,
        proposedChanges: a.proposedChanges as Record<string, unknown>,
        currentSnapshot: a.currentSnapshot as Record<string, unknown>,
        reason: a.reason,
        status: a.status,
        proposedBy: a.proposedBy,
        proposedAt: a.proposedAt instanceof Date ? a.proposedAt.toISOString() : a.proposedAt,
      }));
    }),

  /**
   * Acknowledge a pending ConfigAmendment — applies the change as a new config version.
   */
  acknowledgeConfigAmendment: privateProcedure
    .input(z.object({
      amendmentId: z.string().min(1),
      coopId: z.string().min(1),
    }))
    .output(CoopConfigOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      const amendment = await ctx.db.configAmendment.findUnique({
        where: { id: input.amendmentId },
      });

      if (!amendment || amendment.status !== "PENDING") {
        throw new Error("Amendment not found or is no longer pending.");
      }

      const current = await ctx.db.coopConfig.findFirst({
        where: { coopId: input.coopId, isActive: true },
        orderBy: { version: "desc" },
      });

      if (!current) throw new Error(`No active config found for coopId: ${input.coopId}`);

      const changes = amendment.proposedChanges as Record<string, unknown>;

      const [, newConfig] = await ctx.db.$transaction([
        ctx.db.coopConfig.update({
          where: { id: current.id },
          data: { isActive: false },
        }),
        ctx.db.coopConfig.create({
          data: {
            coopId: input.coopId,
            version: current.version + 1,
            isActive: true,
            charterText:               (changes.charterText               as string   | undefined) ?? current.charterText,
            missionGoals:              (changes.missionGoals              ?? current.missionGoals)              as Prisma.InputJsonValue,
            structuralWeights:         (changes.structuralWeights         ?? current.structuralWeights)         as Prisma.InputJsonValue,
            scoreMix:                  (changes.scoreMix                  ?? current.scoreMix)                  as Prisma.InputJsonValue,
            screeningPassThreshold:    (changes.screeningPassThreshold    as number  | undefined) ?? current.screeningPassThreshold,
            quorumPercent:             (changes.quorumPercent             as number  | undefined) ?? current.quorumPercent,
            approvalThresholdPercent:  (changes.approvalThresholdPercent  as number  | undefined) ?? current.approvalThresholdPercent,
            votingWindowDays:          (changes.votingWindowDays          as number  | undefined) ?? current.votingWindowDays,
            scVotingCapPercent:        (changes.scVotingCapPercent        as number  | undefined) ?? current.scVotingCapPercent,
            proposalCategories:        (changes.proposalCategories        ?? current.proposalCategories)        as Prisma.InputJsonValue,
            sectorExclusions:          (changes.sectorExclusions          ?? current.sectorExclusions)          as Prisma.InputJsonValue,
            scorerAgents:              ((changes.scorerAgents              ?? (current as any).scorerAgents ?? []))  as Prisma.InputJsonValue,
            minScBalanceToSubmit:      (changes.minScBalanceToSubmit      as number  | undefined) ?? current.minScBalanceToSubmit,
            aiAutoApproveThresholdUSD: (changes.aiAutoApproveThresholdUSD as number  | undefined) ?? (current.aiAutoApproveThresholdUSD ?? 500),
            councilVoteThresholdUSD:   (changes.councilVoteThresholdUSD   as number  | undefined) ?? (current.councilVoteThresholdUSD   ?? 5000),
            strongGoalThreshold: (changes.strongGoalThreshold as number | undefined) ?? ((current as any).strongGoalThreshold ?? 0.70),
            missionMinThreshold: (changes.missionMinThreshold as number | undefined) ?? ((current as any).missionMinThreshold ?? 0.50),
            structuralGate:      (changes.structuralGate      as number | undefined) ?? ((current as any).structuralGate      ?? 0.65),
            createdBy: walletAddress,
          },
        }),
      ]);

      await Promise.all([
        ctx.db.configAmendment.update({
          where: { id: amendment.id },
          data: { status: "ACKNOWLEDGED", reviewedBy: walletAddress, reviewedAt: new Date() },
        }),
        ctx.db.coopConfigAudit.create({
          data: {
            coopConfigId: newConfig.id,
            changedBy: walletAddress,
            reason: `[${amendment.section}] ${amendment.reason}`,
            diff: Object.keys(changes).map(field => ({
              field,
              before: (amendment.currentSnapshot as Record<string, unknown>)[field],
              after: changes[field],
            })) as Prisma.InputJsonValue,
          },
        }),
      ]);

      return mapDbToConfigOutput(newConfig);
    }),

  /**
   * Reject a pending ConfigAmendment.
   */
  rejectConfigAmendment: privateProcedure
    .input(z.object({
      amendmentId: z.string().min(1),
      reason: z.string().min(3).max(500),
    }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      const amendment = await ctx.db.configAmendment.findUnique({
        where: { id: input.amendmentId },
      });

      if (!amendment || amendment.status !== "PENDING") {
        throw new Error("Amendment not found or is no longer pending.");
      }

      await ctx.db.configAmendment.update({
        where: { id: input.amendmentId },
        data: { status: "REJECTED", reviewedBy: walletAddress, reviewedAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * Return all ConfigAmendments + CharterAmendments for a coopId, newest first.
   * Used for the dedicated amendments review page.
   */
  getAllAmendments: privateProcedure
    .input(z.object({ coopId: z.string().min(1) }))
    .output(z.object({
      config: z.array(z.object({
        id: z.string(),
        type: z.literal("config"),
        section: z.string(),
        reason: z.string(),
        status: z.string(),
        proposedBy: z.string(),
        proposedAt: z.string(),
        reviewedBy: z.string().nullable(),
        reviewedAt: z.string().nullable(),
        proposedChanges: z.record(z.unknown()),
        currentSnapshot: z.record(z.unknown()),
      })),
      charter: z.array(z.object({
        id: z.string(),
        type: z.literal("charter"),
        reason: z.string(),
        status: z.string(),
        proposedBy: z.string(),
        proposedAt: z.string(),
        reviewedBy: z.string().nullable(),
        reviewedAt: z.string().nullable(),
        proposedText: z.string(),
        currentText: z.string(),
      })),
    }))
    .query(async ({ input, ctx }) => {
      const [configAmendments, charterAmendments] = await Promise.all([
        ctx.db.configAmendment.findMany({
          where: { coopId: input.coopId },
          orderBy: { proposedAt: "desc" },
        }),
        ctx.db.charterAmendment.findMany({
          where: { coopId: input.coopId },
          orderBy: { proposedAt: "desc" },
        }),
      ]);

      return {
        config: configAmendments.map(a => ({
          id: a.id,
          type: "config" as const,
          section: a.section,
          reason: a.reason,
          status: a.status,
          proposedBy: a.proposedBy,
          proposedAt: a.proposedAt instanceof Date ? a.proposedAt.toISOString() : a.proposedAt,
          reviewedBy: a.reviewedBy ?? null,
          reviewedAt: a.reviewedAt instanceof Date ? a.reviewedAt.toISOString() : (a.reviewedAt ?? null),
          proposedChanges: a.proposedChanges as Record<string, unknown>,
          currentSnapshot: a.currentSnapshot as Record<string, unknown>,
        })),
        charter: charterAmendments.map(a => ({
          id: a.id,
          type: "charter" as const,
          reason: a.reason,
          status: a.status,
          proposedBy: a.proposedBy,
          proposedAt: a.proposedAt instanceof Date ? a.proposedAt.toISOString() : a.proposedAt,
          reviewedBy: a.reviewedBy ?? null,
          reviewedAt: a.reviewedAt instanceof Date ? a.reviewedAt.toISOString() : (a.reviewedAt ?? null),
          proposedText: a.proposedText,
          currentText: a.currentText,
        })),
      };
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
