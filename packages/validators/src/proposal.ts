import { z } from "zod";

// ── enums ──────────────────────────────────────────────
export const ProposerRoleZ = z.enum(["member", "merchant", "anchor", "bot"]);
export const ProposalStatusZ = z.enum([
  "draft",
  "votable",
  "approved",
  "funded",
  "rejected",
]);
export const ProposalCategoryZ = z.enum([
  "business_funding",
  "procurement",
  "infrastructure",
  "transport",
  "wallet_incentive",
  "governance",
  "other",
]);

// ── shared blocks ─────────────────────────────────────
export const RegionZ = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
});

export const BudgetZ = z.object({
  currency: z.enum(["UC", "USD", "mixed"]),
  amountRequested: z.number().nonnegative(),
});

export const TreasuryPlanZ = z
  .object({
    localPercent: z.number().min(0).max(100),
    nationalPercent: z.number().min(0).max(100),
    acceptUC: z.literal(true), // v0 rule: must accept UC
  })
  .superRefine((t, ctx) => {
    if (Math.round((t.localPercent + t.nationalPercent) * 100) / 100 !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "localPercent + nationalPercent must equal 100",
      });
    }
  });

export const ImpactZ = z
  .object({
    leakageReductionUSD: z.number().nonnegative().default(0),
    jobsCreated: z.number().int().nonnegative().default(0),
    timeHorizonMonths: z.number().int().positive().default(12),
  })
  .default({ leakageReductionUSD: 0, jobsCreated: 0, timeHorizonMonths: 12 });

export const KPIz = z.object({
  name: z.string().min(2),
  target: z.number().nonnegative(),
  unit: z.enum(["USD", "UC", "jobs", "percent", "count"]),
});

// ── INPUT ─────────────────────────────────────────────
// Simplified schema allows users to provide minimal text-based input
// and lets AI infer structured fields like region, category, budget, etc.
export const ProposalInputZ = z.object({
  text: z.string().min(20).max(10000),
  proposer: z.object({
    wallet: z.string().min(3),
    role: ProposerRoleZ,
    displayName: z.string().optional().nullable(),
  }).optional().nullable(), // Make proposer optional
  // All other fields are optional and can be inferred by AI
  region: RegionZ.optional().nullable(),
  coopId: z.string().optional(),
});

// ── OUTPUT ────────────────────────────────────────────
export const ScoresZ = z.object({
  alignment: z.number().min(0).max(1),
  feasibility: z.number().min(0).max(1),
  composite: z.number().min(0).max(1),
});

export const GovernanceZ = z.object({
  quorumPercent: z.number().min(0).max(100).default(20),
  approvalThresholdPercent: z.number().min(0).max(100).default(60),
  votingWindowDays: z.number().int().positive().default(7),
});

export const AuditZ = z.object({
  engineVersion: z.string().min(1),
  checks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      note: z.string().optional().nullable(),
    }),
  ),
});

// ── V0.2 SCHEMAS ──────────────────────────────────────────────────────────

// Charter goal vector
export const GoalsZ = z.object({
  LeakageReduction: z.number().min(0).max(1),
  MemberBenefit: z.number().min(0).max(1),
  EquityGrowth: z.number().min(0).max(1),
  LocalJobs: z.number().min(0).max(1),
  CommunityVitality: z.number().min(0).max(1),
  Resilience: z.number().min(0).max(1),
  composite: z.number().min(0).max(1),
});

// Engine-generated alternative
export const AlternativeZ = z.object({
  label: z.string().min(3),
  changes: z.array(z.object({
    field: z.string(),     // dot-path e.g., "budget.amountRequested"
    from: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
    to: z.union([z.string(), z.number(), z.boolean()])
  })).max(10),
  scores: GoalsZ,          // charter goals for this alt
  rationale: z.string().min(10),
  dataNeeds: z.array(z.string()).optional().nullable()
});

export const DecisionZ = z.enum(["advance","revise","block"]);

export const MissingDataZ = z.object({
  field: z.string(),
  question: z.string(),
  why_needed: z.string(),
  blocking: z.boolean().default(false)
});

export const ProposalOutputZ = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  status: ProposalStatusZ,

  title: z.string(),
  summary: z.string(),
  proposer: z.object({
    wallet: z.string(),
    role: ProposerRoleZ,
    displayName: z.string().optional().nullable(),
  }),
  region: RegionZ,
  category: ProposalCategoryZ,
  budget: BudgetZ,
  treasuryPlan: TreasuryPlanZ,
  impact: ImpactZ, // required after engine normalization

  scores: ScoresZ,
  governance: GovernanceZ,
  audit: AuditZ,
  goalScores: GoalsZ.optional().nullable(),                     // original proposal in goal-space
  alternatives: z.array(AlternativeZ).default([]),   // engine-generated
  bestAlternative: AlternativeZ.optional().nullable(),          // top-scoring viable alt
  decision: DecisionZ.default("advance"),            // advance|revise|block
  decisionReasons: z.array(z.string()).default([]),  // human-readable rationale
  missing_data: z.array(MissingDataZ).default([]), 
});


// ── Coop Config Schemas ──────────────────────────────────────────────────────

export const GoalDefinitionZ = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().min(0).max(1),
  description: z.string().optional(),
});

export const ProposalCategoryConfigZ = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  isActive: z.boolean(),
});

export const ScoringWeightsZ = z.object({
  selfReliance: z.number().min(0).max(1),
  communityJobs: z.number().min(0).max(1),
  assetRetention: z.number().min(0).max(1),
  transparency: z.number().min(0).max(1),
  culturalValue: z.number().min(0).max(1),
});

