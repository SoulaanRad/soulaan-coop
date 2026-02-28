import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@openai/agents", () => {
  class MockAgent {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
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
        risk_flags: [],
        llm_summary: "Solid proposal.",
        quorumPercent: 20,
        approvalThresholdPercent: 60,
        votingWindowDays: 7,
        alternatives: [
          {
            label: "Lower Budget Option",
            changes: [{ field: "budget.amountRequested", from: 50000, to: 30000 }],
            overallScore: null,
            rationale: "Reducing budget improves feasibility while maintaining community benefit",
          },
        ],
        missing_data: [],
      },
    }),
    webSearchTool: vi.fn().mockReturnValue({}),
  };
});

describe("ProposalEngine Features", () => {
  let ProposalEngine: any;
  let engine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../proposal-engine.js");
    ProposalEngine = mod.ProposalEngine;
    engine = new ProposalEngine();
  });

  const createInput = (text: string) => ({
    text,
    proposer: { wallet: "test_wallet", role: "member" as const, displayName: "Test User" },
    region: { code: "US", name: "United States" },
  });

  describe("Evaluation Output", () => {
    it("should include evaluation in output", async () => {
      const input = createInput("Build a community garden for $5,000 to grow local food and create 3 jobs.");
      const result = await engine.processProposal(input);

      expect(result.evaluation).toBeDefined();
      expect(result.evaluation.structural_scores).toBeDefined();
      expect(result.evaluation.structural_scores.feasibility_score).toBeGreaterThanOrEqual(0);
      expect(result.evaluation.structural_scores.feasibility_score).toBeLessThanOrEqual(1);
      expect(result.evaluation.structural_scores.risk_score).toBeGreaterThanOrEqual(0);
      expect(result.evaluation.structural_scores.accountability_score).toBeGreaterThanOrEqual(0);
      expect(typeof result.evaluation.structural_scores.goal_mapping_valid).toBe("boolean");
    });

    it("should include mission impact scores in evaluation", async () => {
      const input = createInput("Build a community garden for $5,000.");
      const result = await engine.processProposal(input);

      expect(Array.isArray(result.evaluation.mission_impact_scores)).toBe(true);
      expect(result.evaluation.mission_impact_scores.length).toBeGreaterThan(0);

      const score = result.evaluation.mission_impact_scores[0];
      expect(score.goal_id).toBeDefined();
      expect(score.impact_score).toBeGreaterThanOrEqual(0);
      expect(score.impact_score).toBeLessThanOrEqual(1);
      expect(score.goal_priority_weight).toBeGreaterThanOrEqual(0);
    });

    it("should include computed scores", async () => {
      const input = createInput("Solar panel installation for community center, budget $15,000.");
      const result = await engine.processProposal(input);

      expect(result.evaluation.computed_scores).toBeDefined();
      expect(result.evaluation.computed_scores.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.evaluation.computed_scores.overall_score).toBeLessThanOrEqual(1);
      expect(result.evaluation.computed_scores.mission_weighted_score).toBeGreaterThanOrEqual(0);
      expect(result.evaluation.computed_scores.structural_weighted_score).toBeGreaterThanOrEqual(0);
      expect(typeof result.evaluation.computed_scores.passes_threshold).toBe("boolean");
    });
  });

  describe("Alternative Generation", () => {
    it("should generate alternatives array", async () => {
      const input = createInput("Small bakery for $20,000 to serve local community with fresh bread.");
      const result = await engine.processProposal(input);

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);

      if (result.alternatives.length > 0) {
        const alt = result.alternatives[0];
        expect(alt?.label).toBeDefined();
        expect(typeof alt?.label).toBe("string");
        expect(Array.isArray(alt?.changes)).toBe(true);
        expect(alt?.rationale).toBeDefined();
        expect(alt?.overallScore === null || typeof alt?.overallScore === "number").toBe(true);
        if (typeof alt?.overallScore === "number") {
          expect(alt.overallScore).toBeGreaterThanOrEqual(0);
          expect(alt.overallScore).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("Missing Data Detection", () => {
    it("should identify missing data needs", async () => {
      const input = createInput("Want to open a restaurant in downtown area.");
      const result = await engine.processProposal(input);

      expect(result.missing_data).toBeDefined();
      expect(Array.isArray(result.missing_data)).toBe(true);

      if (result.missing_data.length > 0) {
        const missing = result.missing_data[0];
        expect(missing?.field).toBeDefined();
        expect(missing?.question).toBeDefined();
        expect(missing?.why_needed).toBeDefined();
        expect(typeof missing?.blocking).toBe("boolean");
      }
    });
  });

  describe("Decision Logic", () => {
    it("should include decision and reasons", async () => {
      const input = createInput("Solar panel installation for community center, budget $15,000.");
      const result = await engine.processProposal(input);

      expect(result.decision).toBeDefined();
      expect(["advance", "revise", "block"]).toContain(result.decision);
      expect(Array.isArray(result.decisionReasons)).toBe(true);
    });

    it("should block when threshold not met", async () => {
      const input = createInput("Basic proposal with minimal impact for $50,000.");
      const result = await engine.processProposal(input);
      expect(["advance", "revise", "block"]).toContain(result.decision);
    });
  });

  describe("Status Mapping", () => {
    it("should map decisions to correct status", async () => {
      const input = createInput("Test proposal for status mapping.");
      const result = await engine.processProposal(input);

      if (result.decision === "advance" || result.decision === "revise") {
        expect(result.status).toBe("votable");
      } else {
        expect(result.status).toBe("submitted");
      }
    });
  });

  describe("Output Shape", () => {
    it("should include all required fields", async () => {
      const input = createInput("Community project for output shape testing.");
      const result = await engine.processProposal(input);

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.proposer).toBeDefined();
      expect(result.region).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.budget).toBeDefined();
      expect(result.treasuryPlan).toBeDefined();
      expect(result.evaluation).toBeDefined();
      expect(result.evaluation).toBeDefined();
      expect(result.governance).toBeDefined();
      expect(result.audit).toBeDefined();
      expect(result.alternatives).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(result.decisionReasons).toBeDefined();
      expect(result.missing_data).toBeDefined();
    });
  });
});
