import { Agent, run, webSearchTool } from "@openai/agents";
import { z } from "zod";
import type { ProposalInput, ProposalOutput, Alternative, MissingData, Decision, Evaluation, MissionImpactScore, ScorerAgent } from "./proposal.js";
import {
  ProposalInputZ,
  ProposalOutputZ,
  buildOutput,
  ProposalStatusZ,
  AlternativeZ,
  MissingDataZ,
  EvaluationZ,
} from "./proposal.js";
import type { KPIz } from "./proposal.js";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Config data from CoopConfig DB record, passed to engine methods.
 * Replaces old goalDefinitions/scoringWeights with mission/structural split.
 */
export interface CoopConfigData {
  charterText: string;
  /** Coop-specific mission goals with their priority weights */
  missionGoals: { key: string; label: string; priorityWeight: number; description?: string; domain?: string; scoringRubric?: string }[];
  /** Universal structural scoring weights */
  structuralWeights: { feasibility: number; risk: number; accountability: number };
  /** Blend ratio between mission and structural overall score */
  scoreMix: { missionWeight: number; structuralWeight: number };
  /** overall_score threshold to pass screening */
  screeningPassThreshold: number;
  proposalCategories: { key: string; label: string; isActive: boolean; description?: string }[];
  sectorExclusions: { value: string; description?: string }[];
  quorumPercent: number;
  approvalThresholdPercent: number;
  votingWindowDays: number;
  /** Configurable domain scorer-agent registry */
  scorerAgents?: ScorerAgent[];
  /**
   * Recent expert-calibration examples keyed by domain.
   * Fetched from ProposalGoalScore history before scoring and injected into each
   * domain agent's prompt so the AI learns from past human corrections.
   */
  expertCalibration?: Record<string, Array<{
    goalId: string;
    aiScore: number;
    expertScore: number;
    reason: string;
  }>>;
}

// ── Default config values ──────────────────────────────────────────────────
const DEFAULT_MISSION_GOALS: { key: string; label: string; priorityWeight: number; description?: string; domain?: string; scoringRubric?: string }[] = [
  {
    key: "income_stability",
    label: "Income Stability",
    priorityWeight: 0.35,
    description:
      "Does this proposal create reliable, living-wage income for Soulaan Co-op members? " +
      "Score high if it funds productive employment, apprenticeships, or revenue-generating operations " +
      "within SC-eligible sectors (manufacturing, logistics, trade training, exportable products, tech/IP). " +
      "Score low if income generated is marginal, speculative, or flows primarily to a single individual rather than the broader membership. " +
      "Per the charter, 85%+ of spending must be export-earning, import-reducing, or productive investment within 12–36 months.",
  },
  {
    key: "asset_creation",
    label: "Asset Creation",
    priorityWeight: 0.25,
    description:
      "Does this proposal build long-term, collectively owned productive assets — real estate, equipment, IP platforms, trade infrastructure, or equity stakes? " +
      "Score high if it transforms rent, consumption, or labor into durable equity and governance rights for the membership. " +
      "Score low if it funds depreciating goods, one-time events, non-scalable side hustles, or assets that accrue to one person. " +
      "Per the charter, the Soulaan Wealth Fund prioritises housing, trade schools, export businesses, and infrastructure above all else.",
  },
  {
    key: "leakage_reduction",
    label: "Leakage Reduction",
    priorityWeight: 0.20,
    description:
      "Does this proposal reduce the outflow of capital from the Black community economy by bringing more goods, services, or capacity in-house? " +
      "Score high if it substitutes an import with a co-op-produced alternative, lowers collective costs through bulk procurement, " +
      "or increases circulation of UC within the community rather than letting dollars exit to external vendors. " +
      "Score low if it increases dependence on outside suppliers, creates no substitution effect, or primarily serves individual consumption with no multiplier. " +
      "Per the charter surplus rule, proposals must demonstrably reduce the import side of the ledger.",
  },
  {
    key: "export_expansion",
    label: "Export Expansion",
    priorityWeight: 0.20,
    description:
      "Does this proposal bring new capital into the Soulaan economy by selling Black-created goods, services, or intellectual property to external markets? " +
      "Score high if it generates verifiable outside revenue within 12–24 months — exportable products (skincare, shelf-stable foods, B2B tools, IP platforms), " +
      "logistics serving outside clients, or manufacturing supply chains that sell beyond the co-op. " +
      "Score low if the business model is entirely inward-facing, relies on member spending to survive, or cannot demonstrate a credible path to external revenue. " +
      "Per the charter, expanding UC export inflow is one of the four core pillars of Black economic sovereignty.",
  },
];

const DEFAULT_STRUCTURAL_WEIGHTS = { feasibility: 0.40, risk: 0.35, accountability: 0.25 };
const DEFAULT_SCORE_MIX = { missionWeight: 0.6, structuralWeight: 0.4 };
const DEFAULT_PASS_THRESHOLD = 0.6;

function normalizeCurrency(val: unknown): "UC" | "USD" | "mixed" {
  const s = String(val).toUpperCase();
  if (s === "UC") return "UC";
  if (s === "MIXED") return "mixed";
  return "USD";
}

/**
 * ProposalEngine: Multi-agent orchestration using @openai/agents
 *
 * Scoring model:
 * - Evaluation Agent → structural_scores (universal) + mission_impact_scores (per-coop goals)
 * - Backend computes all weighted totals and pass/fail — LLM does NOT decide
 * - Alternatives Agent → counterfactual designs with overallScore
 * - Missing Data Agent → blocking vs non-blocking data gaps
 * - Decision Agent → advance/revise/block from scoring results
 */
export class ProposalEngine {
  private readonly version = "proposal-engine@2.0.0";