export const CoopConfigInputZ = z.object({
  coopId: z.string().min(1),
  charterText: z.string().min(10).optional(),
  goalDefinitions: z.array(GoalDefinitionZ).optional(),
  quorumPercent: z.number().min(0).max(100).optional(),
  approvalThresholdPercent: z.number().min(0).max(100).optional(),
  votingWindowDays: z.number().int().min(1).max(90).optional(),
  scVotingCapPercent: z.number().min(0).max(100).optional(),
  proposalCategories: z.array(ProposalCategoryConfigZ).optional(),
  sectorExclusions: z.array(z.string()).optional(),
  minScBalanceToSubmit: z.number().min(0).optional(),
  scoringWeights: ScoringWeightsZ.optional(),
  reason: z.string().min(3).max(500),
});

export const CoopConfigOutputZ = z.object({
  id: z.string(),
  coopId: z.string(),
  version: z.number(),
  isActive: z.boolean(),
  charterText: z.string(),
  goalDefinitions: z.array(GoalDefinitionZ),
  quorumPercent: z.number(),
  approvalThresholdPercent: z.number(),
  votingWindowDays: z.number(),
  scVotingCapPercent: z.number(),
  proposalCategories: z.array(ProposalCategoryConfigZ),
  sectorExclusions: z.array(z.string()),
  minScBalanceToSubmit: z.number(),
  scoringWeights: ScoringWeightsZ,
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
});

// ── Comment Schemas ──────────────────────────────────────────────────────

export const CommentAlignmentZ = z.enum(["ALIGNED", "NEUTRAL", "MISALIGNED"]);

export const CommentInputZ = z.object({
  proposalId: z.string().min(1),
  content: z.string().min(5).max(5000),
});

export const CommentAIEvaluationZ = z.object({
  alignment: CommentAlignmentZ,
  score: z.number().min(0).max(1),
  analysis: z.string().min(1),
  goalsImpacted: z.array(z.string()),
});

export const CommentOutputZ = z.object({
  id: z.string(),
  proposalId: z.string(),
  authorWallet: z.string(),
  authorName: z.string().optional().nullable(),
  content: z.string(),
  createdAt: z.string(),
  aiEvaluation: CommentAIEvaluationZ.optional().nullable(),
});

// ── tiny helper: build output from input + computed values ────────────────────
export function buildOutput(params: {
  id: string;
  createdAt: string; // ISO
  status: z.infer<typeof ProposalStatusZ>;
  input: z.infer<typeof ProposalInputZ>;
  extractedFields: {
    title?: string;
    summary?: string;
    category?: z.infer<typeof ProposalCategoryZ>;
    budget?: z.infer<typeof BudgetZ>;
    treasuryPlan?: z.infer<typeof TreasuryPlanZ>;
    impact?: z.infer<typeof ImpactZ>;
  };
  scores: z.infer<typeof ScoresZ>;
  governance?: Partial<z.infer<typeof GovernanceZ>>;
  engineVersion: string;
  checks: { name: string; passed: boolean; note?: string }[];
}) {
  const gov = GovernanceZ.parse(params.governance ?? {});
  const out = {
    id: params.id,
    createdAt: params.createdAt,
    status: params.status,
    title: params.extractedFields.title ?? "Untitled Proposal",
    summary: params.extractedFields.summary ?? params.input.text.substring(0, 500),
    proposer: params.input.proposer ?? { wallet: "unknown", role: "member" as const },
    region: params.input.region ?? { code: "US", name: "United States" },
    category: params.extractedFields.category ?? "other" as const,
    budget: params.extractedFields.budget ?? { currency: "USD" as const, amountRequested: 0 },
    treasuryPlan: params.extractedFields.treasuryPlan ?? { localPercent: 70, nationalPercent: 30, acceptUC: true as const },
    impact: params.extractedFields.impact ?? ImpactZ.parse({}),
    scores: params.scores,
    governance: gov,
    audit: { engineVersion: params.engineVersion, checks: params.checks },
  };
  return ProposalOutputZ.parse(out);
}

// ── Type exports ──────────────────────────────────────
export type ProposalInput = z.infer<typeof ProposalInputZ>;
export type ProposalOutput = z.infer<typeof ProposalOutputZ>;
export type ProposerRole = z.infer<typeof ProposerRoleZ>;
export type ProposalStatus = z.infer<typeof ProposalStatusZ>;
export type ProposalCategory = z.infer<typeof ProposalCategoryZ>;
export type Scores = z.infer<typeof ScoresZ>;
export type Governance = z.infer<typeof GovernanceZ>;
export type Audit = z.infer<typeof AuditZ>;
export type Goals = z.infer<typeof GoalsZ>;
export type Alternative = z.infer<typeof AlternativeZ>;
export type Decision = z.infer<typeof DecisionZ>;
export type MissingData = z.infer<typeof MissingDataZ>;
export type GoalDefinition = z.infer<typeof GoalDefinitionZ>;
export type ProposalCategoryConfig = z.infer<typeof ProposalCategoryConfigZ>;
export type ScoringWeights = z.infer<typeof ScoringWeightsZ>;
export type CoopConfigInput = z.infer<typeof CoopConfigInputZ>;
export type CoopConfigOutput = z.infer<typeof CoopConfigOutputZ>;
export type CommentAlignment = z.infer<typeof CommentAlignmentZ>;
export type CommentInput = z.infer<typeof CommentInputZ>;
export type CommentAIEvaluation = z.infer<typeof CommentAIEvaluationZ>;
export type CommentOutput = z.infer<typeof CommentOutputZ>;
