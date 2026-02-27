import { describe, it, expect, vi, beforeEach } from "vitest";
import { proposalEngine } from "../proposal-engine.js";
import { ProposalInputZ } from "../proposal.js";
import type { ProposalInput } from "../proposal.js";

function makeInput(overrides: Partial<ProposalInput> = {}): ProposalInput {
  const base = {
    text: "Prefab Microfactory Expansion: Establish a prefab manufacturing line to increase output and export capacity within 12 months. Budget needed: $250,000 USD. Located in Atlanta. Expected to create 12 jobs and reduce economic leakage by $150,000 annually.",
    proposer: { wallet: "WALLET_123", role: "member" as const, displayName: "Alice" },
    region: { code: "ATL", name: "Atlanta" },
  } satisfies ProposalInput;
  return ProposalInputZ.parse({ ...base, ...overrides });
}

describe("ProposalEngine", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns ProposalOutput with evaluation from agents path", async () => {
    const out = await proposalEngine.processProposal(makeInput());

    expect(out.id).toMatch(/^prop_/);
    expect(new Date(out.createdAt).toString()).not.toBe("Invalid Date");
    expect(out.status).toMatch(/^(submitted|votable|approved|funded|rejected|failed)$/);

    // Evaluation scores are within [0,1]
    expect(out.evaluation.computed_scores.overall_score).toBeGreaterThanOrEqual(0);
    expect(out.evaluation.computed_scores.overall_score).toBeLessThanOrEqual(1);
    expect(out.evaluation.structural_scores.feasibility_score).toBeGreaterThanOrEqual(0);
    expect(out.evaluation.structural_scores.feasibility_score).toBeLessThanOrEqual(1);
    expect(typeof out.evaluation.computed_scores.passes_threshold).toBe("boolean");

    // Governance defaults / heuristic
    expect(out.governance.quorumPercent).toBeGreaterThan(0);
    expect(out.governance.approvalThresholdPercent).toBeGreaterThan(0);
    expect(out.governance.votingWindowDays).toBeGreaterThan(0);

    // Checks include basic validation and treasury sum
    const checkNames = new Set(out.audit.checks.map((c: any) => c.name));
    expect(checkNames.has("basic_validation")).toBe(true);
    expect(checkNames.has("treasury_allocation_sum")).toBe(true);
  });

  it("flags excluded sectors via simple heuristic", async () => {
    const out = await proposalEngine.processProposal(
      makeInput({
        text: "Downtown Fashion Pop-up: Launch a fashion retail pop-up and cafe in city center",
      }),
    );
    const checks = (out as any).checks ?? (out as any).audit?.checks ?? [];
    const sector = checks.find((c: any) => c.name === "sector_exclusion_screen");
    expect(sector).toBeDefined();
    expect(sector.passed).toBe(false);
  });

  it("governance adjusts for large budgets in fallback path", async () => {
    const out = await proposalEngine.processProposal(
      makeInput({
        text: "Large Infrastructure Project: Build a major transportation hub. Budget needed: $2,000,000 USD.",
      }),
    );
    expect(out.governance.quorumPercent).toBeGreaterThanOrEqual(15);
    expect(out.governance.approvalThresholdPercent).toBeGreaterThanOrEqual(50);
  });
});
