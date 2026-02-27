import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CoopConfigData } from "../proposal-engine.js";

// Mock @openai/agents to avoid real API calls
vi.mock("@openai/agents", () => {
  class MockAgent {
    constructor(_opts: any) {}
  }
  return {
    Agent: MockAgent,
    run: vi.fn().mockResolvedValue({
      finalOutput: {
        title: "Test Proposal",
        summary: "A test proposal for community garden project with local food production",
        proposer: { wallet: "0xtest", role: "member", displayName: "Test" },
        region: { code: "US", name: "United States" },
        category: "business_funding",
        budget: { currency: "USD", amountRequested: 50000 },
        treasuryPlan: { localPercent: 70, nationalPercent: 30, acceptUC: true },
        // Evaluation agent fields
        structural_scores: {
          goal_mapping_valid: true,
          feasibility_score: 0.7,
          risk_score: 0.3,
          accountability_score: 0.6,
        },
        mission_impact_scores: [
          { goal_id: "income_stability",  impact_score: 0.7 },
          { goal_id: "asset_creation",    impact_score: 0.6 },
          { goal_id: "leakage_reduction", impact_score: 0.8 },
          { goal_id: "export_expansion",  impact_score: 0.5 },
        ],
        violations: [],
        risk_flags: ["Limited market research provided"],
        llm_summary: "Solid community garden proposal with reasonable financials.",
        quorumPercent: 20,
        approvalThresholdPercent: 60,
        votingWindowDays: 7,
        alternatives: [
          {
            label: "Lower Budget Option",
            changes: [{ field: "budget.amountRequested", from: 50000, to: 30000 }],
            rationale: "Reducing budget improves feasibility while maintaining community benefit",
          },
        ],
        missing_data: [
          {
            field: "zoning",
            question: "Is the proposed location zoned for commercial use?",
            why_needed: "Required for building permits",
            blocking: true,
          },
        ],
      },
    }),
    webSearchTool: vi.fn().mockReturnValue({}),
  };
});

