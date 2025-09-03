import { Agent, run, webSearchTool } from "@openai/agents";
import { z } from "zod";
import type { ProposalInput, ProposalOutput } from "./proposal.js";
import {
  ProposalInputZ,
  ProposalOutputZ,
  buildOutput,
  ProposalStatusZ,
} from "./proposal.js";
import type { KPIz } from "./proposal.js";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * ProposalEngine: Multi-agent orchestration using @openai/agents
 *
 * Agents (always-on):
 * - Impact Agent → scores {alignment, feasibility, composite}
 * - Governance Agent → governance params with guardrail re-validation
 * - KPI Agent → up to 3 KPIs (name, target, unit)
 * - Compliance checks → local rules + charter read
 */
export class ProposalEngine {
  private readonly version = "proposal-engine@agents-1.0.0";

  async processProposal(input: ProposalInput): Promise<ProposalOutput> {
    // Validate input
    const validated = ProposalInputZ.parse(input);

    // Extract all structured fields from the text input using AI agents
    const extractedFields = await this.runExtractionAgent(validated);

    const [scores, governance, _kpis, checks] = await Promise.all([
      this.runImpactAgent(validated, extractedFields),
      this.runGovernanceAgent(validated, extractedFields),
      this.runKPIAgent(validated, extractedFields),
      this.runComplianceChecks(validated, extractedFields),
    ]);

    const status = await this.runDecisionAgent(validated, extractedFields, scores, checks);

    const output = buildOutput({
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
    return ProposalOutputZ.parse(output);
  }

  // ── Agents ────────────────────────────────────────────────────────────

  async runExtractionAgent(input: ProposalInput): Promise<{
    title: string;
    summary: string;
    proposer: { wallet: string; role: "member" | "merchant" | "anchor" | "bot"; displayName: string };
    region: { code: string; name: string };
    category: "business_funding" | "procurement" | "infrastructure" | "transport" | "wallet_incentive" | "governance" | "other";
    budget: { currency: "UC" | "USD" | "mixed"; amountRequested: number };
    treasuryPlan: { localPercent: number; nationalPercent: number; acceptUC: true };
    impact: { leakageReductionUSD: number; jobsCreated: number; timeHorizonMonths: number };
  }> {
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

    const agent = new Agent({
      name: "Text Extraction Agent",
      instructions: [
        "Extract ALL structured information from raw proposal text.",
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
      budget: out.budget || { currency: "USD" as const, amountRequested: 10000 },
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

  private async runImpactAgent(input: ProposalInput, extractedFields: any): Promise<{
    alignment: number;
    feasibility: number;
    composite: number;
  }> {
    const ImpactSchema = z.object({
      alignment: z.number().min(0).max(1),
      feasibility: z.number().min(0).max(1),
    });

    const agent = new Agent({
      name: "Economic Impact Agent",
      instructions: [
        "Score alignment and feasibility (0..1) for Soulaan Co-op proposals.",
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

  private async runGovernanceAgent(input: ProposalInput, extractedFields: any): Promise<{
    quorumPercent: number;
    approvalThresholdPercent: number;
    votingWindowDays: number;
  }> {
    const GovernanceSchema = z.object({
      quorumPercent: z.number().min(0).max(100),
      approvalThresholdPercent: z.number().min(0).max(100),
      votingWindowDays: z.number().int().min(1).max(30),
    });

    const agent = new Agent({
      name: "Governance Policy Agent",
      instructions: [
        "Recommend governance parameters for Soulaan proposals.",
        "Defaults: quorum=20, approval=60, window=7. Adjust slightly by budget/category, but stay within bounds.",
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
      quorumPercent: this.boundPercent(out.quorumPercent ?? 20),
      approvalThresholdPercent: this.boundPercent(out.approvalThresholdPercent ?? 60),
      votingWindowDays: Math.max(1, Math.min(30, Math.trunc(out.votingWindowDays ?? 7))),
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

  private async runComplianceChecks(
    input: ProposalInput,
    extractedFields: any,
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

    // Sector exclusions (heuristic)
    const excludedKeywords = ["fashion", "restaurant", "cafe", "food truck"];
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

    // Charter loaded sanity (optional)
    try {
      const charter = await this.readCharter();
      checks.push({ name: "charter_loaded", passed: Boolean(charter && charter.length > 50) });
    } catch {
      checks.push({ name: "charter_loaded", passed: false, note: "read_error" });
    }

    return checks;
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