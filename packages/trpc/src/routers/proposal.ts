import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../trpc.js";
import { authenticatedProcedure, publicProcedure, privateProcedure } from "../procedures/index.js";
import { ProposalInputZ, ProposalOutputZ, proposalEngine, type ProposalOutput } from "@repo/validators";
import type { CoopConfigData } from "@repo/validators";
import { ProposalCategory, ProposalStatus, ProposerRole, Currency, VoteType } from "@repo/db";
import type { AuthenticatedContext } from "../context.js";

export const proposalRouter = router({
  /**
   * Create a new proposal (authenticated — any wallet holder)
   * Auto-approves if AI says "advance" AND budget < councilVoteThresholdUSD
   * Sets councilRequired=true if AI says "advance" AND budget >= threshold
   */
  create: authenticatedProcedure
    .input(ProposalInputZ)
    .output(ProposalOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;
      const coopId = input.coopId || "soulaan";

      // Fetch active CoopConfig
      let configData: CoopConfigData | undefined;
      let threshold = 5000;
      const coopConfig = await ctx.db.coopConfig.findFirst({
        where: { coopId, isActive: true },
        orderBy: { version: "desc" },
      });

      if (coopConfig) {
        // Check SC balance against minScBalanceToSubmit
        if (coopConfig.minScBalanceToSubmit > 0) {
          // For now we skip actual on-chain balance check — just validate the rule exists
        }

        threshold = coopConfig.councilVoteThresholdUSD ?? 5000;

        configData = {
          charterText: coopConfig.charterText,
          goalDefinitions: coopConfig.goalDefinitions as Array<{ key: string; label: string; weight: number; description?: string }>,
          scoringWeights: coopConfig.scoringWeights as Record<string, number>,
          proposalCategories: coopConfig.proposalCategories as Array<{ key: string; label: string; isActive: boolean }>,
          sectorExclusions: coopConfig.sectorExclusions as string[],
          quorumPercent: coopConfig.quorumPercent,
          approvalThresholdPercent: coopConfig.approvalThresholdPercent,
          votingWindowDays: coopConfig.votingWindowDays,
        };
      }

      // Process proposal through engine with config
      const processedProposal = await proposalEngine.processProposal(input, configData);

      // Determine final status and councilRequired based on auto-approve logic
      const budget = processedProposal.budget.amountRequested;
      let finalStatus: ProposalStatus;
      let councilRequired = false;

      if (processedProposal.decision === "advance") {
        if (budget < threshold) {
          finalStatus = ProposalStatus.APPROVED; // auto-approve
        } else {
          finalStatus = ProposalStatus.VOTABLE;
          councilRequired = true;
        }
      } else {
        finalStatus = processedProposal.status.toUpperCase() as ProposalStatus;
      }

      // Save to database with enhanced fields
      const savedProposal = await ctx.db.proposal.create({
        data: {
          id: processedProposal.id,
          title: processedProposal.title,
          summary: processedProposal.summary,
          category: processedProposal.category.toUpperCase() as ProposalCategory,
          proposerWallet: walletAddress,
          proposerRole: (processedProposal.proposer.role || "member").toUpperCase() as ProposerRole,
          proposerDisplayName: processedProposal.proposer.displayName,
          regionCode: processedProposal.region.code,
          regionName: processedProposal.region.name,
          budgetCurrency: processedProposal.budget.currency.toUpperCase() as Currency,
          budgetAmount: processedProposal.budget.amountRequested,
          localPercent: processedProposal.treasuryPlan.localPercent,
          nationalPercent: processedProposal.treasuryPlan.nationalPercent,
          acceptUC: processedProposal.treasuryPlan.acceptUC,
          leakageReductionUSD: processedProposal.impact.leakageReductionUSD,
          jobsCreated: processedProposal.impact.jobsCreated,
          timeHorizonMonths: processedProposal.impact.timeHorizonMonths,
          alignmentScore: processedProposal.scores.alignment,
          feasibilityScore: processedProposal.scores.feasibility,
          compositeScore: processedProposal.scores.composite,
          quorumPercent: processedProposal.governance.quorumPercent,
          approvalThresholdPercent: processedProposal.governance.approvalThresholdPercent,
          votingWindowDays: processedProposal.governance.votingWindowDays,
          engineVersion: processedProposal.audit.engineVersion,
          status: finalStatus,
          councilRequired,
          // Enhanced fields
          coopId,
          categoryKey: processedProposal.category,
          goalScores: processedProposal.goalScores ?? undefined,
          alternatives: processedProposal.alternatives ?? undefined,
          bestAlternative: processedProposal.bestAlternative ?? undefined,
          decision: processedProposal.decision,
          decisionReasons: processedProposal.decisionReasons ?? [],
          missingData: processedProposal.missing_data ?? undefined,
          auditChecks: {
            createMany: {
              data: processedProposal.audit.checks.map((check: any) => ({
                name: check.name,
                passed: check.passed,
                note: check.note
              }))
            }
          }
        },
        include: {
          kpis: true,
          auditChecks: true
        }
      });

      // Fetch complete proposal
      const completeProposal = await ctx.db.proposal.findUnique({
        where: { id: savedProposal.id },
        include: {
          kpis: true,
          auditChecks: true
        }
      });

      return mapDbToOutput(completeProposal);
    }),

  /**
   * Get proposal by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .output(ProposalOutputZ.nullable())
    .query(async ({ input, ctx }) => {
      const proposal = await ctx.db.proposal.findUnique({
        where: { id: input.id },
        include: {
          kpis: true,
          auditChecks: true
        }
      });

      if (!proposal) return null;

      return mapDbToOutput(proposal);
    }),

  /**
   * List proposals with filtering and pagination
   */
  list: publicProcedure
    .input(z.object({
      status: z.enum(["submitted", "votable", "approved", "funded", "rejected", "failed", "withdrawn"]).optional(),
      category: z.enum([
        "business_funding", "procurement", "infrastructure", "transport",
        "wallet_incentive", "governance", "other"
      ]).optional(),
      region: z.string().optional(),
      coopId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0)
    }))
    .output(z.object({
      proposals: z.array(ProposalOutputZ),
      total: z.number(),
      hasMore: z.boolean()
    }))
    .query(async ({ input, ctx }) => {
      const where = {
        ...(input.status && { status: input.status.toUpperCase() as ProposalStatus }),
        ...(input.category && { category: input.category.toUpperCase() as ProposalCategory }),
        ...(input.region && { regionCode: input.region }),
        ...(input.coopId && { coopId: input.coopId }),
      };

      const [proposals, total] = await Promise.all([
        ctx.db.proposal.findMany({
          where,
          skip: input.offset,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            kpis: true,
            auditChecks: true
          }
        }),
        ctx.db.proposal.count({ where })
      ]);

      return {
        proposals: proposals.map(mapDbToOutput),
        total,
        hasMore: input.offset + input.limit < total
      };
    }),

  /**
   * Update proposal status (admin only)
   */
  updateStatus: privateProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["submitted", "votable", "approved", "funded", "rejected", "failed", "withdrawn"])
    }))
    .output(ProposalOutputZ)
    .mutation(async ({ input, ctx }) => {
      const proposal = await ctx.db.proposal.findUnique({ where: { id: input.id } });
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }

      const newStatus = input.status.toUpperCase() as ProposalStatus;
      const updateData: Record<string, any> = { status: newStatus };

      if (newStatus === ProposalStatus.WITHDRAWN) {
        const { walletAddress: adminWallet } = ctx as AuthenticatedContext;
        updateData.withdrawnAt = new Date();
        updateData.withdrawnBy = adminWallet;
      }

      const updated = await ctx.db.proposal.update({
        where: { id: input.id },
        data: updateData,
        include: { kpis: true, auditChecks: true }
      });

      return mapDbToOutput(updated);
    }),

  /**
   * Withdraw a proposal (proposer only)
   */
  withdraw: authenticatedProcedure
    .input(z.object({ id: z.string() }))
    .output(ProposalOutputZ)
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      const proposal = await ctx.db.proposal.findUnique({ where: { id: input.id } });
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }

      if (proposal.proposerWallet !== walletAddress) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the proposer can withdraw this proposal" });
      }

      const withdrawableStatuses: ProposalStatus[] = [ProposalStatus.SUBMITTED, ProposalStatus.VOTABLE];
      if (!withdrawableStatuses.includes(proposal.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot withdraw a proposal with status ${proposal.status.toLowerCase()}`
        });
      }

      const updated = await ctx.db.proposal.update({
        where: { id: input.id },
        data: {
          status: ProposalStatus.WITHDRAWN,
          withdrawnAt: new Date(),
          withdrawnBy: walletAddress,
        },
        include: { kpis: true, auditChecks: true }
      });

      return mapDbToOutput(updated);
    }),

  /**
   * Council vote on a proposal (admin only, councilRequired proposals)
   */
  councilVote: privateProcedure
    .input(z.object({
      proposalId: z.string(),
      vote: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
    }))
    .output(z.object({
      vote: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
      forCount: z.number(),
      againstCount: z.number(),
      abstainCount: z.number(),
      newStatus: z.string().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { walletAddress } = ctx as AuthenticatedContext;

      const proposal = await ctx.db.proposal.findUnique({ where: { id: input.proposalId } });
      if (!proposal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      }

      if (!proposal.councilRequired) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Council vote not required for this proposal" });
      }

      // Upsert vote
      await ctx.db.proposalVote.upsert({
        where: { proposalId_voterWallet: { proposalId: input.proposalId, voterWallet: walletAddress } },
        create: {
          proposalId: input.proposalId,
          voterWallet: walletAddress,
          vote: input.vote as VoteType,
        },
        update: {
          vote: input.vote as VoteType,
        },
      });

      // Count votes
      const [forCount, againstCount, abstainCount] = await Promise.all([
        ctx.db.proposalVote.count({ where: { proposalId: input.proposalId, vote: "FOR" } }),
        ctx.db.proposalVote.count({ where: { proposalId: input.proposalId, vote: "AGAINST" } }),
        ctx.db.proposalVote.count({ where: { proposalId: input.proposalId, vote: "ABSTAIN" } }),
      ]);

      const totalVotes = forCount + againstCount + abstainCount;
      let newStatus: string | null = null;

      // Auto-decide if enough votes
      if (totalVotes >= 2) {
        if (forCount > againstCount) {
          await ctx.db.proposal.update({
            where: { id: input.proposalId },
            data: { status: ProposalStatus.APPROVED },
          });
          newStatus = "approved";
        } else if (againstCount > forCount) {
          await ctx.db.proposal.update({
            where: { id: input.proposalId },
            data: { status: ProposalStatus.REJECTED },
          });
          newStatus = "rejected";
        }
      }

      return { vote: input.vote, forCount, againstCount, abstainCount, newStatus };
    }),

  /**
   * Get proposals by proposer wallet
   */
  getByProposer: publicProcedure
    .input(z.object({
      wallet: z.string(),
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0)
    }))
    .output(z.object({
      proposals: z.array(ProposalOutputZ),
      total: z.number()
    }))
    .query(async ({ input, ctx }) => {
      const [proposals, total] = await Promise.all([
        ctx.db.proposal.findMany({
          where: { proposerWallet: input.wallet },
          skip: input.offset,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            kpis: true,
            auditChecks: true
          }
        }),
        ctx.db.proposal.count({
          where: { proposerWallet: input.wallet }
        })
      ]);

      return {
        proposals: proposals.map(mapDbToOutput),
        total
      };
    }),

  /**
   * Get proposals by region
   */
  getByRegion: publicProcedure
    .input(z.object({
      regionCode: z.string(),
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0)
    }))
    .output(z.object({
      proposals: z.array(ProposalOutputZ),
      total: z.number()
    }))
    .query(async ({ input, ctx }) => {
      const [proposals, total] = await Promise.all([
        ctx.db.proposal.findMany({
          where: { regionCode: input.regionCode },
          skip: input.offset,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            kpis: true,
            auditChecks: true
          }
        }),
        ctx.db.proposal.count({
          where: { regionCode: input.regionCode }
        })
      ]);

      return {
        proposals: proposals.map(mapDbToOutput),
        total
      };
    }),

  /**
   * Test endpoint to verify engine functionality
   */
  testEngine: publicProcedure
    .output(ProposalOutputZ)
    .query(async () => {
      const testInput = {
        text: "Hampton Grocery Anchor: Fund a small-format grocery to reduce external food spend and increase UC usage. Budget needed: $150,000 USD. Located in Hampton Roads, VA. Expected to reduce economic leakage by $1,000,000 annually and create 12 jobs over 12 months. Target 750,000 USD in local spend retained and 200,000 UC in transactions.",
        proposer: { wallet: "0xabc123", role: "bot" as const, displayName: "SuggestionBot" },
        region: { code: "VA-HAMPTON", name: "Hampton Roads, VA" },
      };

      return proposalEngine.processProposal(testInput);
    })
});

// Helper function to map database records to output format
function mapDbToOutput(dbRecord: any): ProposalOutput {
  return {
    id: dbRecord.id,
    createdAt: dbRecord.createdAt.toISOString(),
    status: dbRecord.status.toLowerCase(),
    title: dbRecord.title,
    summary: dbRecord.summary,
    category: dbRecord.category.toLowerCase(),
    proposer: {
      wallet: dbRecord.proposerWallet,
      role: dbRecord.proposerRole.toLowerCase(),
      displayName: dbRecord.proposerDisplayName
    },
    region: {
      code: dbRecord.regionCode,
      name: dbRecord.regionName
    },
    budget: {
      currency: dbRecord.budgetCurrency === "MIXED" ? "mixed" : dbRecord.budgetCurrency,
      amountRequested: dbRecord.budgetAmount
    },
    treasuryPlan: {
      localPercent: dbRecord.localPercent,
      nationalPercent: dbRecord.nationalPercent,
      acceptUC: dbRecord.acceptUC
    },
    impact: {
      leakageReductionUSD: dbRecord.leakageReductionUSD,
      jobsCreated: dbRecord.jobsCreated,
      timeHorizonMonths: dbRecord.timeHorizonMonths
    },
    scores: {
      alignment: dbRecord.alignmentScore,
      feasibility: dbRecord.feasibilityScore,
      composite: dbRecord.compositeScore
    },
    governance: {
      quorumPercent: dbRecord.quorumPercent,
      approvalThresholdPercent: dbRecord.approvalThresholdPercent,
      votingWindowDays: dbRecord.votingWindowDays
    },
    audit: {
      engineVersion: dbRecord.engineVersion,
      checks: (dbRecord.auditChecks || []).map((check: any) => ({
        name: check.name,
        passed: check.passed,
        note: check.note
      }))
    },
    // Enhanced fields — read from DB or provide defaults
    goalScores: dbRecord.goalScores ?? undefined,
    alternatives: dbRecord.alternatives ?? [],
    bestAlternative: dbRecord.bestAlternative ?? undefined,
    decision: dbRecord.decision ?? "advance",
    decisionReasons: dbRecord.decisionReasons ?? [],
    missing_data: dbRecord.missingData ?? [],
  };
}
