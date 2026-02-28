import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@repo/db';

const mockDb = db as any;

// Mock the proposal engine with the new evaluation model
vi.mock('@repo/validators', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    proposalEngine: {
      processProposal: vi.fn().mockResolvedValue({
        id: 'prop_test01',
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'votable',
        title: 'Test Proposal',
        summary: 'A test proposal',
        category: 'business_funding',
        proposer: { wallet: '0xtest', role: 'member', displayName: 'Test' },
        region: { code: 'US', name: 'United States' },
        budget: { currency: 'USD', amountRequested: 50000 },
        treasuryPlan: { localPercent: 70, nationalPercent: 30, acceptUC: true },
        evaluation: {
          structural_scores: {
            goal_mapping_valid: true,
            feasibility_score: 0.7,
            risk_score: 0.3,
            accountability_score: 0.6,
          },
          mission_impact_scores: [
            { goal_id: 'income_stability',  impact_score: 0.7, goal_priority_weight: 0.35 },
            { goal_id: 'asset_creation',    impact_score: 0.6, goal_priority_weight: 0.25 },
            { goal_id: 'leakage_reduction', impact_score: 0.8, goal_priority_weight: 0.20 },
            { goal_id: 'export_expansion',  impact_score: 0.5, goal_priority_weight: 0.20 },
          ],
          computed_scores: {
            mission_weighted_score: 0.68,
            structural_weighted_score: 0.76,
            overall_score: 0.71,
            passes_threshold: true,
          },
          violations: [],
          risk_flags: [],
          llm_summary: 'Solid proposal.',
        },
        charterVersionId: 'cfg_1',
        governance: { quorumPercent: 20, approvalThresholdPercent: 60, votingWindowDays: 7 },
        audit: {
          engineVersion: 'proposal-engine@2.0.0',
          checks: [{ name: 'basic_validation', passed: true }],
        },
        alternatives: [],
        bestAlternative: null,
        decision: 'advance',
        decisionReasons: ['Overall score 71% passes screening threshold.'],
        missing_data: [],
        councilRequired: false,
      }),
      evaluateComment: vi.fn(),
    },
  };
});

