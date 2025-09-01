                import { z } from "zod";

                // ── enums ──────────────────────────────────────────────
                export const ProposerRoleZ = z.enum(["member", "merchant", "anchor", "bot"]);
                export const ProposalStatusZ = z.enum(["draft","votable","approved","funded","rejected"]);
                export const ProposalCategoryZ = z.enum([
                  "business_funding","procurement","infrastructure","transport",
                  "wallet_incentive","governance","other"
                ]);

                // ── shared blocks ─────────────────────────────────────
                export const RegionZ = z.object({
                  code: z.string().min(2),
                  name: z.string().min(2)
                });

                export const BudgetZ = z.object({
                  currency: z.enum(["UC","USD","mixed"]),
                  amountRequested: z.number().nonnegative()
                });

                export const TreasuryPlanZ = z.object({
                  localPercent: z.number().min(0).max(100),
                  nationalPercent: z.number().min(0).max(100),
                  acceptUC: z.literal(true) // v0 rule: must accept UC
                }).superRefine((t, ctx) => {
                  if (Math.round((t.localPercent + t.nationalPercent) * 100) / 100 !== 100) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "localPercent + nationalPercent must equal 100" });
                  }
                });

                export const ImpactZ = z.object({
                  leakageReductionUSD: z.number().nonnegative().default(0),
                  jobsCreated: z.number().int().nonnegative().default(0),
                  timeHorizonMonths: z.number().int().positive().default(12)
                }).default({ leakageReductionUSD: 0, jobsCreated: 0, timeHorizonMonths: 12 });

                export const KPIz = z.object({
                  name: z.string().min(2),
                  target: z.number().nonnegative(),
                  unit: z.enum(["USD","UC","jobs","percent","count"])
                });

                // ── INPUT (v0) ────────────────────────────────────────
                export const ProposalInputV0Z = z.object({
                  title: z.string().min(5).max(140),
                  summary: z.string().min(20).max(1000),
                  proposer: z.object({
                    wallet: z.string().min(3),
                    role: ProposerRoleZ,
                    displayName: z.string().optional()
                  }),
                  region: RegionZ,
                  category: ProposalCategoryZ,
                  budget: BudgetZ,
                  treasuryPlan: TreasuryPlanZ,
                  impact: ImpactZ.optional(),
                  kpis: KPIz.array().max(3).optional()
                })
                .transform((input) => {
                  // fill defaults for impact
                  const impact = ImpactZ.parse(input.impact ?? {});
                  return { ...input, impact };
                });

                // ── OUTPUT (v0) ───────────────────────────────────────
                export const ScoresV0Z = z.object({
                  alignment: z.number().min(0).max(1),
                  feasibility: z.number().min(0).max(1),
                  composite: z.number().min(0).max(1)
                });

                export const GovernanceV0Z = z.object({
                  quorumPercent: z.number().min(0).max(100).default(20),
                  approvalThresholdPercent: z.number().min(0).max(100).default(60),
                  votingWindowDays: z.number().int().positive().default(7)
                });

                export const AuditV0Z = z.object({
                  engineVersion: z.string().min(1),
                  checks: z.array(z.object({
                    name: z.string(),
                    passed: z.boolean(),
                    note: z.string().optional()
                  }))
                });

                export const ProposalOutputV0Z = z.object({
                  id: z.string().min(1),
                  createdAt: z.string().datetime(),
                  status: ProposalStatusZ,

                  title: z.string(),
                  summary: z.string(),
                  proposer: z.object({
                    wallet: z.string(),
                    role: ProposerRoleZ,
                    displayName: z.string().optional()
                  }),
                  region: RegionZ,
                  category: ProposalCategoryZ,
                  budget: BudgetZ,
                  treasuryPlan: TreasuryPlanZ,
                  impact: ImpactZ, // required after engine normalization

                  scores: ScoresV0Z,
                  governance: GovernanceV0Z,
                  audit: AuditV0Z
                });

                // ── tiny helper: build output from input + computed values ────────────────────
                export function buildOutputV0(params: {
                  id: string;
                  createdAt: string; // ISO
                  status: z.infer<typeof ProposalStatusZ>;
                  input: z.infer<typeof ProposalInputV0Z>;
                  scores: z.infer<typeof ScoresV0Z>;
                  governance?: Partial<z.infer<typeof GovernanceV0Z>>;
                  engineVersion: string;
                  checks: { name: string; passed: boolean; note?: string }[];
                }) {
                  const gov = GovernanceV0Z.parse(params.governance ?? {});
                  const out = {
                    id: params.id,
                    createdAt: params.createdAt,
                    status: params.status,
                    title: params.input.title,
                    summary: params.input.summary,
                    proposer: params.input.proposer,
                    region: params.input.region,
                    category: params.input.category,
                    budget: params.input.budget,
                    treasuryPlan: params.input.treasuryPlan,
                    impact: params.input.impact, // already defaulted by transform
                    scores: params.scores,
                    governance: gov,
                    audit: { engineVersion: params.engineVersion, checks: params.checks }
                  };
                  return ProposalOutputV0Z.parse(out);
                }

                // ── Type exports ──────────────────────────────────────
                export type ProposalInputV0 = z.infer<typeof ProposalInputV0Z>;
                export type ProposalOutputV0 = z.infer<typeof ProposalOutputV0Z>;
                export type ProposerRole = z.infer<typeof ProposerRoleZ>;
                export type ProposalStatus = z.infer<typeof ProposalStatusZ>;
                export type ProposalCategory = z.infer<typeof ProposalCategoryZ>;