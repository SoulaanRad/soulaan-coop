import { describe, it, expect, beforeEach } from 'vitest';
import { ProposalEngine, proposalEngine } from '../proposal-engine.js';
import type { ProposalInputV0 } from '../proposal.js';

describe('ProposalEngine (Agents)', () => {
  let engine: ProposalEngine;

  beforeEach(() => {
    engine = new ProposalEngine();
  });

  const createValidInput = (): ProposalInputV0 => ({
    title: "Hampton Grocery Anchor",
    summary: "Fund a small-format grocery to reduce external food spend and increase UC usage.",
    proposer: { 
      wallet: "0xabc123", 
      role: "bot", 
      displayName: "SuggestionBot" 
    },
    region: { 
      code: "VA-HAMPTON", 
      name: "Hampton Roads, VA" 
    },
    category: "business_funding",
    budget: { 
      currency: "USD", 
      amountRequested: 150_000 
    },
    treasuryPlan: { 
      localPercent: 85, 
      nationalPercent: 15, 
      acceptUC: true 
    },
    impact: { 
      leakageReductionUSD: 1_000_000, 
      jobsCreated: 12, 
      timeHorizonMonths: 12 
    },
    kpis: [
      { name: "Local spend retained", target: 750_000, unit: "USD" },
      { name: "UC transactions", target: 200_000, unit: "UC" }
    ]
  });

  describe('processProposal (STUB)', () => {
    it('should validate input and return stubbed response', async () => {
      const input = createValidInput();
      const result = await engine.processProposal(input);

      expect(result).toMatchObject({
        id: expect.stringMatching(/^prop_[a-zA-Z0-9]{6}$/),
        createdAt: expect.any(String),
        // status decided by Decision Agent, allow any valid enum
        status: expect.stringMatching(/^(draft|votable|approved|funded|rejected)$/),
        title: input.title,
        summary: input.summary,
        category: input.category,
        proposer: input.proposer,
        region: input.region,
        budget: input.budget,
        treasuryPlan: input.treasuryPlan,
        impact: input.impact,
        scores: {
          alignment: 0.75,  // STUB values
          feasibility: 0.8,
          composite: 0.775
        },
        governance: {
          quorumPercent: 20,
          approvalThresholdPercent: 60,
          votingWindowDays: 7
        },
        audit: {
          engineVersion: expect.stringMatching(/^proposal-engine@/),
          checks: [
            {
              name: "basic_validation",
              passed: true,
              note: "STUB: Replace with AI-powered audit checks"
            }
          ]
        }
      });
    });

    it('should generate unique IDs', async () => {
      const input = createValidInput();
      const result1 = await engine.processProposal(input);
      const result2 = await engine.processProposal(input);

      expect(result1.id).not.toBe(result2.id);
    });

    it('should still validate input schema', async () => {
      const invalidInput = createValidInput();
      invalidInput.title = "Hi"; // Too short

      await expect(engine.processProposal(invalidInput)).rejects.toThrow();
    });

    it('should work with singleton instance', async () => {
      const input = createValidInput();
      const result = await proposalEngine.processProposal(input);
      
      expect(result.id).toBeDefined();
      expect(result.status).toMatch(/^(draft|votable|approved|funded|rejected)$/);
      expect(result.scores.alignment).toBe(0.75);
    });
  });


});