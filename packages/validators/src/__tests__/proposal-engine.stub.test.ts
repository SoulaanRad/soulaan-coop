import { describe, it, expect, beforeEach } from 'vitest';
import { ProposalEngine, proposalEngine } from '../proposal-engine.js';
import type { ProposalInput } from '../proposal.js';

describe('ProposalEngine (Agents)', () => {
  let engine: ProposalEngine;

  beforeEach(() => {
    engine = new ProposalEngine();
  });

  const createValidInput = (): ProposalInput => ({
    text: "Hampton Grocery Anchor: Fund a small-format grocery to reduce external food spend and increase UC usage. Budget needed: $150,000 USD. Located in Hampton Roads, VA. Expected to reduce economic leakage by $1,000,000 annually and create 12 jobs over 12 months. Target 750,000 USD in local spend retained and 200,000 UC in transactions.",
    proposer: { 
      wallet: "0xabc123", 
      role: "bot", 
      displayName: "SuggestionBot" 
    },
    region: { 
      code: "VA-HAMPTON", 
      name: "Hampton Roads, VA" 
    },
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
        title: expect.any(String),
        summary: expect.any(String),
        category: expect.any(String),
        proposer: input.proposer,
        region: input.region,
        budget: expect.any(Object),
        treasuryPlan: expect.any(Object),
        impact: expect.any(Object),
        scores: {
          alignment: expect.any(Number),  // Mock values may vary
          feasibility: expect.any(Number),
          composite: expect.any(Number)
        },
        governance: {
          quorumPercent: expect.any(Number),  // AI-generated values
          approvalThresholdPercent: expect.any(Number),
          votingWindowDays: expect.any(Number)
        },
        audit: {
          engineVersion: expect.stringMatching(/^proposal-engine@/),
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: "basic_validation",
              passed: true,
            })
          ])
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
      invalidInput.text = "Hi"; // Too short

      await expect(engine.processProposal(invalidInput)).rejects.toThrow();
    });

    it('should work with singleton instance', async () => {
      const input = createValidInput();
      const result = await proposalEngine.processProposal(input);
      
      expect(result.id).toBeDefined();
      expect(result.status).toMatch(/^(draft|votable|approved|funded|rejected)$/);
      expect(result.scores.alignment).toBeGreaterThanOrEqual(0);
      expect(result.scores.alignment).toBeLessThanOrEqual(1);
    });
  });


});