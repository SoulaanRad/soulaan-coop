import { describe, it, expect } from "vitest";
import {
  MissionGoalZ,
  StructuralWeightsZ,
  ScoreMixZ,
  ProposalCategoryConfigZ,
  CoopConfigInputZ,
  CommentInputZ,
  CommentOutputZ,
  CommentAIEvaluationZ,
} from "../proposal.js";

describe("MissionGoalZ", () => {
  it("accepts valid mission goal", () => {
    const result = MissionGoalZ.safeParse({
      key: "income_stability",
      label: "Income Stability",
      priorityWeight: 0.35,
      description: "Create reliable income for members",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without description", () => {
    const result = MissionGoalZ.safeParse({
      key: "leakage_reduction",
      label: "Leakage Reduction",
      priorityWeight: 0.20,
    });
    expect(result.success).toBe(true);
  });

  it("rejects priorityWeight > 1", () => {
    const result = MissionGoalZ.safeParse({
      key: "test",
      label: "Test",
      priorityWeight: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects priorityWeight < 0", () => {
    const result = MissionGoalZ.safeParse({
      key: "test",
      label: "Test",
      priorityWeight: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty key", () => {
    const result = MissionGoalZ.safeParse({
      key: "",
      label: "Test",
      priorityWeight: 0.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("StructuralWeightsZ", () => {
  it("accepts valid structural weights", () => {
    const result = StructuralWeightsZ.safeParse({
      feasibility: 0.40,
      risk: 0.35,
      accountability: 0.25,
    });
    expect(result.success).toBe(true);
  });

  it("rejects weight > 1", () => {
    const result = StructuralWeightsZ.safeParse({
      feasibility: 1.5,
      risk: 0.35,
      accountability: 0.25,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = StructuralWeightsZ.safeParse({
      feasibility: 0.40,
    });
    expect(result.success).toBe(false);
  });
});

describe("ScoreMixZ", () => {
  it("accepts valid score mix", () => {
    const result = ScoreMixZ.safeParse({
      missionWeight: 0.60,
      structuralWeight: 0.40,
    });
    expect(result.success).toBe(true);
  });

  it("rejects weight > 1", () => {
    const result = ScoreMixZ.safeParse({
      missionWeight: 1.5,
      structuralWeight: 0.40,
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

  it("accepts full config update with new fields", () => {
    const result = CoopConfigInputZ.safeParse({
      coopId: "soulaan",
      charterText: "Updated charter text with at least 10 chars",
      missionGoals: [
        { key: "income_stability", label: "Income Stability", priorityWeight: 0.35 },
        { key: "leakage_reduction", label: "Leakage Reduction", priorityWeight: 0.65 },
      ],
      structuralWeights: { feasibility: 0.40, risk: 0.35, accountability: 0.25 },
      scoreMix: { missionWeight: 0.60, structuralWeight: 0.40 },
      screeningPassThreshold: 0.65,
      quorumPercent: 25,
      approvalThresholdPercent: 60,
      votingWindowDays: 14,
      sectorExclusions: [{ value: "fashion" }],
      minScBalanceToSubmit: 10,
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

  it("rejects empty content", () => {
    const result = CommentInputZ.safeParse({
      proposalId: "prop_abc123",
      content: "",
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
      goalsImpacted: ["income_stability", "leakage_reduction"],
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
