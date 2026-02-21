import { Agent, run, webSearchTool } from "@openai/agents";
import { z } from "zod";
import type { ProposalInput, ProposalOutput, Goals, Alternative, MissingData, Decision } from "./proposal.js";
import {
  ProposalInputZ,
  ProposalOutputZ,
  buildOutput,
  ProposalStatusZ,
  AlternativeZ,
  MissingDataZ,
} from "./proposal.js";
import type { KPIz } from "./proposal.js";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Config data from CoopConfig DB record, passed to engine methods.
 */
export interface CoopConfigData {
  charterText: string;
  goalDefinitions: { key: string; label: string; weight: number; description?: string }[];
  scoringWeights: Record<string, number>;
  proposalCategories: { key: string; label: string; isActive: boolean }[];
  sectorExclusions: string[];
  quorumPercent: number;
  approvalThresholdPercent: number;
  votingWindowDays: number;
}

/**
 * ProposalEngine: Multi-agent orchestration using @openai/agents
 *
 * Agents:
 * - Text Extraction Agent → structured fields from raw text
 * - Impact Agent → scores {alignment, feasibility, composite}
 * - Governance Agent → governance params with guardrail re-validation
 * - KPI Agent → up to 3 KPIs (name, target, unit)
 * - Alternative Agent → generates counterfactual proposals with charter goal scoring
 * - Missing Data Agent → identifies blocking vs non-blocking data needs
 * - Decision Agent → advance/revise/block based on dominance and missing data
 * - Compliance checks → local rules + charter read
 */
function normalizeCurrency(val: unknown): "UC" | "USD" | "mixed" {
  const s = String(val).toUpperCase();
  if (s === "UC") return "UC";
  if (s === "MIXED") return "mixed";
  return "USD";
}

export class ProposalEngine {
  private readonly version = "proposal-engine@agents-1.0.0";

  async processProposal(input: ProposalInput, config?: CoopConfigData): Promise<ProposalOutput> {
    // Validate input
    const validated = ProposalInputZ.parse(input);

    // Build category list from config or use defaults
    const categoryKeys = config?.proposalCategories
      ?.filter(c => c.isActive)
      .map(c => c.key) ?? undefined;

    // Extract all structured fields from the text input using AI agents
    const extractedFields = await this.runExtractionAgent(validated, config);

    const [scores, governance, _kpis, checks] = await Promise.all([
      this.runImpactAgent(validated, extractedFields, config),
      this.runGovernanceAgent(validated, extractedFields, config),
      this.runKPIAgent(validated, extractedFields),
      this.runComplianceChecks(validated, extractedFields, config),
    ]);

    // V0.2: Compute charter goal scores and run new agents
    const goalScores = this.estimateGoals(extractedFields, config);
    const [alternatives, missing_data] = await Promise.all([
      this.runAlternativeAgent(extractedFields, config),
      this.runMissingDataAgent(extractedFields),
    ]);

    const { decision, reasons, bestAlt } = this.decideWithAlternatives(goalScores, alternatives, missing_data);
    const status = this.statusFromDecision(decision);

    // Build base output using existing function
    const baseOut = buildOutput({
      id: this.generateProposalId(),
      createdAt: new Date().toISOString(),
      status,
      input: validated,
      extractedFields: {
        ...extractedFields,
        impact: extractedFields.impact,
      },
      scores,
      governance,
      engineVersion: this.version,
      checks: [
        { name: "basic_validation", passed: true },
        ...checks,
      ],
    });

    // Extend with enhanced features
    const enhancedOutput = {
      ...baseOut,
      goalScores,
      alternatives,
      bestAlternative: bestAlt,
      decision,
      decisionReasons: reasons,
      missing_data,
    };

    return ProposalOutputZ.parse(enhancedOutput);
  }