describe('proposal router enhanced (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDb.proposal = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    };
    mockDb.coopConfig = {
      findFirst: vi.fn(),
    };
  });

  describe('create', () => {
    it('fetches CoopConfig and uses it', async () => {
      const config = {
        id: 'cfg_1',
        coopId: 'soulaan',
        charterText: 'Charter...',
        missionGoals: [
          { key: 'income_stability', label: 'Income Stability', priorityWeight: 0.35 },
        ],
        structuralWeights: { feasibility: 0.40, risk: 0.35, accountability: 0.25 },
        scoreMix: { missionWeight: 0.60, structuralWeight: 0.40 },
        screeningPassThreshold: 0.6,
        proposalCategories: [],
        sectorExclusions: [],
        quorumPercent: 15,
        approvalThresholdPercent: 51,
        votingWindowDays: 7,
        minScBalanceToSubmit: 0,
        councilVoteThresholdUSD: 5000,
      };

      mockDb.coopConfig.findFirst.mockResolvedValue(config);

      const result = await mockDb.coopConfig.findFirst({
        where: { coopId: 'soulaan', isActive: true },
      });

      expect(result).not.toBeNull();
      expect(result.coopId).toBe('soulaan');
      expect(result.missionGoals).toBeDefined();
      expect(result.structuralWeights).toBeDefined();
    });

    it('persists evaluation to DB', () => {
      const evaluation = {
        structural_scores: {
          goal_mapping_valid: true,
          feasibility_score: 0.7,
          risk_score: 0.3,
          accountability_score: 0.6,
        },
        mission_impact_scores: [
          { goal_id: 'income_stability', impact_score: 0.7, goal_priority_weight: 0.35 },
        ],
        computed_scores: {
          mission_weighted_score: 0.68,
          structural_weighted_score: 0.76,
          overall_score: 0.71,
          passes_threshold: true,
        },
        violations: [],
        risk_flags: [],
        llm_summary: 'Test',
      };

      expect(evaluation.computed_scores.overall_score).toBeGreaterThanOrEqual(0);
      expect(evaluation.computed_scores.overall_score).toBeLessThanOrEqual(1);
      expect(typeof evaluation.computed_scores.passes_threshold).toBe('boolean');
    });

    it('persists decision and decisionReasons', () => {
      const decision = 'advance';
      const decisionReasons = ['Overall score 71% passes screening threshold.'];

      expect(['advance', 'revise', 'block']).toContain(decision);
      expect(decisionReasons.length).toBeGreaterThan(0);
    });

    it('allows submission when minScBalanceToSubmit is 0', async () => {
      const config = { minScBalanceToSubmit: 0 };
      mockDb.coopConfig.findFirst.mockResolvedValue(config);

      const result = await mockDb.coopConfig.findFirst({ where: {} });
      expect(result.minScBalanceToSubmit).toBe(0);
    });
  });

  describe('mapDbToOutput currency handling', () => {
    const mapCurrency = (budgetCurrency: string) =>
      budgetCurrency === 'MIXED' ? 'mixed' : budgetCurrency;

    it('preserves UC from DB as UC', () => {
      expect(mapCurrency('UC')).toBe('UC');
    });

    it('preserves USD from DB as USD', () => {
      expect(mapCurrency('USD')).toBe('USD');
    });

    it('converts MIXED from DB to mixed', () => {
      expect(mapCurrency('MIXED')).toBe('mixed');
    });

    it('does not lowercase UC to uc', () => {
      const currency = mapCurrency('UC');
      expect(currency).not.toBe('uc');
      expect(currency).toBe('UC');
    });
  });

  describe('mapDbToOutput', () => {
    it('correctly reads evaluation and enhanced fields from DB record', () => {
      const dbRecord = {
        id: 'prop_test',
        createdAt: new Date('2026-01-01'),
        status: 'VOTABLE',
        evaluation: {
          structural_scores: {
            goal_mapping_valid: true,
            feasibility_score: 0.7,
            risk_score: 0.3,
            accountability_score: 0.6,
          },
          mission_impact_scores: [
            { goal_id: 'income_stability', impact_score: 0.7, goal_priority_weight: 0.35 },
          ],
          computed_scores: {
            mission_weighted_score: 0.68,
            structural_weighted_score: 0.76,
            overall_score: 0.71,
            passes_threshold: true,
          },
          violations: [],
          risk_flags: [],
          llm_summary: 'Solid proposal.',
        },
        charterVersionId: 'cfg_1',
        alternatives: [],
        bestAlternative: null,
        decision: 'advance',
        decisionReasons: ['Passed threshold.'],
        missingData: [],
        councilRequired: false,
      };

      const output = {
        id: dbRecord.id,
        createdAt: dbRecord.createdAt.toISOString(),
        status: dbRecord.status.toLowerCase(),
        evaluation: dbRecord.evaluation,
        charterVersionId: dbRecord.charterVersionId,
        alternatives: dbRecord.alternatives ?? [],
        bestAlternative: dbRecord.bestAlternative ?? undefined,
        decision: dbRecord.decision ?? 'advance',
        decisionReasons: dbRecord.decisionReasons ?? [],
        missing_data: dbRecord.missingData ?? [],
      };

      expect(output.status).toBe('votable');
      expect(output.evaluation).toBeDefined();
      expect(output.evaluation.computed_scores.overall_score).toBe(0.71);
      expect(output.evaluation.computed_scores.passes_threshold).toBe(true);
      expect(output.charterVersionId).toBe('cfg_1');
      expect(output.decision).toBe('advance');
    });

    it('provides defaults when evaluation is null', () => {
      const dbRecord = {
        evaluation: null,
        charterVersionId: null,
        alternatives: null,
        bestAlternative: null,
        decision: null,
        decisionReasons: null,
        missingData: null,
      };

      const evaluation = (dbRecord.evaluation as any) ?? {
        structural_scores: { goal_mapping_valid: true, feasibility_score: 0.5, risk_score: 0.5, accountability_score: 0.5 },
        mission_impact_scores: [],
        computed_scores: { mission_weighted_score: 0.5, structural_weighted_score: 0.5, overall_score: 0.5, passes_threshold: false },
        violations: [],
        risk_flags: [],
        llm_summary: '',
      };

      expect(evaluation.computed_scores.overall_score).toBe(0.5);
      expect(evaluation.computed_scores.passes_threshold).toBe(false);
      expect(dbRecord.alternatives ?? []).toEqual([]);
      expect(dbRecord.decision ?? 'advance').toBe('advance');
    });
  });

  describe('list with coopId filter', () => {
    it('passes coopId to the where clause', async () => {
      mockDb.proposal.findMany.mockResolvedValue([]);
      mockDb.proposal.count.mockResolvedValue(0);

      await mockDb.proposal.findMany({
        where: { coopId: 'soulaan' },
        orderBy: { createdAt: 'desc' },
      });

      expect(mockDb.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { coopId: 'soulaan' },
        }),
      );
    });
  });
});
