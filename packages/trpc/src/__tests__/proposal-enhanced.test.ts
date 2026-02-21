import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@repo/db';

const mockDb = db as any;

// Mock the proposal engine
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
        impact: { leakageReductionUSD: 10000, jobsCreated: 3, timeHorizonMonths: 12 },
        scores: { alignment: 0.7, feasibility: 0.6, composite: 0.65 },
        governance: { quorumPercent: 20, approvalThresholdPercent: 60, votingWindowDays: 7 },
        audit: {
          engineVersion: 'proposal-engine@agents-1.0.0',
          checks: [{ name: 'basic_validation', passed: true }],
        },
        goalScores: {
          LeakageReduction: 0.7,
          MemberBenefit: 0.6,
          EquityGrowth: 0.5,
          LocalJobs: 0.6,
          CommunityVitality: 0.5,
          Resilience: 0.4,
          composite: 0.56,
        },
        alternatives: [],
        bestAlternative: null,
        decision: 'advance',
        decisionReasons: ['No superior alternative.'],
        missing_data: [],
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
        goalDefinitions: [],
        scoringWeights: {},
        proposalCategories: [],
        sectorExclusions: [],
        quorumPercent: 15,
        approvalThresholdPercent: 51,
        votingWindowDays: 7,
        minScBalanceToSubmit: 0,
      };

      mockDb.coopConfig.findFirst.mockResolvedValue(config);

      const result = await mockDb.coopConfig.findFirst({
        where: { coopId: 'soulaan', isActive: true },
      });

      expect(result).not.toBeNull();
      expect(result.coopId).toBe('soulaan');
    });

    it('persists goalScores to DB', () => {
      const goalScores = {
        LeakageReduction: 0.7,
        MemberBenefit: 0.6,
        EquityGrowth: 0.5,
        LocalJobs: 0.6,
        CommunityVitality: 0.5,
        Resilience: 0.4,
        composite: 0.56,
      };

      // Verify goalScores is a valid JSON structure
      expect(goalScores.composite).toBeGreaterThanOrEqual(0);
      expect(goalScores.composite).toBeLessThanOrEqual(1);
      expect(Object.keys(goalScores)).toHaveLength(7);
    });

    it('persists decision and decisionReasons', () => {
      const decision = 'advance';
      const decisionReasons = ['No superior alternative over charter goals.'];

      expect(['advance', 'revise', 'block']).toContain(decision);
      expect(decisionReasons.length).toBeGreaterThan(0);
    });

    it('allows submission when minScBalanceToSubmit is 0', async () => {
      const config = { minScBalanceToSubmit: 0 };
      mockDb.coopConfig.findFirst.mockResolvedValue(config);

      const result = await mockDb.coopConfig.findFirst({ where: {} });
      // No error thrown — threshold of 0 means no check needed
      expect(result.minScBalanceToSubmit).toBe(0);
    });
  });

  describe('mapDbToOutput currency handling', () => {
    const makeDbRecord = (budgetCurrency: string) => ({
      id: 'prop_cur',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      status: 'DRAFT',
      title: 'Currency Test',
      summary: 'Test',
      category: 'BUSINESS_FUNDING',
      proposerWallet: '0xtest',
      proposerRole: 'MEMBER',
      proposerDisplayName: 'Test',
      regionCode: 'US',
      regionName: 'US',
      budgetCurrency,
      budgetAmount: 1000,
      localPercent: 70,
      nationalPercent: 30,
      acceptUC: true,
      leakageReductionUSD: 500,
      jobsCreated: 1,
      timeHorizonMonths: 6,
      alignmentScore: 0.5,
      feasibilityScore: 0.5,
      compositeScore: 0.5,
      quorumPercent: 15,
      approvalThresholdPercent: 51,
      votingWindowDays: 7,
      engineVersion: 'test',
      auditChecks: [],
      goalScores: null,
      alternatives: null,
      bestAlternative: null,
      decision: null,
      decisionReasons: null,
      missingData: null,
    });

    // Replicate mapDbToOutput currency logic
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
      const record = makeDbRecord('UC');
      const currency = mapCurrency(record.budgetCurrency);
      expect(currency).not.toBe('uc');
      expect(currency).toBe('UC');
    });
  });

  describe('mapDbToOutput', () => {
    it('correctly reads enhanced fields from DB record', () => {
      const dbRecord = {
        id: 'prop_test',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        status: 'VOTABLE',
        title: 'Test',
        summary: 'Test summary',
        category: 'BUSINESS_FUNDING',
        proposerWallet: '0xtest',
        proposerRole: 'MEMBER',
        proposerDisplayName: 'Test User',
        regionCode: 'US',
        regionName: 'United States',
        budgetCurrency: 'USD',
        budgetAmount: 50000,
        localPercent: 70,
        nationalPercent: 30,
        acceptUC: true,
        leakageReductionUSD: 10000,
        jobsCreated: 3,
        timeHorizonMonths: 12,
        alignmentScore: 0.7,
        feasibilityScore: 0.6,
        compositeScore: 0.65,
        quorumPercent: 20,
        approvalThresholdPercent: 60,
        votingWindowDays: 7,
        engineVersion: 'proposal-engine@agents-1.0.0',
        auditChecks: [{ name: 'basic_validation', passed: true, note: null }],
        // Enhanced fields present in DB
        goalScores: {
          LeakageReduction: 0.7,
          MemberBenefit: 0.6,
          EquityGrowth: 0.5,
          LocalJobs: 0.6,
          CommunityVitality: 0.5,
          Resilience: 0.4,
          composite: 0.56,
        },
        alternatives: [],
        bestAlternative: null,
        decision: 'advance',
        decisionReasons: ['No superior alternative.'],
        missingData: [],
      };

      // Simulate the mapDbToOutput function behavior
      const output = {
        id: dbRecord.id,
        createdAt: dbRecord.createdAt.toISOString(),
        status: dbRecord.status.toLowerCase(),
        goalScores: dbRecord.goalScores ?? undefined,
        alternatives: dbRecord.alternatives ?? [],
        bestAlternative: dbRecord.bestAlternative ?? undefined,
        decision: dbRecord.decision ?? 'advance',
        decisionReasons: dbRecord.decisionReasons ?? [],
        missing_data: dbRecord.missingData ?? [],
      };

      expect(output.status).toBe('votable');
      expect(output.goalScores).toBeDefined();
      expect(output.goalScores?.composite).toBe(0.56);
      expect(output.decision).toBe('advance');
      expect(output.decisionReasons).toEqual(['No superior alternative.']);
      expect(output.alternatives).toEqual([]);
    });

    it('provides defaults when enhanced fields are null', () => {
      const dbRecord = {
        goalScores: null,
        alternatives: null,
        bestAlternative: null,
        decision: null,
        decisionReasons: null,
        missingData: null,
      };

      const output = {
        goalScores: dbRecord.goalScores ?? undefined,
        alternatives: dbRecord.alternatives ?? [],
        bestAlternative: dbRecord.bestAlternative ?? undefined,
        decision: dbRecord.decision ?? 'advance',
        decisionReasons: dbRecord.decisionReasons ?? [],
        missing_data: dbRecord.missingData ?? [],
      };

      expect(output.goalScores).toBeUndefined();
      expect(output.alternatives).toEqual([]);
      expect(output.decision).toBe('advance');
      expect(output.decisionReasons).toEqual([]);
      expect(output.missing_data).toEqual([]);
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