  /**
   * Evaluate a comment's alignment with charter goals.
   */
  async evaluateComment(
    commentText: string,
    proposalContext: { title: string; summary: string; category: string },
    config?: CoopConfigData,
  ): Promise<{ alignment: "ALIGNED" | "NEUTRAL" | "MISALIGNED"; score: number; analysis: string; goalsImpacted: string[] }> {
    const charterSummary = config?.charterText
      ? config.charterText.substring(0, 2000)
      : await this.readCharter().then(t => t.substring(0, 2000));

    const goalKeys = config?.goalDefinitions?.map(g => g.key)
      ?? ["LeakageReduction", "MemberBenefit", "EquityGrowth", "LocalJobs", "CommunityVitality", "Resilience"];

    const EvalSchema = z.object({
      alignment: z.enum(["ALIGNED", "NEUTRAL", "MISALIGNED"]),
      score: z.number().min(0).max(1),
      analysis: z.string().min(5),
      goalsImpacted: z.array(z.string()),
    });

    const agent = new Agent({
      name: "Comment Evaluation Agent",
      instructions: [
        "Evaluate whether a community comment on a proposal aligns with the co-op charter goals.",
        "Charter summary:",
        charterSummary,
        "",
        `Valid goal keys: ${goalKeys.join(", ")}`,
        "",
        "Score 0-1 where 1 = perfectly aligned with charter goals.",
        "ALIGNED = score >= 0.6, NEUTRAL = 0.3-0.6, MISALIGNED = < 0.3.",
        "goalsImpacted should list only goal keys that the comment touches.",
        "Return ONLY valid JSON matching the schema.",
      ].join("\n"),
      model: "gpt-4.1-mini",
      outputType: EvalSchema,
    });

    const result = await run(agent, [
      `Proposal: ${proposalContext.title} — ${proposalContext.summary}`,
      `Category: ${proposalContext.category}`,
      `Comment: ${commentText}`,
    ].join("\n"));

    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};
    const score = this.clamp01(out.score ?? 0.5);
    const alignment = out.alignment ?? (score >= 0.6 ? "ALIGNED" : score >= 0.3 ? "NEUTRAL" : "MISALIGNED");
    const goalsImpacted = (out.goalsImpacted ?? []).filter((g: string) => goalKeys.includes(g));