  async processProposal(input: ProposalInput, config?: CoopConfigData): Promise<ProposalOutput> {
    const validated = ProposalInputZ.parse(input);

    const extractedFields = await this.runExtractionAgent(validated, config);

    const [rawEval, governance, _kpis, checks] = await Promise.all([
      this.runEvaluationAgent(validated, extractedFields, config),
      this.runGovernanceAgent(validated, extractedFields, config),
      this.runKPIAgent(validated, extractedFields),
      this.runComplianceChecks(validated, extractedFields, config),
    ]);

    // Backend computes all totals — no LLM pass/fail
    const evaluation = this.computeEvaluation(rawEval, config);

    const [alternatives, missing_data] = await Promise.all([
      this.runAlternativeAgent(extractedFields, evaluation, config),
      this.runMissingDataAgent(extractedFields, evaluation, config),
    ]);

    const { decision, reasons, bestAlt } = this.decideWithAlternatives(evaluation, alternatives, missing_data);
    const status = this.statusFromDecision(decision);

    const baseOut = buildOutput({
      id: this.generateProposalId(),
      createdAt: new Date().toISOString(),
      status,
      input: validated,
      extractedFields,
      evaluation,
      governance,
      engineVersion: this.version,
      checks: [
        { name: "basic_validation", passed: true },
        ...checks,
      ],
    });

    const enhancedOutput = {
      ...baseOut,
      alternatives,
      bestAlternative: bestAlt,
      decision,
      decisionReasons: reasons,
      missing_data,
    };

    return ProposalOutputZ.parse(enhancedOutput);
  }

  /**
   * Evaluate a comment's alignment with this coop's mission goals.
   */
  async evaluateComment(
    commentText: string,
    proposalContext: { title: string; summary: string; category: string },
    config?: CoopConfigData,
  ): Promise<{ alignment: "ALIGNED" | "NEUTRAL" | "MISALIGNED"; score: number; analysis: string; goalsImpacted: string[] }> {
    const charterSummary = config?.charterText
      ? config.charterText.substring(0, 2000)
      : await this.readCharter().then(t => t.substring(0, 2000));

    const goalKeys = (config?.missionGoals ?? DEFAULT_MISSION_GOALS).map(g => g.key);

    const EvalSchema = z.object({
      alignment: z.enum(["ALIGNED", "NEUTRAL", "MISALIGNED"]),
      score: z.number().min(0).max(1),
      analysis: z.string().min(5),
      goalsImpacted: z.array(z.string()),
    });

    const agent = new Agent({
      name: "Comment Evaluation Agent",
      instructions: [
        "Evaluate whether a community comment on a proposal supports or conflicts with the co-op's mission goals.",
        "Charter summary:",
        charterSummary,
        "",
        `Valid mission goal keys: ${goalKeys.join(", ")}`,
        "",
        "Score 0-1 where 1 = strongly supports the co-op mission.",
        "ALIGNED = score >= 0.6, NEUTRAL = 0.3–0.6, MISALIGNED = < 0.3.",
        "goalsImpacted should list only mission goal keys that the comment meaningfully touches.",
        "",
        "WRITING RULES for the analysis field:",
        "- Write 1–2 plain sentences explaining what the comment is saying and why it aligns or conflicts with the mission.",
        "- Write as if summarising the comment for other community members reading the discussion.",
        "- Example: 'This comment raises a valid concern that the proposal mainly benefits the owner rather than the wider membership, which goes against the co-op's shared ownership goals.'",
        "- No scoring jargon. No phrases like 'mission alignment index' or 'structural compatibility'.",
        "",
        "Return ONLY valid JSON matching the schema.",
      ].join("\n"),
      model: "gpt-5.2",
      outputType: EvalSchema,
    });

    const result = await run(agent, [
      `Proposal: ${proposalContext.title} — ${proposalContext.summary}`,
      `Category: ${proposalContext.category}`,
      `Comment: ${commentText}`,
    ].join("\n")) as unknown as { finalOutput?: Record<string, unknown>; output?: Record<string, unknown> };

    const out = result.finalOutput ?? result.output ?? {};
    const score = this.clamp01((out.score as number | undefined) ?? 0.5);
    const alignment = (out.alignment as "ALIGNED" | "NEUTRAL" | "MISALIGNED" | undefined)
      ?? (score >= 0.6 ? "ALIGNED" : score >= 0.3 ? "NEUTRAL" : "MISALIGNED");
    const goalsImpacted = ((out.goalsImpacted as string[] | undefined) ?? []).filter((g: string) => goalKeys.includes(g));

    return {
      alignment,
      score,
      analysis: (out.analysis as string | undefined) || "No analysis available.",
      goalsImpacted,
    };
  }

  // ── Backend computation (no LLM) ──────────────────────────────────────────

