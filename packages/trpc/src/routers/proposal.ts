import { z } from "zod";
import { router } from "../trpc.js";
import { privateProcedure, publicProcedure } from "../procedures/index.js";
import { ProposalInputV0Z, ProposalOutputV0Z, proposalEngine, type ProposalOutputV0 } from "@repo/validators";

export const proposalRouter = router({
  /**
   * Create a new proposal
   */
  create: privateProcedure
    .input(ProposalInputV0Z)
    .output(ProposalOutputV0Z)
    .mutation(async ({ input, ctx }) => {
      // Process proposal through engine (STUB)
      const processedProposal = await proposalEngine.processProposal(input);
      
      // Save to database
      const savedProposal = await ctx.db.proposal.create({
        data: {
          id: processedProposal.id,
          title: processedProposal.title,
          summary: processedProposal.summary,
          category: processedProposal.category.toUpperCase() as any,
          proposerWallet: processedProposal.proposer.wallet,
          proposerRole: processedProposal.proposer.role.toUpperCase() as any,
          proposerDisplayName: processedProposal.proposer.displayName,
          regionCode: processedProposal.region.code,
          regionName: processedProposal.region.name,
          budgetCurrency: processedProposal.budget.currency.toUpperCase() as any,
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
          status: processedProposal.status.toUpperCase() as any,
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

      // Create KPIs separately if they exist
      if (input.kpis && input.kpis.length > 0) {
        await ctx.db.proposalKPI.createMany({
          data: input.kpis.map((kpi: any) => ({
            proposalId: savedProposal.id,
            name: kpi.name,
            target: kpi.target,
            unit: kpi.unit.toUpperCase()
          }))
        });
      }

      // Fetch complete proposal with KPIs
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
    .output(ProposalOutputV0Z.nullable())
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
      status: z.enum(["draft", "votable", "approved", "funded", "rejected"]).optional(),
      category: z.enum([
        "business_funding", "procurement", "infrastructure", "transport",
        "wallet_incentive", "governance", "other"
      ]).optional(),
      region: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0)
    }))
    .output(z.object({
      proposals: z.array(ProposalOutputV0Z as any),
      total: z.number(),
      hasMore: z.boolean()
    }))
    .query(async ({ input, ctx }) => {
      const where = {
        ...(input.status && { status: input.status.toUpperCase() as any }),
        ...(input.category && { category: input.category.toUpperCase() as any }),
        ...(input.region && { regionCode: input.region })
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
   * Update proposal status (admin/system only)
   */
  updateStatus: privateProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["draft", "votable", "approved", "funded", "rejected"])
    }))
    .output(ProposalOutputV0Z)
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement authorization check
      // TODO: Update database
      // TODO: Return updated proposal
      
      throw new Error("Not implemented");
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
      proposals: z.array(ProposalOutputV0Z as any),
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
      proposals: z.array(ProposalOutputV0Z as any),
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
    .output(ProposalOutputV0Z)
    .query(async () => {
      // Test data matching your example
      const testInput = {
        title: "Hampton Grocery Anchor",
        summary: "Fund a small-format grocery to reduce external food spend and increase UC usage.",
        proposer: { wallet: "0xabc123", role: "bot" as const, displayName: "SuggestionBot" },
        region: { code: "VA-HAMPTON", name: "Hampton Roads, VA" },
        category: "business_funding" as const,
        budget: { currency: "USD" as const, amountRequested: 150_000 },
        treasuryPlan: { localPercent: 85, nationalPercent: 15, acceptUC: true as const },
        impact: { leakageReductionUSD: 1_000_000, jobsCreated: 12, timeHorizonMonths: 12 },
        kpis: [
          { name: "Local spend retained", target: 750_000, unit: "USD" as const },
          { name: "UC transactions", target: 200_000, unit: "UC" as const }
        ]
      };

      return proposalEngine.processProposal(testInput);
    })
});

// Helper function to map database records to output format
function mapDbToOutput(dbRecord: any): ProposalOutputV0 {
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
      currency: dbRecord.budgetCurrency.toLowerCase(),
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
      checks: dbRecord.auditChecks.map((check: any) => ({
        name: check.name,
        passed: check.passed,
        note: check.note
      }))
    }
  };
}