    return {
      alignment,
      score,
      analysis: out.analysis || "No analysis available.",
      goalsImpacted,
    };
  }

  // ── Helper Functions ──────────────────────────────────────────────────────

  private estimateGoals(extracted: any, config?: CoopConfigData): Goals {
    // Estimate charter goal scores based on extracted fields
    const budget = extracted.budget?.amountRequested || 10000;
    const category = extracted.category || "other";

    // Base scores with category-specific adjustments
    const baseScores: Record<string, number> = {
      LeakageReduction: 0.5,
      MemberBenefit: 0.5,
      EquityGrowth: 0.4,
      LocalJobs: 0.4,
      CommunityVitality: 0.5,
      Resilience: 0.4,
    };

    // Category bonuses
    if (category === "infrastructure") {
      baseScores.Resilience = (baseScores.Resilience ?? 0) + 0.2;
      baseScores.CommunityVitality = (baseScores.CommunityVitality ?? 0) + 0.1;
    } else if (category === "business_funding") {
      baseScores.LeakageReduction = (baseScores.LeakageReduction ?? 0) + 0.2;
      baseScores.LocalJobs = (baseScores.LocalJobs ?? 0) + 0.2;
      baseScores.MemberBenefit = (baseScores.MemberBenefit ?? 0) + 0.1;
    } else if (category === "transport") {
      baseScores.CommunityVitality = (baseScores.CommunityVitality ?? 0) + 0.2;
      baseScores.MemberBenefit = (baseScores.MemberBenefit ?? 0) + 0.1;
    }

    // Budget impact (larger budgets can have more impact but also more risk)
    const budgetFactor = Math.min(budget / 100000, 2); // Cap at 2x for $100k+
    for (const key of Object.keys(baseScores)) {
      baseScores[key] = Math.min(
        (baseScores[key] ?? 0) * (0.8 + budgetFactor * 0.2),
        1.0
      );
    }

    // Use config goal definitions for weights if provided, otherwise use defaults
    const defaultWeights: Record<string, number> = {
      LeakageReduction: 0.25,
      MemberBenefit: 0.20,
      EquityGrowth: 0.15,
      LocalJobs: 0.15,
      CommunityVitality: 0.15,
      Resilience: 0.10,
    };

    const weights: Record<string, number> = {};
    if (config?.goalDefinitions && config.goalDefinitions.length > 0) {
      for (const gd of config.goalDefinitions) {
        weights[gd.key] = gd.weight;
      }
    } else {
      Object.assign(weights, defaultWeights);
    }

    // Calculate composite as weighted average
    let composite = 0;
    for (const [key, weight] of Object.entries(weights)) {
      composite += (baseScores[key] ?? 0) * weight;
    }

    return {
      LeakageReduction: baseScores.LeakageReduction ?? 0,
      MemberBenefit: baseScores.MemberBenefit ?? 0,
      EquityGrowth: baseScores.EquityGrowth ?? 0,
      LocalJobs: baseScores.LocalJobs ?? 0,
      CommunityVitality: baseScores.CommunityVitality ?? 0,
      Resilience: baseScores.Resilience ?? 0,
      composite: Math.min(Math.max(composite, 0), 1)
    };
  }

  private applyChangesShallow(original: any, changes: {field: string, from?: any, to: any}[]): any {
    const result = { ...original };

    changes.forEach(change => {
      const parts = change.field.split('.');
      if (parts.length === 1 && parts[0]) {
        result[parts[0]] = change.to;
      } else if (parts.length === 2 && parts[0] && parts[1]) {
        if (!result[parts[0]]) result[parts[0]] = {};
        result[parts[0]] = { ...result[parts[0]], [parts[1]]: change.to };
      }
    });

    return result;
  }

  // ── Agents ────────────────────────────────────────────────────────────

  async runExtractionAgent(input: ProposalInput, config?: CoopConfigData): Promise<{
    title: string;
    summary: string;
    proposer: { wallet: string; role: "member" | "merchant" | "anchor" | "bot"; displayName: string };
    region: { code: string; name: string };
    category: "business_funding" | "procurement" | "infrastructure" | "transport" | "wallet_incentive" | "governance" | "other";
    budget: { currency: "UC" | "USD" | "mixed"; amountRequested: number };
    treasuryPlan: { localPercent: number; nationalPercent: number; acceptUC: true };
    impact: { leakageReductionUSD: number; jobsCreated: number; timeHorizonMonths: number };
  }> {
    // Build category enum from config or use defaults
    const categoryKeys = config?.proposalCategories
      ?.filter(c => c.isActive)
      .map(c => c.key) ?? [
        "business_funding", "procurement", "infrastructure",
        "transport", "wallet_incentive", "governance", "other",
      ];

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
      category: z.enum([
        "business_funding",
        "procurement",
        "infrastructure",
        "transport",
        "wallet_incentive",
        "governance",
        "other",
      ]),
      budget: z.object({
        currency: z.enum(["UC", "USD", "mixed"]),
        amountRequested: z.number().nonnegative(),
      }),
      treasuryPlan: z.object({
        localPercent: z.number().min(0).max(100),
        nationalPercent: z.number().min(0).max(100),
        acceptUC: z.literal(true),
      }),
      impact: z.object({
        leakageReductionUSD: z.number().nonnegative(),
        jobsCreated: z.number().int().nonnegative(),
        timeHorizonMonths: z.number().int().positive(),
      }),
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
        "ALL FIELDS ARE REQUIRED - provide reasonable defaults if information is missing:",
        "- title: Extract clear title (5-140 chars) or create one from the proposal",
        "- summary: Create concise summary (20-1000 chars) of the proposal",
        "- proposer: If not mentioned, use defaults (wallet: 'unknown', role: 'member', displayName: 'Anonymous')",
        "- region: Infer from location mentions or default to US/United States",
        "- category: Determine from proposal type or default to 'other'",
        "- budget: Extract amount and currency or estimate based on proposal scope",
        "- treasuryPlan: Suggest local/national split (must sum to 100%), default 70/30",
        "- impact: Estimate economic impact based on proposal size and type",
        "Use web_search to research market data, comparable projects, and validate estimates.",
        "Base all financial estimates on real market research and comparable case studies.",
        "Return ONLY valid JSON with ALL fields populated.",
      ].join("\n"),
      model: "gpt-4.1-mini",
      outputType: ExtractionSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const result = await run(
      agent,
      [
        `Proposal text to analyze: ${input.text}`,
      ].join("\n"),
    );

    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};

    return {
      title: out.title || "Untitled Proposal",
      summary: out.summary || input.text.substring(0, 500),
      proposer: out.proposer || { wallet: "unknown", role: "member" as const, displayName: "Anonymous" },
      region: out.region || { code: "US", name: "United States" },
      category: out.category || "other" as const,
      budget: out.budget
        ? { ...out.budget, currency: normalizeCurrency(out.budget.currency) }
        : { currency: "USD" as const, amountRequested: 10000 },
      treasuryPlan: out.treasuryPlan || { localPercent: 70, nationalPercent: 30, acceptUC: true as const },
      impact: out.impact || { leakageReductionUSD: 5000, jobsCreated: 2, timeHorizonMonths: 12 },
    };
  }

  async runDecisionAgent(
    input: ProposalInput,
    extractedFields: any,
    scores: { alignment: number; feasibility: number; composite: number },
    checks: { name: string; passed: boolean; note?: string }[],
  ): Promise<z.infer<typeof ProposalStatusZ>> {
    const DecisionSchema = z.object({
      status: ProposalStatusZ
    });

    const failing = checks.some((c) => c.passed === false);

    const agent = new Agent({
      name: "Decision Agent",
      instructions: [
        "Decide the proposal status as one of: draft, votable, approved, funded, rejected.",
        "Rules:",
        "- If any critical compliance check fails → rejected.",
        "- Else if composite score is high and feasibility solid → votable or approved depending on confidence.",
        "- Default conservatively to draft when uncertain.",
        "Use web_search to verify key claims and check for negative precedents or risks.",
        "Output ONLY JSON matching the schema.",
      ].join("\n"),
      model: "gpt-4.1-mini",
      outputType: DecisionSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const result = await run(
      agent,
      [
        `HasFailingChecks: ${failing}`,
        `Scores: alignment=${scores.alignment.toFixed(3)}, feasibility=${scores.feasibility.toFixed(3)}, composite=${scores.composite.toFixed(3)}`,
        `Category: ${extractedFields.category}`,
        `Budget: ${extractedFields.budget?.currency} ${extractedFields.budget?.amountRequested}`,
        `Summary: ${extractedFields.summary}`,
      ].join("\n"),
    );

    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};
    return out.status ?? "draft";
  }

  private async runImpactAgent(input: ProposalInput, extractedFields: any, config?: CoopConfigData): Promise<{
    alignment: number;
    feasibility: number;
    composite: number;
  }> {
    const ImpactSchema = z.object({
      alignment: z.number().min(0).max(1),
      feasibility: z.number().min(0).max(1),
    });

    const charterContext = config?.charterText
      ? `Evaluate against this charter: ${config.charterText.substring(0, 800)}`
      : "Score alignment and feasibility (0..1) for Soulaan Co-op proposals.";

    const agent = new Agent({
      name: "Economic Impact Agent",
      instructions: [
        charterContext,
        "Alignment reflects mission fit and surplus-driven potential.",
        "Feasibility reflects execution risk and delivery capacity.",
        "Use web_search to research market data, sector benchmarks, and economic outcomes for similar projects.",
        "Base scores on proven economic research and comparable case studies.",
        "Return ONLY valid JSON matching the output schema.",
      ].join("\n"),
      model: "gpt-4.1-mini",
      outputType: ImpactSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const result = await run(
      agent,
      [
        `Category: ${extractedFields.category}`,
        `Budget: ${extractedFields.budget?.currency} ${extractedFields.budget?.amountRequested}`,
        `Region: ${extractedFields.region?.code} - ${extractedFields.region?.name}`,
        `Title: ${extractedFields.title}`,
        `Summary: ${extractedFields.summary}`,
      ].join("\n"),
    );

    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};
    const alignment = this.clamp01(out.alignment);
    const feasibility = this.clamp01(out.feasibility);
    const composite = this.clamp01((alignment + feasibility) / 2);
    return { alignment, feasibility, composite };
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
        "Use web_search to research cooperative governance precedents and best practices when uncertain.",
        "Return ONLY valid JSON matching the schema.",
      ].join("\n"),
      model: "gpt-4.1-mini",
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
    );
    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};
    return {
      quorumPercent: this.boundPercent(out.quorumPercent ?? defaultQuorum),
      approvalThresholdPercent: this.boundPercent(out.approvalThresholdPercent ?? defaultApproval),
      votingWindowDays: Math.max(1, Math.min(30, Math.trunc(out.votingWindowDays ?? defaultWindow))),
    };
  }

  private async runKPIAgent(input: ProposalInput, extractedFields: any): Promise<
    z.infer<typeof KPIz>[]
  > {
    const agent = new Agent({
      name: "KPI Agent",
      instructions: [
        "Propose up to 3 concrete KPIs for the proposal.",
        "Each KPI should have a short name, numeric target, and unit among USD|UC|jobs|percent|count.",
        "Align with surplus-driven outcomes (export earnings, import reduction, productive capacity).",
        "Use web_search to research realistic targets based on market data and comparable projects.",
        "Return ONLY a JSON array of KPIs (max 3) in this format:",
        '[{"name": "export_revenue", "target": 100000, "unit": "USD"}, {"name": "jobs_created", "target": 5, "unit": "jobs"}]',
      ].join("\n"),
      model: "gpt-4.1-mini",
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const _result = await run(
      agent,
      [
        `Title: ${extractedFields.title}`,
        `Summary: ${extractedFields.summary}`,
        `Category: ${extractedFields.category}`,
        `Budget: ${extractedFields.budget?.currency} ${extractedFields.budget?.amountRequested}`,
        `Region: ${extractedFields.region?.code}`,
      ].join("\n"),
    );

    // For now, return default KPIs since structured output parsing is complex
    // TODO: Implement proper text output parsing when SDK documentation is clearer
    return [
      { name: "export_revenue", target: 100_000, unit: "USD" as const },
      { name: "jobs_created", target: 5, unit: "jobs" as const },
    ];
  }


  private async runAlternativeAgent(extracted: any, config?: CoopConfigData): Promise<Alternative[]> {
    const goalKeys = config?.goalDefinitions?.map(g => `${g.key} (${g.label})`)
      ?? ["LeakageReduction", "MemberBenefit", "EquityGrowth", "LocalJobs", "CommunityVitality", "Resilience"];

    const AltWrapperSchema = z.object({
      alternatives: z.array(AlternativeZ).max(3)
    });

    const agent = new Agent({
      name: "Alternative Generator",
      instructions: [
        "Generate 1–3 concrete counterfactual designs that may better satisfy charter goals.",
        "- Provide CHANGES as [{field, from, to}] where 'from' and 'to' are string, number, or boolean values.",
        "- Set 'from' to null if original value is unknown, 'dataNeeds' to null if no additional data needed.",
        "- Example change: {field: 'budget.amountRequested', from: 25000, to: 15000}",
        `- Focus on charter goals: ${goalKeys.join(", ")}.`,
        "- Prefer a low-cost improvement first; optionally include a high-impact, higher-cost option.",
        "- Rationale must reference only charter goals, avoid UC-density terminology.",
        "Return ONLY a JSON object with 'alternatives' array matching the schema."
      ].join("\n"),
      model: "gpt-4.1-mini",
      outputType: AltWrapperSchema,
      tools: [webSearchTool()],
      modelSettings: { toolChoice: "auto" },
    });

    const result = await run(agent, [
      `Category: ${extracted.category}`,
      `Region: ${extracted.region?.code}`,
      `Budget: ${extracted.budget?.currency} ${extracted.budget?.amountRequested}`,
      `Summary: ${extracted.summary}`,
      `Title: ${extracted.title}`
    ].join("\n"));

    const output: any = (result as any).finalOutput ?? (result as any).output ?? {};
    const altsRaw: any[] = output.alternatives ?? [];
    const scored = altsRaw.slice(0,3).map((alt) => {
      const applied = this.applyChangesShallow(extracted, alt.changes);
      const goals = this.estimateGoals(applied, config);
      return { ...alt, scores: goals };
    });
    return scored;
  }

  private async runMissingDataAgent(extracted: any): Promise<MissingData[]> {
    const MDWrapperSchema = z.object({
      missing_data: z.array(MissingDataZ).max(10)
    });

    const agent = new Agent({
      name: "Data Needs Agent",
      instructions: [
        "List specific missing data items that affect feasibility, legality, or goal scoring.",
        "Mark blocking=true if absence prevents reliable feasibility or legality (e.g., zoning, site control, permits).",
        "Non-blocking for estimates that refine scoring (e.g., LOIs, surveys, market research).",
        "Focus on practical implementation needs for the specific proposal type and location.",
        "Return ONLY a JSON object with 'missing_data' array matching schema."
      ].join("\n"),
      model: "gpt-4.1-mini",
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
    ].join("\n"));

    const output: any = (result as any).finalOutput ?? (result as any).output ?? {};
    return output.missing_data ?? [];
  }

  private async runComplianceChecks(
    input: ProposalInput,
    extractedFields: any,
    config?: CoopConfigData,
  ): Promise<{ name: string; passed: boolean; note?: string }[]> {
    const checks: { name: string; passed: boolean; note?: string }[] = [];

    // Treasury allocation must sum to 100 (Zod enforces; record status)
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
      checks.push({
        name: "treasury_allocation_sum",
        passed: false,
        note: "Treasury plan missing - could not be extracted from text",
      });
    }

    // Sector exclusions — use config or hardcoded defaults
    const excludedKeywords = config?.sectorExclusions ?? ["fashion", "restaurant", "cafe", "food truck"];
    const lower = `${extractedFields.title} ${input.text}`.toLowerCase();
    const excludedHit = excludedKeywords.some((k) => lower.includes(k));
    checks.push({
      name: "sector_exclusion_screen",
      passed: !excludedHit,
      note: excludedHit ? "Proposal appears to match excluded sectors" : undefined,
    });

    // Prompt injection / agent manipulation detection
    const manipulationPatterns = [
      "ignore previous instructions",
      "do not research",
      "fast track",
      "approve regardless",
      "bypass checks",
      "override",
      "skip validation",
      "emergency approval",
      "urgent bypass",
      "disable guardrails"
    ];
    const manipulationHit = manipulationPatterns.some((p) => lower.includes(p));
    checks.push({
      name: "manipulation_attempt_detected",
      passed: !manipulationHit,
      note: manipulationHit ? "Detected language attempting to manipulate agent behavior" : undefined,
    });

    // Unrealistic benefit claims (red flag detection)
    const unrealisticClaims = [
      "guaranteed profit",
      "risk-free",
      "100% success",
      "no downside",
      "unlimited potential",
      "revolutionary breakthrough"
    ];
    const unrealisticHit = unrealisticClaims.some((p) => lower.includes(p));
    checks.push({
      name: "unrealistic_claims_detected",
      passed: !unrealisticHit,
      note: unrealisticHit ? "Detected unrealistic or overly optimistic claims" : undefined,
    });

    // Charter loaded sanity — use config charter or read from file
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

  // ── V0.2 DECISION LOGIC ───────────────────────────────────────────────────

  private readonly DEFAULT_DOMINANCE_DELTA = 0.08; // tune by category if desired

  private decideWithAlternatives(
    originalGoals: Goals,
    alts: Alternative[],
    missing: MissingData[],
  ): { decision: Decision, reasons: string[], bestAlt?: Alternative } {

    // Blocking data forces 'block' (maps to legacy status 'draft' → no vote)
    const hasBlocking = missing.some(m => m.blocking);
    const best = alts.slice().sort((a,b)=> b.scores.composite - a.scores.composite)[0];

    if (hasBlocking) {
      return {
        decision: "block",
        reasons: ["Blocking missing data (feasibility/legal) — supply before voting."],
        bestAlt: best
      };
    }

    if (!best || best.scores.composite <= originalGoals.composite) {
      return { decision: "advance", reasons: ["No superior alternative over charter goals."] };
    }

    const diff = Number((best.scores.composite - originalGoals.composite).toFixed(3));
    if (diff >= this.DEFAULT_DOMINANCE_DELTA) {
      return { decision: "block", reasons: [`Dominated by '${best.label}' (+${diff} composite).`], bestAlt: best };
    }
    return { decision: "revise", reasons: [`Improvement available: '${best.label}' (+${diff}).`], bestAlt: best };
  }

  // Map decision → legacy status
  private statusFromDecision(d: Decision): z.infer<typeof ProposalStatusZ> {
    return d === "advance" ? "votable" : (d === "revise" ? "votable" : "draft");
  }

  // ── Utilities ─────────────────────────────────────────────────────────

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
}

export const proposalEngine = new ProposalEngine();