describe("ProposalEngine with CoopConfig", () => {
  let ProposalEngine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../proposal-engine.js");
    ProposalEngine = mod.ProposalEngine;
  });

  const createInput = () => ({
    text: "Build a community garden for $50,000 to grow local food and create 3 jobs in Hampton Roads.",
    proposer: { wallet: "0xtest", role: "member" as const, displayName: "Test" },
    region: { code: "US", name: "United States" },
  });

  const createConfig = (): CoopConfigData => ({
    charterText: "Soulaan Co-op charter text for testing purposes with enough content to pass validation",
    missionGoals: [
      { key: "income_stability",  label: "Income Stability",  priorityWeight: 0.35 },
      { key: "asset_creation",    label: "Asset Creation",    priorityWeight: 0.25 },
      { key: "leakage_reduction", label: "Leakage Reduction", priorityWeight: 0.20 },
      { key: "export_expansion",  label: "Export Expansion",  priorityWeight: 0.20 },
    ],
    structuralWeights: { feasibility: 0.40, risk: 0.35, accountability: 0.25 },
    scoreMix: { missionWeight: 0.60, structuralWeight: 0.40 },
    screeningPassThreshold: 0.6,
    proposalCategories: [
      { key: "business_funding", label: "Business Funding", isActive: true },
      { key: "infrastructure",   label: "Infrastructure",   isActive: true },
      { key: "other",            label: "Other",            isActive: true },
    ],
    sectorExclusions: [{ value: "gambling" }, { value: "tobacco" }],
    quorumPercent: 25,
    approvalThresholdPercent: 55,
    votingWindowDays: 10,
  });

  describe("currency normalization", () => {
    it("normalizes lowercase 'uc' to 'UC'", async () => {
      const { run } = await import("@openai/agents");
      (run as any).mockResolvedValueOnce({
        finalOutput: {
          title: "Test",
          summary: "Test",
          proposer: { wallet: "0x1", role: "member", displayName: "T" },
          region: { code: "US", name: "US" },
          category: "business_funding",
          budget: { currency: "uc", amountRequested: 1000 },
          treasuryPlan: { localPercent: 70, nationalPercent: 30, acceptUC: true },
        },
      });

      const engine = new ProposalEngine();
      const result = await engine.processProposal(createInput());
      expect(result.budget.currency).toBe("UC");
    });

    it("normalizes lowercase 'usd' to 'USD'", async () => {
      const { run } = await import("@openai/agents");
      (run as any).mockResolvedValueOnce({
        finalOutput: {
          title: "Test",
          summary: "Test",
          proposer: { wallet: "0x1", role: "member", displayName: "T" },
          region: { code: "US", name: "US" },
          category: "business_funding",
          budget: { currency: "usd", amountRequested: 5000 },
          treasuryPlan: { localPercent: 70, nationalPercent: 30, acceptUC: true },
        },
      });

      const engine = new ProposalEngine();
      const result = await engine.processProposal(createInput());
      expect(result.budget.currency).toBe("USD");
    });

    it("normalizes 'Mixed' to 'mixed'", async () => {
      const { run } = await import("@openai/agents");
      (run as any).mockResolvedValueOnce({
        finalOutput: {
          title: "Test",
          summary: "Test",
          proposer: { wallet: "0x1", role: "member", displayName: "T" },
          region: { code: "US", name: "US" },
          category: "business_funding",
          budget: { currency: "Mixed", amountRequested: 5000 },
          treasuryPlan: { localPercent: 70, nationalPercent: 30, acceptUC: true },
        },
      });

      const engine = new ProposalEngine();
      const result = await engine.processProposal(createInput());
      expect(result.budget.currency).toBe("mixed");
    });

    it("preserves correctly cased 'UC'", async () => {
      const { run } = await import("@openai/agents");
      (run as any).mockResolvedValueOnce({
        finalOutput: {
          title: "Test",
          summary: "Test",
          proposer: { wallet: "0x1", role: "member", displayName: "T" },
          region: { code: "US", name: "US" },
          category: "business_funding",
          budget: { currency: "UC", amountRequested: 5000 },
          treasuryPlan: { localPercent: 70, nationalPercent: 30, acceptUC: true },
        },
      });

      const engine = new ProposalEngine();
      const result = await engine.processProposal(createInput());
      expect(result.budget.currency).toBe("UC");
    });
  });

  it("processProposal without config still works", async () => {
    const engine = new ProposalEngine();
    const result = await engine.processProposal(createInput());

    expect(result.id).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.evaluation).toBeDefined();
    expect(result.evaluation.computed_scores.overall_score).toBeGreaterThanOrEqual(0);
  });

  it("processProposal with config produces valid evaluation output", async () => {
    const engine = new ProposalEngine();
    const result = await engine.processProposal(createInput(), createConfig());

    expect(result.id).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.evaluation).toBeDefined();
    expect(result.evaluation.structural_scores).toBeDefined();
    expect(result.evaluation.mission_impact_scores.length).toBeGreaterThan(0);
    expect(result.evaluation.computed_scores.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.evaluation.computed_scores.overall_score).toBeLessThanOrEqual(1);
    expect(result.decision).toBeDefined();
  });

  it("computeEvaluation calculates correct weighted totals", () => {
    const engine = new ProposalEngine();
    const config = createConfig();

    const rawEval = {
      structural_scores: {
        goal_mapping_valid: true,
        feasibility_score: 0.8,
        risk_score: 0.2,
        accountability_score: 0.7,
      },
      mission_impact_scores: [
        { goal_id: "income_stability",  impact_score: 0.8 },
        { goal_id: "asset_creation",    impact_score: 0.7 },
        { goal_id: "leakage_reduction", impact_score: 0.9 },
        { goal_id: "export_expansion",  impact_score: 0.6 },
      ],
      violations: [],
      risk_flags: [],
      llm_summary: "Test",
    };

    const evaluation = engine.computeEvaluation(rawEval, config);

    // Mission: 0.8*0.35 + 0.7*0.25 + 0.9*0.20 + 0.6*0.20 = 0.28+0.175+0.18+0.12 = 0.755
    expect(evaluation.computed_scores.mission_weighted_score).toBeCloseTo(0.755, 2);

    // Structural: 0.8*0.40 + (1-0.2)*0.35 + 0.7*0.25 = 0.32+0.28+0.175 = 0.775
    expect(evaluation.computed_scores.structural_weighted_score).toBeCloseTo(0.775, 2);

    // Overall: 0.755*0.60 + 0.775*0.40 = 0.453+0.31 = 0.763
    expect(evaluation.computed_scores.overall_score).toBeCloseTo(0.763, 2);

    expect(evaluation.computed_scores.passes_threshold).toBe(true);
  });

  it("compliance checks use config sector exclusions", async () => {
    const engine = new ProposalEngine();
    const config = createConfig();
    config.sectorExclusions = [{ value: "gambling" }, { value: "tobacco" }];

    const checks = await (engine as any).runComplianceChecks(
      { text: "This is about a gambling business", proposer: null, region: null },
      { title: "Gambling Proposal", summary: "..." },
      config,
    );

    const sectorCheck = checks.find((c: any) => c.name === "sector_exclusion_screen");
    expect(sectorCheck).toBeDefined();
    expect(sectorCheck?.passed).toBe(false);
  });

  it("compliance checks pass with non-excluded sectors", async () => {
    const engine = new ProposalEngine();
    const config = createConfig();

    const checks = await (engine as any).runComplianceChecks(
      { text: "Community solar panel installation project" },
      { title: "Solar Panels", summary: "Green energy project" },
      config,
    );

    const sectorCheck = checks.find((c: any) => c.name === "sector_exclusion_screen");
    expect(sectorCheck?.passed).toBe(true);
  });

  it("charter_loaded check uses config charterText", async () => {
    const engine = new ProposalEngine();
    const config = createConfig();

    const checks = await (engine as any).runComplianceChecks(
      { text: "Test proposal text for community project" },
      { title: "Test", summary: "test" },
      config,
    );

    const charterCheck = checks.find((c: any) => c.name === "charter_loaded");
    expect(charterCheck?.passed).toBe(true);
  });
});
