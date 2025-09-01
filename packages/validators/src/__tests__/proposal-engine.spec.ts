import { describe, it, expect, vi, beforeEach } from "vitest";
import { proposalEngine } from "../proposal-engine.js";
import { ProposalInputV0Z } from "../proposal.js";
import type { ProposalInputV0 } from "../proposal.js";

function makeInput(overrides: Partial<ProposalInputV0> = {}): ProposalInputV0 {
  const base = {
    title: "Prefab Microfactory Expansion",
    summary:
      "Establish a prefab manufacturing line to increase output and export capacity within 12 months.",
    proposer: { wallet: "WALLET_123", role: "member" as const, displayName: "Alice" },
    region: { code: "ATL", name: "Atlanta" },
    category: "infrastructure" as const,
    budget: { currency: "USD" as const, amountRequested: 250_000 },
    treasuryPlan: { localPercent: 60, nationalPercent: 40, acceptUC: true },
    impact: { leakageReductionUSD: 150_000, jobsCreated: 12, timeHorizonMonths: 18 },
    kpis: [
      { name: "units_produced", target: 1_000, unit: "count" as const },
    ],
  } satisfies ProposalInputV0;
  return ProposalInputV0Z.parse({ ...base, ...overrides });
}

describe("ProposalEngine", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns ProposalOutputV0 from agents path", async () => {
    const out = await proposalEngine.processProposal(makeInput());

    expect(out.id).toMatch(/^prop_/);
    expect(new Date(out.createdAt).toString()).not.toBe("Invalid Date");
    expect(out.status).toMatch(/^(draft|votable|approved|funded|rejected)$/);

    // Scores are within [0,1]
    expect(out.scores.alignment).toBeGreaterThanOrEqual(0);
    expect(out.scores.alignment).toBeLessThanOrEqual(1);
    expect(out.scores.feasibility).toBeGreaterThanOrEqual(0);
    expect(out.scores.feasibility).toBeLessThanOrEqual(1);
    expect(out.scores.composite).toBeGreaterThanOrEqual(0);
    expect(out.scores.composite).toBeLessThanOrEqual(1);

    // Governance defaults / heuristic
    expect(out.governance.quorumPercent).toBeGreaterThan(0);
    expect(out.governance.approvalThresholdPercent).toBeGreaterThan(0);
    expect(out.governance.votingWindowDays).toBeGreaterThan(0);

    // Checks include basic validation and treasury sum
    const checkNames = new Set(out.audit.checks.map((c: any) => c.name));
    // Support either location if buildOutputV0 later nests checks under audit
    expect(checkNames.has("basic_validation")).toBe(true);
    expect(checkNames.has("treasury_allocation_sum")).toBe(true);
  });

  it("flags excluded sectors via simple heuristic", async () => {
    const out = await proposalEngine.processProposal(
      makeInput({
        title: "Downtown Fashion Pop-up",
        summary: "Launch a fashion retail pop-up and cafe in city center",
      }),
    );
    const checks = (out as any).checks ?? (out as any).audit?.checks ?? [];
    const sector = checks.find((c: any) => c.name === "sector_exclusion_screen");
    expect(sector).toBeDefined();
    expect(sector.passed).toBe(false);
  });

  it("governance adjusts for large budgets in fallback path", async () => {
    const out = await proposalEngine.processProposal(
      makeInput({ budget: { currency: "USD", amountRequested: 2_000_000 } }),
    );
    expect(out.governance.quorumPercent).toBeGreaterThanOrEqual(25);
    expect(out.governance.approvalThresholdPercent).toBeGreaterThanOrEqual(65);
  });
});


