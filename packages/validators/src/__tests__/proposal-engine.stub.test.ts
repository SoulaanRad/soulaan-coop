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

      // Basic structure checks
      expect(result.id).toMatch(/^prop_[a-zA-Z0-9]{6}$/);
      expect(result.createdAt).toBeDefined();
      expect(typeof result.createdAt).toBe('string');
      expect(result.status).toMatch(/^(submitted|votable|approved|funded|rejected|failed)$/);
      expect(typeof result.title).toBe('string');
      expect(typeof result.summary).toBe('string');
      expect(typeof result.category).toBe('string');
      expect(result.proposer).toEqual(input.proposer);
      expect(result.region).toEqual(input.region);
      expect(result.budget).toBeDefined();
      expect(result.treasuryPlan).toBeDefined();
      
      // Evaluation structure
      expect(result.evaluation).toBeDefined();
      expect(result.evaluation.structural_scores).toBeDefined();
      expect(Array.isArray(result.evaluation.mission_impact_scores)).toBe(true);
      expect(result.evaluation.computed_scores).toBeDefined();
      
      // Governance
      expect(result.governance).toBeDefined();
      expect(typeof result.governance.quorumPercent).toBe('number');
      expect(typeof result.governance.approvalThresholdPercent).toBe('number');
      expect(typeof result.governance.votingWindowDays).toBe('number');
      
      // Audit
      expect(result.audit).toBeDefined();
      expect(result.audit.engineVersion).toMatch(/^proposal-engine@/);
      expect(Array.isArray(result.audit.checks)).toBe(true);
      const basicValidation = result.audit.checks.find(c => c.name === 'basic_validation');
      expect(basicValidation).toBeDefined();
      expect(basicValidation?.passed).toBe(true);
    });

    it('should generate unique IDs', async () => {
      const input = createValidInput();
      const result1 = await engine.processProposal(input);
      const result2 = await engine.processProposal(input);

      expect(result1.id).not.toBe(result2.id);
    }, 180_000);

    it('should still validate input schema', async () => {
      const invalidInput = createValidInput();
      invalidInput.text = "Hi"; // Too short

      await expect(engine.processProposal(invalidInput)).rejects.toThrow();
    });

    it('should work with singleton instance', async () => {
      const input = createValidInput();
      const result = await proposalEngine.processProposal(input);
      
      expect(result.id).toBeDefined();
      expect(result.status).toMatch(/^(submitted|votable|approved|funded|rejected|failed)$/);
      expect(result.evaluation.computed_scores.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.evaluation.computed_scores.overall_score).toBeLessThanOrEqual(1);
    });
  });


});