  /**
   * Combine raw LLM structural/mission scores with config weights to produce
   * the final Evaluation object. All pass/fail logic lives here.
   */
  computeEvaluation(
    rawEval: {
      structural_scores: { goal_mapping_valid: boolean; feasibility_score: number; risk_score: number; accountability_score: number };
      mission_impact_scores: { goal_id: string; impact_score: number; score_reason?: string }[];
      violations: string[];
      risk_flags: string[];
      llm_summary: string;
    },
    config?: CoopConfigData,
  ): Evaluation {
    const missionGoals = config?.missionGoals ?? DEFAULT_MISSION_GOALS;
    const sw = config?.structuralWeights ?? DEFAULT_STRUCTURAL_WEIGHTS;
    const mix = config?.scoreMix ?? DEFAULT_SCORE_MIX;
    const threshold = config?.screeningPassThreshold ?? DEFAULT_PASS_THRESHOLD;

    // Build mission impact scores with priority weights from config
    const mission_impact_scores: MissionImpactScore[] = missionGoals.map(goal => {
      const found = rawEval.mission_impact_scores.find(s => s.goal_id === goal.key);
      return {
        goal_id: goal.key,
        impact_score: this.clamp01(found?.impact_score ?? 0.5),
        goal_priority_weight: goal.priorityWeight,
        ...(found?.score_reason ? { score_reason: found.score_reason } : {}),
      };
    });

    // mission_weighted_score = Σ impact_score * priority_weight
    const mission_weighted_score = this.clamp01(
      mission_impact_scores.reduce((acc, s) => acc + s.impact_score * s.goal_priority_weight, 0)
    );

    // structural_weighted_score: risk inverted (lower risk = better)
    const { feasibility_score, risk_score, accountability_score } = rawEval.structural_scores;
    const structural_weighted_score = this.clamp01(
      feasibility_score * sw.feasibility +
      (1 - risk_score) * sw.risk +
      accountability_score * sw.accountability
    );

    // overall_score = weighted blend of mission and structural
    const overall_score = this.clamp01(
      mission_weighted_score * mix.missionWeight +
      structural_weighted_score * mix.structuralWeight
    );

    const passes_threshold =
      overall_score >= threshold &&
      rawEval.structural_scores.goal_mapping_valid;

    return EvaluationZ.parse({
      structural_scores: rawEval.structural_scores,
      mission_impact_scores,
      computed_scores: {
        mission_weighted_score,
        structural_weighted_score,
        overall_score,
        passes_threshold,
      },
      violations: rawEval.violations,
      risk_flags: rawEval.risk_flags,
      llm_summary: rawEval.llm_summary,
    });
  }

  // ── Agents ────────────────────────────────────────────────────────────────

