import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CoopConfigData } from "../proposal-engine.js";

// Mock @openai/agents to avoid real API calls
vi.mock("@openai/agents", () => {
  class MockAgent {
    constructor(opts: any) {
      // no-op
    }
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
        impact: { leakageReductionUSD: 10000, jobsCreated: 3, timeHorizonMonths: 12 },
        alignment: 0.7,
        feasibility: 0.6,
        quorumPercent: 20,
        approvalThresholdPercent: 60,
        votingWindowDays: 7,
        alternatives: [
          {
            label: "Lower Budget Option",
            changes: [{ field: "budget.amountRequested", from: 50000, to: 30000 }],
            scores: {
              LeakageReduction: 0.6,
              MemberBenefit: 0.5,
              EquityGrowth: 0.4,
              LocalJobs: 0.5,
              CommunityVitality: 0.5,
              Resilience: 0.4,
              composite: 0.5,
            },
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
        status: "submitted",
      },
    }),
    webSearchTool: vi.fn().mockReturnValue({}),
  };
});

describe("ProposalEngine with CoopConfig", () => {
  let ProposalEngine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import after mocks are set
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
    goalDefinitions: [
      { key: "LeakageReduction", label: "Leakage Reduction", weight: 0.30 },
      { key: "MemberBenefit", label: "Member Benefit", weight: 0.20 },
      { key: "EquityGrowth", label: "Equity Growth", weight: 0.10 },
      { key: "LocalJobs", label: "Local Jobs", weight: 0.20 },
      { key: "CommunityVitality", label: "Community Vitality", weight: 0.10 },
      { key: "Resilience", label: "Resilience", weight: 0.10 },
    ],
    scoringWeights: {
      selfReliance: 0.20,
      communityJobs: 0.25,
      assetRetention: 0.20,
      transparency: 0.15,
      culturalValue: 0.20,
    },
    proposalCategories: [
      { key: "business_funding", label: "Business Funding", isActive: true },
      { key: "infrastructure", label: "Infrastructure", isActive: true },
      { key: "other", label: "Other", isActive: true },
    ],
    sectorExclusions: ["gambling", "tobacco"],
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
          impact: { leakageReductionUSD: 500, jobsCreated: 1, timeHorizonMonths: 6 },
          alignment: 0.5,
          feasibility: 0.5,
          status: "submitted",
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
          impact: { leakageReductionUSD: 500, jobsCreated: 1, timeHorizonMonths: 6 },
          alignment: 0.5,
          feasibility: 0.5,
          status: "submitted",
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
          impact: { leakageReductionUSD: 500, jobsCreated: 1, timeHorizonMonths: 6 },
          alignment: 0.5,
          feasibility: 0.5,
          status: "submitted",
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
          impact: { leakageReductionUSD: 500, jobsCreated: 1, timeHorizonMonths: 6 },
          alignment: 0.5,
          feasibility: 0.5,
          status: "submitted",
        },
      });

      const engine = new ProposalEngine();
      const result = await engine.processProposal(createInput());
      expect(result.budget.currency).toBe("UC");
    });
  });

  it("processProposal without config still works (backward compat)", async () => {
    const engine = new ProposalEngine();
    const result = await engine.processProposal(createInput());

    expect(result.id).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.scores.alignment).toBeGreaterThanOrEqual(0);
    expect(result.scores.feasibility).toBeGreaterThanOrEqual(0);
  });

  it("processProposal with config produces valid output", async () => {
    const engine = new ProposalEngine();
    const result = await engine.processProposal(createInput(), createConfig());

    expect(result.id).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.goalScores).toBeDefined();
    expect(result.decision).toBeDefined();
  });

  it("estimateGoals uses config weights when provided", () => {
    const engine = new ProposalEngine();
    const config = createConfig();

    // Access private method via any
    const goals = (engine).estimateGoals(
      { budget: { amountRequested: 50000 }, category: "business_funding" },
      config,
    );

    expect(goals.composite).toBeGreaterThanOrEqual(0);
    expect(goals.composite).toBeLessThanOrEqual(1);
    expect(goals.LeakageReduction).toBeDefined();
    expect(goals.MemberBenefit).toBeDefined();
  });

  it("estimateGoals uses default weights when config absent", () => {
    const engine = new ProposalEngine();

    const goals = (engine).estimateGoals(
      { budget: { amountRequested: 50000 }, category: "business_funding" },
    );

    expect(goals.composite).toBeGreaterThanOrEqual(0);
    expect(goals.composite).toBeLessThanOrEqual(1);
  });

  it("compliance checks use config sector exclusions", async () => {
    const engine = new ProposalEngine();
    const config = createConfig();
    config.sectorExclusions = ["gambling", "tobacco"];

    const checks = await (engine).runComplianceChecks(
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

    const checks = await (engine).runComplianceChecks(
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

    const checks = await (engine).runComplianceChecks(
      { text: "Test proposal text for community project" },
      { title: "Test", summary: "test" },
      config,
    );

    const charterCheck = checks.find((c: any) => c.name === "charter_loaded");
    expect(charterCheck?.passed).toBe(true);
  });
});
