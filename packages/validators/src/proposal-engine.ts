import { Agent, run, webSearchTool } from "@openai/agents";
import { z } from "zod";
import type { ProposalInputV0, ProposalOutputV0 } from "./proposal.js";
import {
  ProposalInputV0Z,
  ProposalOutputV0Z,
  buildOutputV0,
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

  async processProposal(input: ProposalInputV0): Promise<ProposalOutputV0> {
    const validated = ProposalInputV0Z.parse(input);

    // Use mock mode in tests when no API key is available
    const useMocks = !process.env.OPENAI_API_KEY || process.env.NODE_ENV === "test";

    const [scores, governance, kpis, checks] = await Promise.all([
      useMocks ? this.mockImpactAgent(validated) : this.runImpactAgent(validated),
      useMocks ? this.mockGovernanceAgent(validated) : this.runGovernanceAgent(validated),
      useMocks ? this.mockKPIAgent(validated) : this.runKPIAgent(validated),
      this.runComplianceChecks(validated),
    ]);

    const status = useMocks ? this.mockDecisionAgent(validated, scores, checks) : await this.runDecisionAgent(validated, scores, checks);

    const output = buildOutputV0({
      id: this.generateProposalId(),
      createdAt: new Date().toISOString(),
      status,
      input: {
        ...validated,
        kpis: kpis.length
          ? kpis
          : Array.isArray(validated.kpis)
            ? validated.kpis.slice(0, 3)
            : undefined,
      },
      scores,
      governance,
      engineVersion: this.version,
      checks: [
        { name: "basic_validation", passed: true },
        ...checks,
      ],
    });
    return ProposalOutputV0Z.parse(output);
  }

  // ── Agents ────────────────────────────────────────────────────────────

  async runDecisionAgent(
    input: ProposalInputV0,
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
        `Category: ${input.category}`,
        `Budget: ${input.budget.currency} ${input.budget.amountRequested}`,
        `Summary: ${input.summary}`,
      ].join("\n"),
    );

    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};
    return out.status ?? "draft";
  }

  private async runImpactAgent(input: ProposalInputV0): Promise<{
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
        `Category: ${input.category}`,
        `Budget: ${input.budget.currency} ${input.budget.amountRequested}`,
        `Region: ${input.region.code} - ${input.region.name}`,
        `Title: ${input.title}`,
        `Summary: ${input.summary}`,
      ].join("\n"),
    );

    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};
    const alignment = this.clamp01(out.alignment);
    const feasibility = this.clamp01(out.feasibility);
    const composite = this.clamp01((alignment + feasibility) / 2);
    return { alignment, feasibility, composite };
  }

  private async runGovernanceAgent(input: ProposalInputV0): Promise<{
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
        `Budget: ${input.budget.currency} ${input.budget.amountRequested}`,
        `Category: ${input.category}`,
      ].join("\n"),
    );
    const out: any = (result as any).finalOutput ?? (result as any).output ?? {};
    return {
      quorumPercent: this.boundPercent(out.quorumPercent ?? 20),
      approvalThresholdPercent: this.boundPercent(out.approvalThresholdPercent ?? 60),
      votingWindowDays: Math.max(1, Math.min(30, Math.trunc(out.votingWindowDays ?? 7))),
    };
  }

  private async runKPIAgent(input: ProposalInputV0): Promise<
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
        `Title: ${input.title}`,
        `Summary: ${input.summary}`,
        `Category: ${input.category}`,
        `Budget: ${input.budget.currency} ${input.budget.amountRequested}`,
        `Region: ${input.region.code}`,
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
    input: ProposalInputV0,
  ): Promise<{ name: string; passed: boolean; note?: string }[]> {
    const checks: { name: string; passed: boolean; note?: string }[] = [];

    // Treasury allocation must sum to 100 (Zod enforces; record status)
    const sum = Math.round(
      (input.treasuryPlan.localPercent + input.treasuryPlan.nationalPercent) * 100,
    ) / 100;
    checks.push({
      name: "treasury_allocation_sum",
      passed: sum === 100,
      note: sum === 100 ? undefined : `local+national=${sum} must equal 100`,
    });

    // Sector exclusions (heuristic)
    const excludedKeywords = ["fashion", "restaurant", "cafe", "food truck"];
    const lower = `${input.title} ${input.summary}`.toLowerCase();
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

  // ── Mock methods for testing (no API calls) ──────────────────────────

  private mockImpactAgent(input: ProposalInputV0) {
    const budget = input.budget.amountRequested;
    const catBonus =
      input.category === "infrastructure" || input.category === "procurement" ? 0.05 : 0;
    const alignment = this.clamp01(0.65 + catBonus);
    const feasibility = this.clamp01(budget <= 100_000 ? 0.8 : budget <= 1_000_000 ? 0.7 : 0.6);
    const composite = this.clamp01((alignment + feasibility) / 2);
    return { alignment, feasibility, composite };
  }

  private mockGovernanceAgent(input: ProposalInputV0) {
    const budget = input.budget.amountRequested;
    const quorumPercent = budget > 1_000_000 ? 25 : 20;
    const approvalThresholdPercent = budget > 1_000_000 ? 65 : 60;
    const votingWindowDays = 7;
    return { quorumPercent, approvalThresholdPercent, votingWindowDays };
  }

  private mockKPIAgent(_input: ProposalInputV0) {
    return [
      { name: "export_revenue", target: 100_000, unit: "USD" as const },
      { name: "jobs_created", target: 5, unit: "jobs" as const },
    ];
  }

  private mockDecisionAgent(
    _input: ProposalInputV0,
    _scores: { alignment: number; feasibility: number; composite: number },
    checks: { name: string; passed: boolean; note?: string }[],
  ): z.infer<typeof ProposalStatusZ> {
    const failing = checks.some((c) => c.passed === false);
    return failing ? "rejected" : "draft";
  }
}



export const proposalEngine = new ProposalEngine();