  async runExtractionAgent(input: ProposalInput, config?: CoopConfigData): Promise<{
    title: string;
    summary: string;
    proposer: { wallet: string; role: "member" | "merchant" | "anchor" | "bot"; displayName: string };
    region: { code: string; name: string };
    category: string;
    budget: { currency: "UC" | "USD" | "mixed"; amountRequested: number };
    treasuryPlan?: { localPercent: number; nationalPercent: number; acceptUC: true };
  }> {
    const categoryKeys = (config?.proposalCategories ?? [])
      .filter(c => c.isActive)
      .map(c => c.key);

    const ExtractionSchema = z.object({
      title: z.string().min(5).max(140),
      summary: z.string().min(20).max(1000),
      proposer: z.object({
        wallet: z.string(),
        role: z.enum(["member", "merchant", "anchor", "bot"]),
        displayName: z.string(),
      }),
      region: z.object({
        code: z.string().min(2),
        name: z.string().min(2),
      }),
      category: categoryKeys.length > 0
        ? z.enum(categoryKeys as [string, ...string[]])
        : z.string().min(1).max(64),
      budget: z.object({
        currency: z.enum(["UC", "USD", "mixed"]),
        amountRequested: z.number().nonnegative(),
      }),
      treasuryPlan: z.object({
        localPercent: z.number().min(0).max(100),
        nationalPercent: z.number().min(0).max(100),
        acceptUC: z.literal(true),
      }).optional().nullable(),
    });

    const charterContext = config?.charterText
      ? `Charter context: ${config.charterText.substring(0, 500)}`
      : "";

    const agent = new Agent({
      name: "Text Extraction Agent",
      instructions: [
        "Extract ALL structured information from raw proposal text.",
        charterContext,
        `Valid categories: ${categoryKeys.join(", ")}`,
        "ALL FIELDS ARE REQUIRED — Provide reasonable defaults if missing.",
        "- title: 5–140 chars",
        "- summary: 20–1000 chars",
        "- proposer: default {wallet: 'unknown', role: 'member', displayName: 'Anonymous'}",
        "- region: infer from text or default to US/United States",
        "- category: determine from proposal type",
        "- budget: extract amount and currency or estimate",
        "Use web_search for market data and comparable projects.",
        "Return ONLY valid JSON with ALL fields populated.",
      ].join("\n"),
      model: "gpt-5.2",
      outputType: ExtractionSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const result = await run(
      agent,
      `Proposal text to analyze: ${input.text}`,
    ) as unknown as { finalOutput?: Record<string, unknown>; output?: Record<string, unknown> };

    const out = result.finalOutput ?? result.output ?? {};

    return {
      title: (out.title as string | undefined) || "Untitled Proposal",
      summary: (out.summary as string | undefined) || input.text.substring(0, 500),
      proposer: (out.proposer as { wallet: string; role: "member" | "merchant" | "anchor" | "bot"; displayName: string } | undefined)
        || { wallet: "unknown", role: "member" as const, displayName: "Anonymous" },
      region: (out.region as { code: string; name: string } | undefined) || { code: "US", name: "United States" },
      category: (out.category as string | undefined) || "other",
      budget: out.budget
        ? { ...(out.budget as Record<string, unknown>), currency: normalizeCurrency((out.budget as { currency?: unknown }).currency), amountRequested: ((out.budget as { amountRequested?: number }).amountRequested ?? 10000) }
        : { currency: "USD" as const, amountRequested: 10000 },
      treasuryPlan: (out.treasuryPlan as { localPercent: number; nationalPercent: number; acceptUC: true } | undefined) ?? undefined,
    };
  }

  /**
   * Evaluation orchestrator: groups mission goals by domain, runs one specialist
   * agent per domain (falling back to the 'general' agent for unmapped goals),
   * and also runs the structural scorer.  All results are merged and returned in
   * the same shape as the old single-agent path so computeEvaluation() is unchanged.
   */
  private async runEvaluationAgent(
    input: ProposalInput,
    extractedFields: any,
    config?: CoopConfigData,
  ): Promise<{
    structural_scores: { goal_mapping_valid: boolean; feasibility_score: number; risk_score: number; accountability_score: number };
    mission_impact_scores: { goal_id: string; impact_score: number }[];
    violations: string[];
    risk_flags: string[];
    llm_summary: string;
  }> {
    const missionGoals = config?.missionGoals ?? DEFAULT_MISSION_GOALS;
    const scorerAgents = config?.scorerAgents ?? [];
    const expertCalibration = config?.expertCalibration ?? {};

    // ── Build enabled agent registry (agentKey → ScorerAgent) ─────────────────
    const enabledAgents = new Map(
      scorerAgents.filter(a => a.enabled !== false).map(a => [a.agentKey, a])
    );

    // ── Assign each goal to a domain; unmapped / disabled → 'general' ─────────
    const domainGoalMap = new Map<string, typeof missionGoals>();
    for (const goal of missionGoals) {
      const domain = (goal.domain && enabledAgents.has(goal.domain)) ? goal.domain : "general";
      if (!domainGoalMap.has(domain)) domainGoalMap.set(domain, []);
      domainGoalMap.get(domain)!.push(goal);
    }

    const proposalContext = [
      `Title: ${extractedFields.title}`,
      `Category: ${extractedFields.category}`,
      `Budget: ${extractedFields.budget?.currency} ${extractedFields.budget?.amountRequested}`,
      `Region: ${extractedFields.region?.code} - ${extractedFields.region?.name}`,
      `Summary: ${extractedFields.summary}`,
    ].join("\n");

    const charterContext = config?.charterText
      ? `Co-op Charter: ${config.charterText.substring(0, 800)}`
      : "Score for a community co-op proposal.";

    const proposalCategories = config?.proposalCategories ?? [];
    const categoryContext = proposalCategories.length > 0
      ? "PROPOSAL CATEGORIES:\n" +
        proposalCategories.filter(c => c.isActive).map(c => `- ${c.key} (${c.label})`).join("\n")
      : "";

    const exclusionList = config?.sectorExclusions ?? [];
    const exclusionContext = exclusionList.length > 0
      ? "SECTOR EXCLUSIONS — flag if proposal matches:\n" +
        exclusionList.map(e => `- ${e.value}`).join("\n")
      : "";

    const MissionScoreItemZ = z.object({
      goal_id: z.string(),
      impact_score: z.number().min(0).max(1),
      /** Why this specific score was given and what the proposal would need to score higher. */
      score_reason: z.string().min(5),
    });

    const DomainScorerOutputZ = z.object({
      mission_impact_scores: z.array(MissionScoreItemZ),
    });

    // ── Run each domain scorer in parallel ────────────────────────────────────
    const domainScoringPromises = Array.from(domainGoalMap.entries()).map(
      async ([domain, goals]) => {
        const agentDef = enabledAgents.get(domain);
        const domainLabel = agentDef?.label ?? (domain === "general" ? "General Co-op Scorer" : domain);
        const modelOverride = agentDef?.model ?? "gpt-5.2";

        const goalDescriptions = goals.map(g => {
          const rubric = g.scoringRubric ?? g.description ?? `Score how well this proposal advances ${g.label}`;
          return `- ${g.key} (${g.label}, weight ${Math.round(g.priorityWeight * 100)}%): ${rubric}`;
        }).join("\n");

        const customPrompt = agentDef?.promptTemplate ?? "";

        // Build calibration block from past expert corrections for this domain
        const domainExamples = expertCalibration[domain] ?? [];
        let calibrationBlock = "";
        if (domainExamples.length > 0) {
          const lines = domainExamples.map(ex =>
            `  • Goal "${ex.goalId}": AI scored ${Math.round(ex.aiScore * 100)}% → expert moved to ${Math.round(ex.expertScore * 100)}%. Reason: "${ex.reason}"`
          );
          calibrationBlock = [
            "CALIBRATION FROM PAST EXPERT REVIEWS (use these to align your scoring):",
            ...lines,
            "Apply the same judgment: where experts consistently raised or lowered AI scores, adjust accordingly.",
          ].join("\n");
        }

        const agentInstructions = [
          charterContext,
          "",
          `You are the ${domainLabel} expert scorer for this co-op.`,
          "Score ONLY the mission goals listed below — do not add others.",
          "",
          "MISSION GOALS TO SCORE (0..1):",
          goalDescriptions,
          categoryContext ? `\n${categoryContext}` : "",
          exclusionContext ? `\n${exclusionContext}` : "",
          customPrompt ? `\n${customPrompt}` : "",
          calibrationBlock ? `\n${calibrationBlock}` : "",
          "",
          "SCORING GUIDELINES:",
          "- 0.0–0.3: Proposal does not address this goal at all.",
          "- 0.3–0.5: Partial or indirect connection to the goal.",
          "- 0.5–0.7: Clear connection with some evidence.",
          "- 0.7–0.9: Strong evidence and direct contribution.",
          "- 0.9–1.0: Exceptional, primary purpose of the proposal.",
          "",
          "For EVERY goal you score, you MUST also provide a score_reason field.",
          "score_reason rules:",
          "- 1–2 plain sentences explaining exactly why this score was given.",
          "- Explicitly state what evidence IS present (justifying the score).",
          "- Explicitly state what is MISSING or would need to change to score higher.",
          "- Example: 'The proposal describes two new jobs for members but gives no wage details (current: 52%). To score above 70%, it should specify living-wage rates and show income is sustained beyond the first year.'",
          "- Write directly to the proposer. No jargon.",
          "",
          "Be consistent. Use the same rubric bands every time.",
          "Return ONLY valid JSON matching the schema.",
        ].filter(Boolean).join("\n");

        const agent = new Agent({
          name: `${domainLabel} Scorer`,
          instructions: agentInstructions,
          model: modelOverride,
          outputType: DomainScorerOutputZ,
          tools: [webSearchTool()],
          modelSettings: { toolChoice: "auto" },
        });

        const result = await run(agent, proposalContext) as unknown as {
          finalOutput?: Record<string, unknown>;
          output?: Record<string, unknown>;
        };
        const out = result.finalOutput ?? result.output ?? {};
        const scores = (out.mission_impact_scores as { goal_id: string; impact_score: number; score_reason?: string }[] | undefined) ?? [];
        return { domain, goals, scores };
      }
    );

    // ── Structural scorer (always runs once, same as before) ──────────────────
    const StructuralOutputZ = z.object({
      structural_scores: z.object({
        goal_mapping_valid: z.boolean(),
        feasibility_score: z.number().min(0).max(1),
        risk_score: z.number().min(0).max(1),
        accountability_score: z.number().min(0).max(1),
      }),
      violations: z.array(z.string()),
      risk_flags: z.array(z.string()),
      llm_summary: z.string(),
    });

    const structuralAgent = new Agent({
      name: "Structural Scorer",
      instructions: [
        charterContext,
        "",
        "Score these STRUCTURAL dimensions (0..1) — universal for all co-op proposals:",
        "- goal_mapping_valid: true if the proposal clearly maps to at least one mission goal",
        "- feasibility_score: execution realism (team, timeline, market fit)",
        "- risk_score: 0 = low risk, 1 = very high risk",
        "- accountability_score: clarity of milestones, reporting, and verification",
        "",
        categoryContext,
        exclusionContext,
        "",
        "Also provide:",
        "- violations: short plain sentences for any policy violations. Empty array if none.",
        "- risk_flags: top risks as short plain sentences. Empty array if none.",
        "- llm_summary: 2–3 plain sentences for a community member. No jargon.",
        "",
        "TONE: Write like you're talking to a smart neighbour. Under 25 words per sentence.",
        "Return ONLY valid JSON matching the schema.",
      ].filter(Boolean).join("\n"),
      model: "gpt-5.2",
      outputType: StructuralOutputZ,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    // ── Run everything in parallel ────────────────────────────────────────────
    const [domainResults, structuralResult] = await Promise.all([
      Promise.all(domainScoringPromises),
      run(structuralAgent, proposalContext) as unknown as Promise<{
        finalOutput?: Record<string, unknown>;
        output?: Record<string, unknown>;
      }>,
    ]);

    // ── Merge domain scores into flat mission_impact_scores ───────────────────
    const allMissionScores: { goal_id: string; impact_score: number; score_reason?: string }[] = [];
    for (const { goals, scores } of domainResults) {
      for (const goal of goals) {
        const found = scores.find(s => s.goal_id === goal.key);
        allMissionScores.push({
          goal_id: goal.key,
          impact_score: this.clamp01(found?.impact_score ?? 0.5),
          score_reason: found?.score_reason,
        });
      }
    }

    const sOut = structuralResult.finalOutput ?? structuralResult.output ?? {};
    const structural = (sOut.structural_scores as Record<string, unknown> | undefined) ?? {};

    return {
      structural_scores: {
        goal_mapping_valid: Boolean(structural.goal_mapping_valid ?? true),
        feasibility_score: this.clamp01((structural.feasibility_score as number | undefined) ?? 0.5),
        risk_score: this.clamp01((structural.risk_score as number | undefined) ?? 0.5),
        accountability_score: this.clamp01((structural.accountability_score as number | undefined) ?? 0.5),
      },
      mission_impact_scores: allMissionScores,
      violations: (sOut.violations as string[] | undefined) ?? [],
      risk_flags: (sOut.risk_flags as string[] | undefined) ?? [],
      llm_summary: (sOut.llm_summary as string | undefined) ?? "",
    };
  }

  private async runGovernanceAgent(input: ProposalInput, extractedFields: any, config?: CoopConfigData): Promise<{
    quorumPercent: number;
    approvalThresholdPercent: number;
    votingWindowDays: number;
  }> {
    const defaultQuorum = config?.quorumPercent ?? 20;
    const defaultApproval = config?.approvalThresholdPercent ?? 60;
    const defaultWindow = config?.votingWindowDays ?? 7;

    const GovernanceSchema = z.object({
      quorumPercent: z.number().min(0).max(100),
      approvalThresholdPercent: z.number().min(0).max(100),
      votingWindowDays: z.number().int().min(1).max(30),
    });

    const agent = new Agent({
      name: "Governance Policy Agent",
      instructions: [
        "Recommend governance parameters for cooperative proposals.",
        `Defaults: quorum=${defaultQuorum}, approval=${defaultApproval}, window=${defaultWindow}. Adjust slightly by budget/category, but stay within bounds.`,
        "Use web_search to research cooperative governance precedents when uncertain.",
        "Return ONLY valid JSON matching the schema.",
      ].join("\n"),
      model: "gpt-5.2",
      outputType: GovernanceSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const result = await run(
      agent,
      [
        `Budget: ${extractedFields.budget?.currency} ${extractedFields.budget?.amountRequested}`,
        `Category: ${extractedFields.category}`,
      ].join("\n"),
    ) as unknown as { finalOutput?: Record<string, unknown>; output?: Record<string, unknown> };
    const out = result.finalOutput ?? result.output ?? {};
    return {
      quorumPercent: this.boundPercent((out.quorumPercent as number | undefined) ?? defaultQuorum),
      approvalThresholdPercent: this.boundPercent((out.approvalThresholdPercent as number | undefined) ?? defaultApproval),
      votingWindowDays: Math.max(1, Math.min(30, Math.trunc((out.votingWindowDays as number | undefined) ?? defaultWindow))),
    };
  }

  private async runKPIAgent(input: ProposalInput, extractedFields: any): Promise<z.infer<typeof KPIz>[]> {
    const agent = new Agent({
      name: "KPI Agent",
      instructions: [
        "Propose up to 3 concrete KPIs for the proposal.",
        "Each KPI should have a short name, numeric target, and unit among USD|UC|jobs|percent|count.",
        "Use web_search for realistic targets.",
        "Return ONLY a JSON array of KPIs (max 3).",
      ].join("\n"),
      model: "gpt-5.2",
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    await run(agent, [
      `Title: ${extractedFields.title}`,
      `Summary: ${extractedFields.summary}`,
      `Category: ${extractedFields.category}`,
      `Budget: ${extractedFields.budget?.currency} ${extractedFields.budget?.amountRequested}`,
    ].join("\n"));

    return [
      { name: "export_revenue", target: 100_000, unit: "USD" as const },
      { name: "jobs_created", target: 5, unit: "jobs" as const },
    ];
  }

  private async runAlternativeAgent(
    extracted: any,
    evaluation: Evaluation,
    config?: CoopConfigData,
  ): Promise<Alternative[]> {
    const missionGoals = config?.missionGoals ?? DEFAULT_MISSION_GOALS;
    const goalKeys = missionGoals.map(g => `${g.key} (${g.label})`);
    const passThreshold = config?.screeningPassThreshold ?? DEFAULT_PASS_THRESHOLD;

    const AltWrapperSchema = z.object({
      alternatives: z.array(z.object({
        label: z.string().min(3),
        changes: z.array(z.object({
          field: z.string(),
          from: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
          to: z.union([z.string(), z.number(), z.boolean()]),
        })).max(10),
        rationale: z.string().min(10),
        dataNeeds: z.array(z.string()).optional().nullable(),
      })).max(3),
    });

    const agent = new Agent({
      name: "Alternative Generator",
      instructions: [
        "Generate 1–3 concrete alternative versions of this proposal that would better serve the co-op's mission goals.",
        "Provide CHANGES as [{field, from, to}] where values are string, number, or boolean.",
        `Focus on mission goals: ${goalKeys.join(", ")}.`,
        "Prefer a low-cost improvement first; optionally include a higher-impact option.",
        "",
        `The co-op's minimum pass score is ${(passThreshold * 100).toFixed(0)}%. Only include alternatives that address the main weaknesses of the current proposal.`,
        "",
        "WRITING RULES for label and rationale fields:",
        "- label: a short, plain title like 'Start smaller and prove the model first' or 'Partner with an existing co-op supplier instead'.",
        "- rationale: 2–3 plain sentences explaining WHY this version would work better for the community. Write as if talking to the person who submitted the proposal.",
        "  Example good rationale: 'Starting with a $10,000 pilot instead of $50,000 reduces the risk to the co-op treasury. If the pilot succeeds, a larger funding round is much easier to approve. This approach has worked for similar food-production projects in other co-ops.'",
        "  Example bad rationale: 'This alternative improves the feasibility score and reduces accountability risk through structural realignment.'",
        "- No jargon. No scoring language. Write for a community member, not an analyst.",
        "",
        "Return ONLY a JSON object with 'alternatives' array. If no alternative would realistically pass, return an empty array.",
      ].join("\n"),
      model: "gpt-5.2",
      outputType: AltWrapperSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const currentScore = evaluation.computed_scores.overall_score.toFixed(3);

    const result = await run(agent, [
      `Category: ${extracted.category}`,
      `Region: ${extracted.region?.code}`,
      `Budget: ${extracted.budget?.currency} ${extracted.budget?.amountRequested}`,
      `Summary: ${extracted.summary}`,
      `Title: ${extracted.title}`,
      `Current overall_score: ${currentScore} (pass threshold: ${passThreshold.toFixed(2)})`,
    ].join("\n")) as unknown as { finalOutput?: Record<string, unknown>; output?: Record<string, unknown> };

    const output = result.finalOutput ?? result.output ?? {};
    const altsRaw = (output.alternatives as Record<string, unknown>[] | undefined) ?? [];

    return altsRaw
      .slice(0, 3)
      .map((alt) => ({
        label: (alt.label as string | undefined) || "Alternative",
        changes: (alt.changes as Alternative["changes"] | undefined) || [],
        overallScore: null, // score is only trusted after re-running the verified pipeline
        rationale: (alt.rationale as string | undefined) || "",
        dataNeeds: (alt.dataNeeds as string[] | undefined) ?? null,
      }));
  }

  private async runMissingDataAgent(
    extracted: any,
    evaluation: Evaluation,
    config?: CoopConfigData,
  ): Promise<MissingData[]> {
    const MDWrapperSchema = z.object({
      missing_data: z.array(MissingDataZ).max(10),
    });

    const passThreshold = config?.screeningPassThreshold ?? DEFAULT_PASS_THRESHOLD;
    const missionGoals = config?.missionGoals ?? DEFAULT_MISSION_GOALS;

    // ── Option 2: Current score context so the agent knows exactly where the proposal is weak ──
    const overallPct = Math.round(evaluation.computed_scores.overall_score * 100);
    const passesPct = Math.round(passThreshold * 100);
    const feasPct = Math.round(evaluation.structural_scores.feasibility_score * 100);
    const riskPct = Math.round(evaluation.structural_scores.risk_score * 100);
    const acctPct = Math.round(evaluation.structural_scores.accountability_score * 100);

    const scoreContext = [
      `CURRENT SCORES (out of 100):`,
      `  Overall: ${overallPct}% (pass threshold: ${passesPct}%)${overallPct >= passesPct ? " ✓ passes" : " ✗ does not pass"}`,
      `  Feasibility: ${feasPct}%`,
      `  Risk (lower = better): ${riskPct}%`,
      `  Accountability: ${acctPct}%`,
    ].join("\n");

    // ── Option 3: Per-goal rubric context for goals scoring below threshold ──
    const WEAK_GOAL_THRESHOLD = 0.55;
    const weakGoalLines: string[] = [];
    for (const ms of evaluation.mission_impact_scores) {
      if (ms.impact_score < WEAK_GOAL_THRESHOLD) {
        const goalDef = missionGoals.find(g => g.key === ms.goal_id);
        if (!goalDef) continue;
        const rubric = goalDef.scoringRubric ?? goalDef.description ?? `How well the proposal advances ${goalDef.label}`;
        weakGoalLines.push(
          `  • ${goalDef.label} (${ms.goal_id}): scored ${Math.round(ms.impact_score * 100)}% — low because: ${rubric}`
        );
      }
    }
    const weakGoalContext = weakGoalLines.length > 0
      ? [
          "",
          "MISSION GOALS WITH WEAK SCORES — focus your missing-data questions on what's needed to improve these:",
          ...weakGoalLines,
        ].join("\n")
      : "";

    const agent = new Agent({
      name: "Data Needs Agent",
      instructions: [
        "You are reviewing a co-op proposal against its scoring rubric.",
        "List ONLY missing information that would materially improve scoring outcomes (mission alignment, feasibility, risk, accountability).",
        "Do NOT ask for generic completeness data unless it changes the score or funding decision.",
        "Prioritise gaps that affect the weakest-scoring areas shown below.",
        "",
        scoreContext,
        weakGoalContext,
        "",
        "RULES:",
        "- Only list information that is genuinely absent from the proposal — don't flag things that were already addressed.",
        "- Focus on gaps that would raise a low score: missing budget breakdown, absent timeline, unclear team, unverified market claim, no accountability plan, etc.",
        "- Set blocking=true if the gap makes it impossible to score that dimension at all (e.g. no budget, no team, no plan).",
        "- Set blocking=false for gaps that would improve the score but aren't showstoppers.",
        "",
        "WRITING RULES:",
        "- field: short plain label, e.g. 'Budget breakdown' or 'Team qualifications'.",
        "- question: direct question to the proposer, e.g. 'How will the $25,000 be split between equipment and labour?'",
        "- why_needed: one plain sentence linking the gap to the score, e.g. 'An itemised budget would improve the feasibility score by showing the co-op the money will be spent responsibly.'",
        "- No jargon. Write as if leaving a note for the person who submitted the proposal.",
        "",
        "Return ONLY a JSON object with 'missing_data' array.",
      ].filter(Boolean).join("\n"),
      model: "gpt-5.2",
      outputType: MDWrapperSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const result = await run(agent, [
      `Title: ${extracted.title}`,
      `Category: ${extracted.category}`,
      `Region: ${extracted.region?.code}`,
      `Summary: ${extracted.summary}`,
      `Budget: ${extracted.budget?.currency} ${extracted.budget?.amountRequested}`,
    ].join("\n")) as unknown as { finalOutput?: Record<string, unknown>; output?: Record<string, unknown> };

    const output = result.finalOutput ?? result.output ?? {};
    return (output.missing_data as { field: string; question: string; why_needed: string; blocking: boolean }[] | undefined) ?? [];
  }

  private async runComplianceChecks(
    input: ProposalInput,
    extractedFields: any,
    config?: CoopConfigData,
  ): Promise<{ name: string; passed: boolean; note?: string }[]> {
    const checks: { name: string; passed: boolean; note?: string }[] = [];

    if (extractedFields.treasuryPlan) {
      const sum = Math.round(
        (extractedFields.treasuryPlan.localPercent + extractedFields.treasuryPlan.nationalPercent) * 100,
      ) / 100;
      checks.push({
        name: "treasury_allocation_sum",
        passed: sum === 100,
        note: sum === 100 ? undefined : `local+national=${sum} must equal 100`,
      });
    } else {
      // Treasury plan is optional; skip failing the proposal if it isn't provided.
      checks.push({ name: "treasury_allocation_sum", passed: true, note: "Treasury plan not provided" });
    }

    const defaultExclusions = [
      { value: "fashion" }, { value: "restaurant" }, { value: "cafe" }, { value: "food truck" },
    ];
    const exclusions = config?.sectorExclusions ?? defaultExclusions;
    const lower = `${extractedFields.title} ${input.text}`.toLowerCase();
    const excludedHit = exclusions.some((e) => lower.includes(e.value.toLowerCase()));
    checks.push({
      name: "sector_exclusion_screen",
      passed: !excludedHit,
      note: excludedHit ? "Proposal appears to match excluded sectors" : undefined,
    });

    const manipulationPatterns = [
      "ignore previous instructions", "do not research", "fast track",
      "approve regardless", "bypass checks", "override", "skip validation",
      "emergency approval", "urgent bypass", "disable guardrails",
    ];
    const manipulationHit = manipulationPatterns.some((p) => lower.includes(p));
    checks.push({
      name: "manipulation_attempt_detected",
      passed: !manipulationHit,
      note: manipulationHit ? "Detected language attempting to manipulate agent behavior" : undefined,
    });

    const unrealisticClaims = [
      "guaranteed profit", "risk-free", "100% success",
      "no downside", "unlimited potential", "revolutionary breakthrough",
    ];
    const unrealisticHit = unrealisticClaims.some((p) => lower.includes(p));
    checks.push({
      name: "unrealistic_claims_detected",
      passed: !unrealisticHit,
      note: unrealisticHit ? "Detected unrealistic or overly optimistic claims" : undefined,
    });

    if (config?.charterText) {
      checks.push({ name: "charter_loaded", passed: config.charterText.length > 50 });
    } else {
      try {
        const charter = await this.readCharter();
        checks.push({ name: "charter_loaded", passed: Boolean(charter && charter.length > 50) });
      } catch {
        checks.push({ name: "charter_loaded", passed: false, note: "read_error" });
      }
    }

    return checks;
  }

  // ── Decision logic ────────────────────────────────────────────────────────

  private decideWithAlternatives(
    evaluation: Evaluation,
    alts: Alternative[],
    missing: MissingData[],
  ): { decision: Decision; reasons: string[]; bestAlt?: Alternative } {
    const hasBlocking = missing.some(m => m.blocking);
    const best = alts.slice().sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))[0];
    const overallScore = evaluation.computed_scores.overall_score;

    if (hasBlocking) {
      return {
        decision: "block",
        reasons: ["This proposal is missing critical information needed before it can be reviewed — see the 'Missing Data' section below for what's needed."],
        bestAlt: best,
      };
    }

    if (!evaluation.computed_scores.passes_threshold) {
      return {
        decision: "revise",
        reasons: [
          `This proposal scored ${(overallScore * 100).toFixed(0)}% overall, which is below the co-op's minimum threshold to move forward. It needs to be strengthened before it can go to a vote.`,
          ...evaluation.risk_flags.slice(0, 2),
        ],
        bestAlt: best,
      };
    }

    if (evaluation.structural_scores.goal_mapping_valid === false) {
      return {
        decision: "revise",
        reasons: ["This proposal doesn't clearly connect to any of the co-op's mission goals. Revise it to explain how it serves the community's economic priorities."],
        bestAlt: best,
      };
    }

    return {
      decision: "advance",
      reasons: [
        `This proposal scored ${(overallScore * 100).toFixed(0)}% and meets the co-op's screening standards. It's ready to move forward for community review and voting.`,
      ],
      bestAlt: best,
    };
  }

  private statusFromDecision(d: Decision): z.infer<typeof ProposalStatusZ> {
    return d === "advance" ? "votable" : (d === "revise" ? "votable" : "submitted");
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private applyChangesShallow(original: any, changes: { field: string; from?: any; to: any }[]): any {
    const result = { ...original };
    for (const change of (changes || [])) {
      const parts = change.field.split(".");
      if (parts.length === 1 && parts[0]) {
        result[parts[0]] = change.to;
      } else if (parts.length === 2 && parts[0] && parts[1]) {
        if (!result[parts[0]]) result[parts[0]] = {};
        result[parts[0]] = { ...result[parts[0]], [parts[1]]: change.to };
      }
    }
    return result;
  }

  private async readCharter(): Promise<string> {
    const candidates = [
      path.resolve(process.cwd(), "documents/soulaan-coop-charter.md"),
      path.resolve(process.cwd(), "../../documents/soulaan-coop-charter.md"),
    ];
    for (const p of candidates) {
      try {
        const txt = await fs.readFile(p, "utf8");
        if (txt) return txt;
      } catch { /* empty */ }
    }
    return "";
  }

  private clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  private boundPercent(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.trunc(n)));
  }

  private generateProposalId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "prop_";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Rewrites an existing proposal text to incorporate an alternative's suggested changes.
   * The output is a new plain-English proposal text ready to be re-submitted through processProposal.
   */
  async rewriteWithAlternative(
    originalText: string,
    alternative: { label: string; rationale: string; changes: { field: string; from?: unknown; to: unknown }[] },
  ): Promise<string> {
    const RewriteSchema = z.object({
      rewritten_text: z.string().describe("The revised proposal text incorporating the alternative's changes"),
    });

    const safeStr = (v: unknown): string => (v == null ? "current value" : typeof v === "object" ? JSON.stringify(v) : String(v as string | number | boolean));
    const changesDescription = alternative.changes
      .map(c => `  • ${c.field}: change from "${safeStr(c.from)}" to "${safeStr(c.to)}"`)
      .join("\n");

    const agent = new Agent({
      name: "ProposalRewriteAgent",
      instructions: [
        "You are an expert cooperative proposal writer. Your job is to revise an existing proposal text to incorporate a specific set of suggested changes.",
        "",
        "RULES:",
        "- Preserve the proposer's original voice and intent as much as possible.",
        "- Only modify the parts that relate to the listed changes.",
        "- Keep the text in plain, conversational language that any community member can understand.",
        "- Do not add jargon, scoring terms, or technical analysis language.",
        "- The output must be a complete, self-contained proposal text — not a summary or bullet points.",
        "- Keep it concise: 150–350 words.",
        "",
        "Return ONLY valid JSON matching the schema.",
      ].join("\n"),
      model: "gpt-5.2",
      outputType: RewriteSchema,
    });

    const result = await run(agent, [
      `ORIGINAL PROPOSAL:\n${originalText}`,
      ``,
      `ALTERNATIVE LABEL: ${alternative.label}`,
      `ALTERNATIVE RATIONALE: ${alternative.rationale}`,
      ``,
      `CHANGES TO INCORPORATE:\n${changesDescription}`,
    ].join("\n")) as unknown as { finalOutput?: Record<string, unknown>; output?: Record<string, unknown> };

    const out = result.finalOutput ?? result.output ?? {};
    const rewritten = (out.rewritten_text as string | undefined)?.trim();
    if (!rewritten) throw new Error("RewriteAgent returned empty text");
    return rewritten;
  }
}

export const proposalEngine = new ProposalEngine();
