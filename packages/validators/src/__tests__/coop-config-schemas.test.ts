import { describe, it, expect } from "vitest";
import {
  GoalDefinitionZ,
  ProposalCategoryConfigZ,
  ScoringWeightsZ,
  CoopConfigInputZ,
  CommentInputZ,
  CommentOutputZ,
  CommentAIEvaluationZ,
} from "../proposal.js";

describe("GoalDefinitionZ", () => {
  it("accepts valid goal definition", () => {
    const result = GoalDefinitionZ.safeParse({
      key: "LeakageReduction",
      label: "Leakage Reduction",
      weight: 0.25,
      description: "Reduce external economic leakage",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without description", () => {
    const result = GoalDefinitionZ.safeParse({
      key: "LocalJobs",
      label: "Local Jobs",
      weight: 0.15,
    });
    expect(result.success).toBe(true);
  });

  it("rejects weight > 1", () => {
    const result = GoalDefinitionZ.safeParse({
      key: "test",
      label: "Test",
      weight: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight < 0", () => {
    const result = GoalDefinitionZ.safeParse({
      key: "test",
      label: "Test",
      weight: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty key", () => {
    const result = GoalDefinitionZ.safeParse({
      key: "",
      label: "Test",
      weight: 0.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("ScoringWeightsZ", () => {
  it("accepts valid scoring weights", () => {
    const result = ScoringWeightsZ.safeParse({
      selfReliance: 0.25,
      communityJobs: 0.20,
      assetRetention: 0.20,
      transparency: 0.15,
      culturalValue: 0.20,
    });
    expect(result.success).toBe(true);
  });

  it("rejects weight > 1", () => {
    const result = ScoringWeightsZ.safeParse({
      selfReliance: 1.5,
      communityJobs: 0.20,
      assetRetention: 0.20,
      transparency: 0.15,
      culturalValue: 0.20,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = ScoringWeightsZ.safeParse({
      selfReliance: 0.25,
    });
    expect(result.success).toBe(false);
  });
});

describe("CoopConfigInputZ", () => {
  it("accepts valid config update input", () => {
    const result = CoopConfigInputZ.safeParse({
      coopId: "soulaan",
      quorumPercent: 20,
      reason: "Adjusting quorum",
    });
    expect(result.success).toBe(true);
  });

  it("requires coopId", () => {
    const result = CoopConfigInputZ.safeParse({
      reason: "test",
    });
    expect(result.success).toBe(false);
  });

  it("requires reason", () => {
    const result = CoopConfigInputZ.safeParse({
      coopId: "soulaan",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short reason", () => {
    const result = CoopConfigInputZ.safeParse({
      coopId: "soulaan",
      reason: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("accepts full config update", () => {
    const result = CoopConfigInputZ.safeParse({
      coopId: "soulaan",
      charterText: "Updated charter text with at least 10 chars",
      goalDefinitions: [
        { key: "LeakageReduction", label: "LR", weight: 0.3 },
      ],
      quorumPercent: 25,
      approvalThresholdPercent: 60,
      votingWindowDays: 14,
      sectorExclusions: ["fashion"],
      minScBalanceToSubmit: 10,
      scoringWeights: {
        selfReliance: 0.2,
        communityJobs: 0.2,
        assetRetention: 0.2,
        transparency: 0.2,
        culturalValue: 0.2,
      },
      reason: "Full config update for testing",
    });
    expect(result.success).toBe(true);
  });
});

describe("CommentInputZ", () => {
  it("accepts valid comment", () => {
    const result = CommentInputZ.safeParse({
      proposalId: "prop_abc123",
      content: "This is a valid comment",
    });
    expect(result.success).toBe(true);
  });

  it("rejects too short content", () => {
    const result = CommentInputZ.safeParse({
      proposalId: "prop_abc123",
      content: "Hi",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty proposalId", () => {
    const result = CommentInputZ.safeParse({
      proposalId: "",
      content: "Valid comment text here",
    });
    expect(result.success).toBe(false);
  });
});

describe("CommentAIEvaluationZ", () => {
  it("accepts valid evaluation", () => {
    const result = CommentAIEvaluationZ.safeParse({
      alignment: "ALIGNED",
      score: 0.85,
      analysis: "This comment supports the charter goals.",
      goalsImpacted: ["LeakageReduction", "LocalJobs"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid alignment", () => {
    const result = CommentAIEvaluationZ.safeParse({
      alignment: "INVALID",
      score: 0.5,
      analysis: "Test analysis",
      goalsImpacted: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects score > 1", () => {
    const result = CommentAIEvaluationZ.safeParse({
      alignment: "ALIGNED",
      score: 1.5,
      analysis: "Test analysis",
      goalsImpacted: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("CommentOutputZ", () => {
  it("accepts full comment output", () => {
    const result = CommentOutputZ.safeParse({
      id: "comment_123",
      proposalId: "prop_abc",
      authorWallet: "0x1234567890abcdef1234567890abcdef12345678",
      authorName: "Test User",
      content: "This is my comment",
      createdAt: "2026-01-01T00:00:00.000Z",
      aiEvaluation: {
        alignment: "NEUTRAL",
        score: 0.5,
        analysis: "Neutral comment",
        goalsImpacted: [],
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts comment without AI evaluation", () => {
    const result = CommentOutputZ.safeParse({
      id: "comment_123",
      proposalId: "prop_abc",
      authorWallet: "0x1234",
      content: "Simple comment",
      createdAt: "2026-01-01T00:00:00.000Z",
      aiEvaluation: null,
    });
    expect(result.success).toBe(true);
  });
});
