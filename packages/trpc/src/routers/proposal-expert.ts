import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../trpc.js";
import { privateProcedure, authenticatedProcedure } from "../procedures/index.js";
import type { AuthenticatedContext } from "../context.js";

// ── Shared output schemas ──────────────────────────────────────────────────

const ExpertAssignmentOutputZ = z.object({
  id: z.string(),
  walletAddress: z.string(),
  domain: z.string(),
  isActive: z.boolean(),
  assignedBy: z.string(),
  assignedAt: z.string(),
});

const GoalScoreOutputZ = z.object({
  id: z.string(),
  proposalId: z.string(),
  revisionNumber: z.number(),
  goalId: z.string(),
  domain: z.string(),
  aiScore: z.number(),
  expertScore: z.number().nullable(),
  finalScore: z.number(),
  expertWallet: z.string().nullable(),
  expertReason: z.string().nullable(),
  updatedAt: z.string(),
});

const AdjustmentLogOutputZ = z.object({
  id: z.string(),
  goalScoreId: z.string(),
  fromScore: z.number(),
  toScore: z.number(),
  reason: z.string(),
  expertWallet: z.string(),
  createdAt: z.string(),
});

// ── Helper ─────────────────────────────────────────────────────────────────

function mapGoalScore(r: {
  id: string; proposalId: string; revisionNumber: number; goalId: string;
  domain: string; aiScore: number; expertScore: number | null; finalScore: number;
  expertWallet: string | null; expertReason: string | null; updatedAt: Date;
}) {
  return {
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  };
}

// ── Router ─────────────────────────────────────────────────────────────────

