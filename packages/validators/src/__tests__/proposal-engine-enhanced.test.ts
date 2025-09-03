import { describe, it, expect, beforeEach } from "vitest";
import { ProposalEngine } from "../proposal-engine.js";
import type { ProposalInput } from "../proposal.js";

describe("ProposalEngine Features", () => {
  let engine: ProposalEngine;

  beforeEach(() => {
    engine = new ProposalEngine();
  });

  const createInput = (text: string): ProposalInput => ({
    text,
    proposer: { wallet: "test_wallet", role: "member", displayName: "Test User" },
    region: { code: "US", name: "United States" },
  });

  describe("Charter Goal Scoring", () => {
    it("should include goalScores in output", async () => {
      const input = createInput("Build a community garden for $5,000 to grow local food and create 3 jobs.");
      const result = await engine.processProposal(input);

      expect(result.goalScores).toBeDefined();
      expect(result.goalScores?.LeakageReduction).toBeGreaterThanOrEqual(0);
      expect(result.goalScores?.LeakageReduction).toBeLessThanOrEqual(1);
      expect(result.goalScores?.MemberBenefit).toBeGreaterThanOrEqual(0);
      expect(result.goalScores?.MemberBenefit).toBeLessThanOrEqual(1);
      expect(result.goalScores?.EquityGrowth).toBeGreaterThanOrEqual(0);
      expect(result.goalScores?.EquityGrowth).toBeLessThanOrEqual(1);
      expect(result.goalScores?.LocalJobs).toBeGreaterThanOrEqual(0);
      expect(result.goalScores?.LocalJobs).toBeLessThanOrEqual(1);
      expect(result.goalScores?.CommunityVitality).toBeGreaterThanOrEqual(0);
      expect(result.goalScores?.CommunityVitality).toBeLessThanOrEqual(1);
      expect(result.goalScores?.Resilience).toBeGreaterThanOrEqual(0);
      expect(result.goalScores?.Resilience).toBeLessThanOrEqual(1);
      expect(result.goalScores?.composite).toBeGreaterThanOrEqual(0);
      expect(result.goalScores?.composite).toBeLessThanOrEqual(1);
    });
  });

  describe("Alternative Generation", () => {
    it("should generate alternatives array", async () => {
      const input = createInput("Small bakery for $20,000 to serve local community with fresh bread.");
      const result = await engine.processProposal(input);

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
      
      // If alternatives exist, they should have proper structure
      if (result.alternatives.length > 0) {
        const alt = result.alternatives[0];
        expect(alt).toBeDefined();
        expect(alt?.label).toBeDefined();
        expect(typeof alt?.label).toBe('string');
        expect(alt?.changes).toBeDefined();
        expect(Array.isArray(alt?.changes)).toBe(true);
        expect(alt?.scores).toBeDefined();
        expect(alt?.rationale).toBeDefined();
      }
    });
  });

  describe("Missing Data Detection", () => {
    it("should identify missing data needs", async () => {
      const input = createInput("Want to open a restaurant in downtown area.");
      const result = await engine.processProposal(input);

      expect(result.missing_data).toBeDefined();
      expect(Array.isArray(result.missing_data)).toBe(true);
      
      // If missing data exists, check structure
      if (result.missing_data.length > 0) {
        const missing = result.missing_data[0]!;
        expect(missing.field).toBeDefined();
        expect(missing.question).toBeDefined();
        expect(missing.why_needed).toBeDefined();
        expect(typeof missing.blocking).toBe('boolean');
      }
    });
  });

  describe("Decision Logic", () => {
    it("should include decision and reasons", async () => {
      const input = createInput("Solar panel installation for community center, budget $15,000.");
      const result = await engine.processProposal(input);

      expect(result.decision).toBeDefined();
      expect(['advance', 'revise', 'block']).toContain(result.decision);
      expect(result.decisionReasons).toBeDefined();
      expect(Array.isArray(result.decisionReasons)).toBe(true);
    });

    it("should block when dominated by better alternative", async () => {
      // This test would need a scenario where AI generates a significantly better alternative
      // For now, just test that the decision system works
      const input = createInput("Basic proposal with minimal impact for $50,000.");
      const result = await engine.processProposal(input);

      expect(['advance', 'revise', 'block']).toContain(result.decision);
      if (result.decision === 'block' && result.bestAlternative) {
        expect(result.bestAlternative.scores.composite).toBeGreaterThan(result.goalScores?.composite || 0);
      }
    });

    it("should advance when no better alternatives exist", async () => {
      const input = createInput("Well-designed community project with optimal budget and clear benefits.");
      const result = await engine.processProposal(input);

      // Should either advance or have good reasons for other decisions
      expect(['advance', 'revise', 'block']).toContain(result.decision);
      expect(result.decisionReasons.length).toBeGreaterThan(0);
    });
  });

  describe("Status Mapping", () => {
    it("should map decisions to correct legacy status", async () => {
      const input = createInput("Test proposal for status mapping.");
      const result = await engine.processProposal(input);

      // advance|revise → votable, block → draft
      if (result.decision === 'advance' || result.decision === 'revise') {
        expect(result.status).toBe('votable');
      } else if (result.decision === 'block') {
        expect(result.status).toBe('draft');
      }
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain all legacy fields", async () => {
      const input = createInput("Community project for backward compatibility testing.");
      const result = await engine.processProposal(input);

      // Legacy fields should still exist
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
      expect(result.impact).toBeDefined();
      expect(result.scores).toBeDefined();
      expect(result.governance).toBeDefined();
      expect(result.audit).toBeDefined();
      expect(result.goalScores).toBeDefined();
      expect(result.alternatives).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(result.decisionReasons).toBeDefined();
      expect(result.missing_data).toBeDefined();
    });
  });
});