export const proposalExpertRouter = router({

  // ── Admin: assign expert status ──────────────────────────────────────────

  assignExpert: privateProcedure
    .input(z.object({
      walletAddress: z.string(),
      domain: z.string().min(1),
    }))
    .output(ExpertAssignmentOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;
      const existing = await ctx.db.expertAssignment.findUnique({
        where: { walletAddress_domain: { walletAddress: input.walletAddress, domain: input.domain } },
      });
      if (existing) {
        const updated = await ctx.db.expertAssignment.update({
          where: { id: existing.id },
          data: { isActive: true, assignedBy: walletAddress },
        });
        return { ...updated, assignedAt: updated.assignedAt.toISOString() };
      }
      const created = await ctx.db.expertAssignment.create({
        data: {
          walletAddress: input.walletAddress,
          domain: input.domain,
          isActive: true,
          assignedBy: walletAddress,
        },
      });
      return { ...created, assignedAt: created.assignedAt.toISOString() };
    }),

  // ── Admin: revoke expert status ──────────────────────────────────────────

  revokeExpert: privateProcedure
    .input(z.object({
      walletAddress: z.string(),
      domain: z.string().min(1),
    }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.expertAssignment.updateMany({
        where: { walletAddress: input.walletAddress, domain: input.domain },
        data: { isActive: false },
      });
      return { success: true };
    }),

  // ── List all expert assignments (admin view) ─────────────────────────────

  listAssignments: privateProcedure
    .input(z.object({ domain: z.string().optional(), activeOnly: z.boolean().default(true) }))
    .output(z.array(ExpertAssignmentOutputZ))
    .query(async ({ input, ctx }) => {
      const records = await ctx.db.expertAssignment.findMany({
        where: {
          ...(input.domain ? { domain: input.domain } : {}),
          ...(input.activeOnly ? { isActive: true } : {}),
        },
        orderBy: [{ domain: "asc" }, { assignedAt: "desc" }],
      });
      return records.map(r => ({ ...r, assignedAt: r.assignedAt.toISOString() }));
    }),

  // ── Get current wallet's expert assignments ──────────────────────────────

  myAssignments: authenticatedProcedure
    .output(z.array(ExpertAssignmentOutputZ))
    .query(async ({ ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;
      const records = await ctx.db.expertAssignment.findMany({
        where: { walletAddress, isActive: true },
        orderBy: { domain: "asc" },
      });
      return records.map(r => ({ ...r, assignedAt: r.assignedAt.toISOString() }));
    }),

  // ── Get goal scores for a proposal revision ──────────────────────────────

  getGoalScores: authenticatedProcedure
    .input(z.object({
      proposalId: z.string(),
      revisionNumber: z.number().int().optional(),
    }))
    .output(z.array(GoalScoreOutputZ))
    .query(async ({ input, ctx }) => {
      let revNum = input.revisionNumber;
      if (revNum == null) {
        // Default to latest revision
        const latest = await ctx.db.proposalRevision.findFirst({
          where: { proposalId: input.proposalId },
          orderBy: { revisionNumber: "desc" },
          select: { revisionNumber: true },
        });
        revNum = latest?.revisionNumber ?? 1;
      }
      const scores = await ctx.db.proposalGoalScore.findMany({
        where: { proposalId: input.proposalId, revisionNumber: revNum },
        orderBy: { goalId: "asc" },
      });
      return scores.map(mapGoalScore);
    }),

  // ── Expert: submit or update a score override ────────────────────────────

  upsertExpertScore: authenticatedProcedure
    .input(z.object({
      proposalId: z.string(),
      revisionNumber: z.number().int(),
      goalId: z.string(),
      score: z.number().min(0).max(1),
      reason: z.string().min(5).max(1000),
    }))
    .output(GoalScoreOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      // Look up the goal score row
      const goalScore = await ctx.db.proposalGoalScore.findUnique({
        where: {
          proposalId_revisionNumber_goalId: {
            proposalId: input.proposalId,
            revisionNumber: input.revisionNumber,
            goalId: input.goalId,
          },
        },
      });
      if (!goalScore) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal score record not found for this revision." });
      }

      // Verify caller is an active expert for this goal's domain
      const assignment = await ctx.db.expertAssignment.findUnique({
        where: { walletAddress_domain: { walletAddress, domain: goalScore.domain } },
      });
      if (!assignment?.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You are not an active expert for the '${goalScore.domain}' domain.`,
        });
      }

      // Verify proposal is still in a scoreable state (not finalized/withdrawn)
      const proposal = await ctx.db.proposal.findUnique({
        where: { id: input.proposalId },
        select: { status: true },
      });
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found." });
      if (["WITHDRAWN", "REJECTED"].includes(proposal.status)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot score a withdrawn or rejected proposal." });
      }

      const fromScore = goalScore.expertScore ?? goalScore.aiScore;

      // Write adjustment log + update goal score in a transaction
      const [updated] = await ctx.db.$transaction([
        ctx.db.proposalGoalScore.update({
          where: { id: goalScore.id },
          data: {
            expertScore: input.score,
            finalScore: input.score, // expert override policy
            expertWallet: walletAddress,
            expertReason: input.reason,
          },
        }),
        ctx.db.proposalScoreAdjustmentLog.create({
          data: {
            goalScoreId: goalScore.id,
            fromScore,
            toScore: input.score,
            reason: input.reason,
            expertWallet: walletAddress,
          },
        }),
      ]);

      // Recompute aggregate scores for this proposal revision
      await recomputeRevisionScores(ctx.db, input.proposalId, input.revisionNumber);

      return mapGoalScore(updated);
    }),

  // ── Get adjustment log for a goal score ─────────────────────────────────

  getAdjustmentLog: authenticatedProcedure
    .input(z.object({ proposalId: z.string(), revisionNumber: z.number().int(), goalId: z.string() }))
    .output(z.array(AdjustmentLogOutputZ))
    .query(async ({ input, ctx }) => {
      const goalScore = await ctx.db.proposalGoalScore.findUnique({
        where: {
          proposalId_revisionNumber_goalId: {
            proposalId: input.proposalId,
            revisionNumber: input.revisionNumber,
            goalId: input.goalId,
          },
        },
        select: { id: true },
      });
      if (!goalScore) return [];
      const logs = await ctx.db.proposalScoreAdjustmentLog.findMany({
        where: { goalScoreId: goalScore.id },
        orderBy: { createdAt: "asc" },
      });
      return logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }));
    }),

  // ── Expert review queue: proposals with open goal scores ────────────────

  getExpertQueue: authenticatedProcedure
    .input(z.object({ domain: z.string().optional() }))
    .output(z.array(z.object({
      proposalId: z.string(),
      revisionNumber: z.number(),
      proposalTitle: z.string(),
      pendingGoals: z.number(),
    })))
    .query(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      // Get caller's active domains
      const assignments = await ctx.db.expertAssignment.findMany({
        where: {
          walletAddress,
          isActive: true,
          ...(input.domain ? { domain: input.domain } : {}),
        },
        select: { domain: true },
      });
      const myDomains = assignments.map(a => a.domain);
      if (myDomains.length === 0) return [];

      // Find goal scores that don't yet have an expert score, for my domains
      const pendingScores = await ctx.db.proposalGoalScore.groupBy({
        by: ["proposalId", "revisionNumber"],
        where: {
          domain: { in: myDomains },
          expertScore: null,
        },
        _count: { goalId: true },
      });
      if (pendingScores.length === 0) return [];

      // Enrich with proposal titles
      const proposals = await ctx.db.proposal.findMany({
        where: {
          id: { in: pendingScores.map(p => p.proposalId) },
          status: { notIn: ["WITHDRAWN", "REJECTED"] },
        },
        select: { id: true, title: true },
      });
      const titleMap = new Map(proposals.map(p => [p.id, p.title]));

      return pendingScores
        .filter(ps => titleMap.has(ps.proposalId))
        .map(ps => ({
          proposalId: ps.proposalId,
          revisionNumber: ps.revisionNumber,
          proposalTitle: titleMap.get(ps.proposalId) ?? "Unknown",
          pendingGoals: ps._count.goalId,
        }));
    }),
});

// ── Recompute aggregate scores after expert override ──────────────────────

async function recomputeRevisionScores(
  db: any,
  proposalId: string,
  revisionNumber: number,
): Promise<void> {
  const revision = await db.proposalRevision.findUnique({
    where: { proposalId_revisionNumber: { proposalId, revisionNumber } },
  });
  if (!revision?.evaluation) return;

  const evaluation = revision.evaluation as Record<string, any>;
  const goalScores = await db.proposalGoalScore.findMany({
    where: { proposalId, revisionNumber },
  });
  if (goalScores.length === 0) return;

  // Re-build mission_impact_scores using finalScore from DB
  const updatedMissionScores = goalScores.map((gs: any) => ({
    goal_id: gs.goalId,
    impact_score: gs.finalScore,
  }));

  // Patch the evaluation JSON and recompute derived scores
  const patchedEval: Record<string, any> = {
    ...evaluation,
    mission_impact_scores: updatedMissionScores,
  };

  // Recompute mission_weighted_score
  const missionGoals = (evaluation.mission_goals_used ?? []) as { key: string; priorityWeight: number }[];
  const totalWeight = missionGoals.reduce((s: number, g: any) => s + (g.priorityWeight ?? 0), 0) || 1;
  const missionWeightedScore = missionGoals.reduce((sum: number, goal: any) => {
    const ms = updatedMissionScores.find((m: any) => m.goal_id === goal.key);
    return sum + (ms?.impact_score ?? 0) * (goal.priorityWeight ?? 0);
  }, 0) / totalWeight;

  const scoreMix = (evaluation.computed_scores?.score_mix as { missionWeight: number; structuralWeight: number } | undefined)
    ?? { missionWeight: 0.6, structuralWeight: 0.4 };
  const structuralWeightedScore = evaluation.computed_scores?.structural_weighted_score ?? 0;
  const overallScore = scoreMix.missionWeight * missionWeightedScore + scoreMix.structuralWeight * structuralWeightedScore;
  const passesThreshold = overallScore >= (evaluation.computed_scores?.pass_threshold ?? 0.6);

  patchedEval.computed_scores = {
    ...evaluation.computed_scores,
    mission_weighted_score: missionWeightedScore,
    overall_score: overallScore,
    passes_threshold: passesThreshold,
    expert_adjusted: true,
  };

  await db.proposalRevision.update({
    where: { proposalId_revisionNumber: { proposalId, revisionNumber } },
    data: { evaluation: patchedEval },
  });

  // Also update the proposal's live evaluation if this is the latest revision
  const latest = await db.proposalRevision.findFirst({
    where: { proposalId },
    orderBy: { revisionNumber: "desc" },
    select: { revisionNumber: true },
  });
  if (latest?.revisionNumber === revisionNumber) {
    await db.proposal.update({
      where: { id: proposalId },
      data: { evaluation: patchedEval },
    });
  }
}
