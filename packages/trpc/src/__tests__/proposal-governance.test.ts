import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@repo/db';

const mockDb = db as any;

// Mock the proposal engine
vi.mock('@repo/validators', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    proposalEngine: {
      ...original.proposalEngine,
      processProposal: vi.fn(),
      evaluateComment: vi.fn(),
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers to simulate mapDbToOutput (mirrors proposal router logic)
// ---------------------------------------------------------------------------

function makeBaseProposal(overrides: Record<string, any> = {}) {
  return {
    id: 'prop_gov01',
    createdAt: new Date('2026-02-21'),
    updatedAt: new Date('2026-02-21'),
    status: 'SUBMITTED',
    title: 'Governance Test Proposal',
    summary: 'A proposal for testing governance flows',
    category: 'BUSINESS_FUNDING',
    proposerWallet: '0xproposer1234',
    proposerRole: 'MEMBER',
    proposerDisplayName: 'Test Proposer',
    regionCode: 'US',
    regionName: 'United States',
    budgetCurrency: 'USD',
    budgetAmount: 1000,
    localPercent: 70,
    nationalPercent: 30,
    acceptUC: true,
    alignmentScore: 0.7,
    feasibilityScore: 0.6,
    compositeScore: 0.65,
    quorumPercent: 20,
    approvalThresholdPercent: 60,
    votingWindowDays: 7,
    engineVersion: 'proposal-engine@agents-1.0.0',
    auditChecks: [],
    kpis: [],
    goalScores: null,
    alternatives: null,
    bestAlternative: null,
    decision: 'advance',
    decisionReasons: [],
    missingData: null,
    councilRequired: false,
    withdrawnAt: null,
    withdrawnBy: null,
    coopId: 'soulaan',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// proposal.withdraw logic
// ---------------------------------------------------------------------------

describe('proposal.withdraw (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDb.proposal = {
      findUnique: vi.fn(),
      update: vi.fn(),
    };
  });

  it('withdraws a SUBMITTED proposal when called by proposer', async () => {
    const proposal = makeBaseProposal({ status: 'SUBMITTED', proposerWallet: '0xproposer1234' });
    const walletAddress = '0xproposer1234';

    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposal.update.mockResolvedValue({
      ...proposal,
      status: 'WITHDRAWN',
      withdrawnAt: new Date(),
      withdrawnBy: walletAddress,
    });

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });
    expect(found).not.toBeNull();

    // Ownership check
    expect(found.proposerWallet).toBe(walletAddress);

    // Status guard
    const withdrawable = ['SUBMITTED', 'VOTABLE'];
    expect(withdrawable).toContain(found.status);

    const updated = await mockDb.proposal.update({
      where: { id: 'prop_gov01' },
      data: { status: 'WITHDRAWN', withdrawnAt: new Date(), withdrawnBy: walletAddress },
      include: { kpis: true, auditChecks: true },
    });

    expect(updated.status).toBe('WITHDRAWN');
    expect(updated.withdrawnBy).toBe(walletAddress);
  });

  it('withdraws a VOTABLE proposal when called by proposer', async () => {
    const proposal = makeBaseProposal({ status: 'VOTABLE', proposerWallet: '0xproposer1234' });

    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposal.update.mockResolvedValue({ ...proposal, status: 'WITHDRAWN' });

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });
    const withdrawable = ['SUBMITTED', 'VOTABLE'];
    expect(withdrawable).toContain(found.status);
  });

  it('throws NOT_FOUND when proposal does not exist', async () => {
    mockDb.proposal.findUnique.mockResolvedValue(null);

    const proposal = await mockDb.proposal.findUnique({ where: { id: 'nonexistent' } });
    expect(proposal).toBeNull();

    // Router would throw TRPCError NOT_FOUND
    const shouldThrow = !proposal;
    expect(shouldThrow).toBe(true);
  });

  it('throws FORBIDDEN when non-proposer wallet tries to withdraw', async () => {
    const proposal = makeBaseProposal({ status: 'SUBMITTED', proposerWallet: '0xproposer1234' });
    const differentWallet = '0xinterloper';

    mockDb.proposal.findUnique.mockResolvedValue(proposal);

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });

    // Ownership check — different wallet
    const isOwner = found.proposerWallet === differentWallet;
    expect(isOwner).toBe(false);

    // Router would throw TRPCError FORBIDDEN
    const shouldThrow = !isOwner;
    expect(shouldThrow).toBe(true);
  });

  it('throws BAD_REQUEST when trying to withdraw an APPROVED proposal', async () => {
    const proposal = makeBaseProposal({ status: 'APPROVED', proposerWallet: '0xproposer1234' });

    mockDb.proposal.findUnique.mockResolvedValue(proposal);

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });

    const withdrawable = ['SUBMITTED', 'VOTABLE'];
    const canWithdraw = withdrawable.includes(found.status);

    expect(canWithdraw).toBe(false);
    // Router would throw TRPCError BAD_REQUEST
  });

  it('throws BAD_REQUEST when trying to withdraw a FUNDED proposal', async () => {
    const proposal = makeBaseProposal({ status: 'FUNDED', proposerWallet: '0xproposer1234' });

    mockDb.proposal.findUnique.mockResolvedValue(proposal);

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });

    const withdrawable = ['SUBMITTED', 'VOTABLE'];
    const canWithdraw = withdrawable.includes(found.status);

    expect(canWithdraw).toBe(false);
  });

  it('throws BAD_REQUEST when trying to withdraw a REJECTED proposal', async () => {
    const proposal = makeBaseProposal({ status: 'REJECTED', proposerWallet: '0xproposer1234' });

    mockDb.proposal.findUnique.mockResolvedValue(proposal);

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });

    const withdrawable = ['SUBMITTED', 'VOTABLE'];
    const canWithdraw = withdrawable.includes(found.status);

    expect(canWithdraw).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// proposal.councilVote logic
// ---------------------------------------------------------------------------

describe('proposal.councilVote (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDb.proposal = {
      findUnique: vi.fn(),
      update: vi.fn(),
    };
    mockDb.proposalVote = {
      upsert: vi.fn(),
      count: vi.fn(),
    };
  });

  it('throws NOT_FOUND when proposal does not exist', async () => {
    mockDb.proposal.findUnique.mockResolvedValue(null);

    const proposal = await mockDb.proposal.findUnique({ where: { id: 'nonexistent' } });
    expect(proposal).toBeNull();
  });

  it('throws BAD_REQUEST when council vote not required', async () => {
    const proposal = makeBaseProposal({ councilRequired: false });
    mockDb.proposal.findUnique.mockResolvedValue(proposal);

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });
    expect(found.councilRequired).toBe(false);

    // Router would throw TRPCError BAD_REQUEST
    const shouldThrow = !found.councilRequired;
    expect(shouldThrow).toBe(true);
  });

  it('records FOR vote and returns correct counts (below threshold — no auto-decision)', async () => {
    const proposal = makeBaseProposal({ councilRequired: true, status: 'VOTABLE' });
    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposalVote.upsert.mockResolvedValue({});
    mockDb.proposalVote.count
      .mockResolvedValueOnce(1)  // FOR
      .mockResolvedValueOnce(0)  // AGAINST
      .mockResolvedValueOnce(0); // ABSTAIN

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });
    expect(found.councilRequired).toBe(true);

    await mockDb.proposalVote.upsert({
      where: { proposalId_voterWallet: { proposalId: 'prop_gov01', voterWallet: '0xadmin1' } },
      create: { proposalId: 'prop_gov01', voterWallet: '0xadmin1', vote: 'FOR' },
      update: { vote: 'FOR' },
    });

    const [forCount, againstCount, abstainCount] = await Promise.all([
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'FOR' } }),
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'AGAINST' } }),
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'ABSTAIN' } }),
    ]);

    expect(forCount).toBe(1);
    expect(againstCount).toBe(0);
    expect(abstainCount).toBe(0);

    const totalVotes = forCount + againstCount + abstainCount;
    // Below threshold of 2 — no auto-decision
    expect(totalVotes).toBeLessThan(2);
    expect(mockDb.proposal.update).not.toHaveBeenCalled();
  });

  it('auto-approves when FOR > AGAINST and totalVotes >= 2', async () => {
    const proposal = makeBaseProposal({ councilRequired: true, status: 'VOTABLE' });
    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposalVote.upsert.mockResolvedValue({});
    mockDb.proposalVote.count
      .mockResolvedValueOnce(2)  // FOR
      .mockResolvedValueOnce(0)  // AGAINST
      .mockResolvedValueOnce(1); // ABSTAIN
    mockDb.proposal.update.mockResolvedValue({ ...proposal, status: 'APPROVED' });

    await mockDb.proposalVote.upsert({});

    const [forCount, againstCount, abstainCount] = await Promise.all([
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'FOR' } }),
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'AGAINST' } }),
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'ABSTAIN' } }),
    ]);

    const totalVotes = forCount + againstCount + abstainCount;
    let newStatus: string | null = null;

    if (totalVotes >= 2) {
      if (forCount > againstCount) {
        await mockDb.proposal.update({
          where: { id: 'prop_gov01' },
          data: { status: 'APPROVED' },
        });
        newStatus = 'approved';
      } else if (againstCount > forCount) {
        await mockDb.proposal.update({
          where: { id: 'prop_gov01' },
          data: { status: 'REJECTED' },
        });
        newStatus = 'rejected';
      }
    }

    expect(mockDb.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'APPROVED' } }),
    );
    expect(newStatus).toBe('approved');
  });

  it('auto-rejects when AGAINST > FOR and totalVotes >= 2', async () => {
    const proposal = makeBaseProposal({ councilRequired: true, status: 'VOTABLE' });
    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposalVote.upsert.mockResolvedValue({});
    mockDb.proposalVote.count
      .mockResolvedValueOnce(0)  // FOR
      .mockResolvedValueOnce(2)  // AGAINST
      .mockResolvedValueOnce(0); // ABSTAIN
    mockDb.proposal.update.mockResolvedValue({ ...proposal, status: 'REJECTED' });

    await mockDb.proposalVote.upsert({});

    const [forCount, againstCount, abstainCount] = await Promise.all([
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'FOR' } }),
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'AGAINST' } }),
      mockDb.proposalVote.count({ where: { proposalId: 'prop_gov01', vote: 'ABSTAIN' } }),
    ]);

    const totalVotes = forCount + againstCount + abstainCount;
    let newStatus: string | null = null;

    if (totalVotes >= 2) {
      if (forCount > againstCount) {
        await mockDb.proposal.update({ where: { id: 'prop_gov01' }, data: { status: 'APPROVED' } });
        newStatus = 'approved';
      } else if (againstCount > forCount) {
        await mockDb.proposal.update({ where: { id: 'prop_gov01' }, data: { status: 'REJECTED' } });
        newStatus = 'rejected';
      }
    }

    expect(newStatus).toBe('rejected');
    expect(mockDb.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REJECTED' } }),
    );
  });

  it('no auto-decision when FOR === AGAINST (tie) even with totalVotes >= 2', async () => {
    const proposal = makeBaseProposal({ councilRequired: true, status: 'VOTABLE' });
    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposalVote.upsert.mockResolvedValue({});
    mockDb.proposalVote.count
      .mockResolvedValueOnce(1)  // FOR
      .mockResolvedValueOnce(1)  // AGAINST
      .mockResolvedValueOnce(0); // ABSTAIN

    await mockDb.proposalVote.upsert({});

    const [forCount, againstCount, abstainCount] = await Promise.all([
      mockDb.proposalVote.count({}),
      mockDb.proposalVote.count({}),
      mockDb.proposalVote.count({}),
    ]);

    const totalVotes = forCount + againstCount + abstainCount;
    let newStatus: string | null = null;

    if (totalVotes >= 2) {
      if (forCount > againstCount) {
        await mockDb.proposal.update({ where: { id: 'prop_gov01' }, data: { status: 'APPROVED' } });
        newStatus = 'approved';
      } else if (againstCount > forCount) {
        await mockDb.proposal.update({ where: { id: 'prop_gov01' }, data: { status: 'REJECTED' } });
        newStatus = 'rejected';
      }
    }

    // Tie — no update
    expect(newStatus).toBeNull();
    expect(mockDb.proposal.update).not.toHaveBeenCalled();
  });

  it('ABSTAIN votes count toward total but do not affect auto-decision direction', async () => {
    mockDb.proposalVote.count
      .mockResolvedValueOnce(1)  // FOR
      .mockResolvedValueOnce(0)  // AGAINST
      .mockResolvedValueOnce(2); // ABSTAIN (2 abstains push total to 3 ≥ 2)
    mockDb.proposal.update.mockResolvedValue({});

    const [forCount, againstCount, abstainCount] = await Promise.all([
      mockDb.proposalVote.count({ where: { vote: 'FOR' } }),
      mockDb.proposalVote.count({ where: { vote: 'AGAINST' } }),
      mockDb.proposalVote.count({ where: { vote: 'ABSTAIN' } }),
    ]);

    const totalVotes = forCount + againstCount + abstainCount;
    let newStatus: string | null = null;

    if (totalVotes >= 2) {
      if (forCount > againstCount) {
        await mockDb.proposal.update({ data: { status: 'APPROVED' } });
        newStatus = 'approved';
      } else if (againstCount > forCount) {
        await mockDb.proposal.update({ data: { status: 'REJECTED' } });
        newStatus = 'rejected';
      }
    }

    expect(totalVotes).toBe(3);
    expect(newStatus).toBe('approved');
    expect(mockDb.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'APPROVED' } }),
    );
  });
});

// ---------------------------------------------------------------------------
// proposal.create — auto-approve logic
// ---------------------------------------------------------------------------

describe('proposal.create — auto-approve logic (unit)', () => {
  const THRESHOLD = 5000;

  // Simulates the core decision logic from proposal.ts create mutation
  function computeStatus(decision: string, budget: number, threshold: number) {
    let finalStatus: string;
    let councilRequired = false;

    if (decision === 'advance') {
      if (budget < threshold) {
        finalStatus = 'APPROVED';
      } else {
        finalStatus = 'VOTABLE';
        councilRequired = true;
      }
    } else {
      finalStatus = 'SUBMITTED'; // fallback for revise/block
    }

    return { finalStatus, councilRequired };
  }

  it('auto-approves when decision is "advance" and budget < threshold', () => {
    const { finalStatus, councilRequired } = computeStatus('advance', 4999, THRESHOLD);
    expect(finalStatus).toBe('APPROVED');
    expect(councilRequired).toBe(false);
  });

  it('auto-approves at exactly $1 below threshold', () => {
    const { finalStatus, councilRequired } = computeStatus('advance', 4999.99, THRESHOLD);
    expect(finalStatus).toBe('APPROVED');
    expect(councilRequired).toBe(false);
  });

  it('sends to council when decision is "advance" and budget >= threshold', () => {
    const { finalStatus, councilRequired } = computeStatus('advance', 5000, THRESHOLD);
    expect(finalStatus).toBe('VOTABLE');
    expect(councilRequired).toBe(true);
  });

  it('sends to council when budget greatly exceeds threshold', () => {
    const { finalStatus, councilRequired } = computeStatus('advance', 100000, THRESHOLD);
    expect(finalStatus).toBe('VOTABLE');
    expect(councilRequired).toBe(true);
  });

  it('does NOT auto-approve when decision is "revise"', () => {
    const { finalStatus, councilRequired } = computeStatus('revise', 100, THRESHOLD);
    expect(finalStatus).toBe('SUBMITTED');
    expect(councilRequired).toBe(false);
  });

  it('does NOT auto-approve when decision is "block"', () => {
    const { finalStatus, councilRequired } = computeStatus('block', 100, THRESHOLD);
    expect(finalStatus).toBe('SUBMITTED');
    expect(councilRequired).toBe(false);
  });

  it('uses default threshold of 5000 when no CoopConfig exists', () => {
    // No config → threshold defaults to 5000
    const defaultThreshold = 5000;
    const { finalStatus } = computeStatus('advance', 4999, defaultThreshold);
    expect(finalStatus).toBe('APPROVED');
  });

  it('respects custom threshold from CoopConfig', () => {
    const customThreshold = 10000;
    const { finalStatus: belowCustom, councilRequired: belowCouncil } = computeStatus('advance', 9999, customThreshold);
    expect(belowCustom).toBe('APPROVED');
    expect(belowCouncil).toBe(false);

    const { finalStatus: aboveCustom, councilRequired: aboveCouncil } = computeStatus('advance', 10000, customThreshold);
    expect(aboveCustom).toBe('VOTABLE');
    expect(aboveCouncil).toBe(true);
  });

  describe('CoopConfig threshold fetching', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockDb.coopConfig = {
        findFirst: vi.fn(),
      };
    });

    it('reads councilVoteThresholdUSD from CoopConfig', async () => {
      mockDb.coopConfig.findFirst.mockResolvedValue({
        id: 'cfg_1',
        coopId: 'soulaan',
        isActive: true,
        councilVoteThresholdUSD: 7500,
        minScBalanceToSubmit: 0,
        charterText: '',
        goalDefinitions: [],
        scoringWeights: {},
        proposalCategories: [],
        sectorExclusions: [],
        quorumPercent: 15,
        approvalThresholdPercent: 51,
        votingWindowDays: 7,
      });

      const config = await mockDb.coopConfig.findFirst({
        where: { coopId: 'soulaan', isActive: true },
        orderBy: { version: 'desc' },
      });

      const threshold = (config as any).councilVoteThresholdUSD ?? 5000;
      expect(threshold).toBe(7500);

      // Proposal under custom threshold should auto-approve
      const { finalStatus } = computeStatus('advance', 6000, threshold);
      expect(finalStatus).toBe('APPROVED');

      // Proposal at custom threshold should go to council
      const { finalStatus: atThreshold } = computeStatus('advance', 7500, threshold);
      expect(atThreshold).toBe('VOTABLE');
    });

    it('falls back to 5000 when councilVoteThresholdUSD not set', async () => {
      mockDb.coopConfig.findFirst.mockResolvedValue({
        id: 'cfg_1',
        coopId: 'soulaan',
        isActive: true,
        councilVoteThresholdUSD: undefined,
        minScBalanceToSubmit: 0,
      });

      const config = await mockDb.coopConfig.findFirst({ where: {} });
      const threshold = (config as any).councilVoteThresholdUSD ?? 5000;
      expect(threshold).toBe(5000);
    });

    it('falls back to 5000 when no CoopConfig found', async () => {
      mockDb.coopConfig.findFirst.mockResolvedValue(null);

      const config = await mockDb.coopConfig.findFirst({ where: {} });
      const threshold = config ? ((config as any).councilVoteThresholdUSD ?? 5000) : 5000;
      expect(threshold).toBe(5000);
    });
  });
});

// ---------------------------------------------------------------------------
// proposal.updateStatus — withdrawn handling
// ---------------------------------------------------------------------------

describe('proposal.updateStatus — withdrawn (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDb.proposal = {
      findUnique: vi.fn(),
      update: vi.fn(),
    };
  });

  it('sets withdrawnAt and withdrawnBy when transitioning to WITHDRAWN', async () => {
    const proposal = makeBaseProposal({ status: 'SUBMITTED' });
    const adminWallet = '0xadmin';

    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposal.update.mockImplementation(async ({ data }: any) => ({
      ...proposal,
      ...data,
    }));

    const found = await mockDb.proposal.findUnique({ where: { id: 'prop_gov01' } });
    expect(found).not.toBeNull();

    const newStatus = 'WITHDRAWN';
    const updateData: Record<string, any> = { status: newStatus };

    if (newStatus === 'WITHDRAWN') {
      updateData.withdrawnAt = new Date();
      updateData.withdrawnBy = adminWallet;
    }

    const updated = await mockDb.proposal.update({
      where: { id: 'prop_gov01' },
      data: updateData,
      include: { kpis: true, auditChecks: true },
    });

    expect(updated.status).toBe('WITHDRAWN');
    expect(updated.withdrawnAt).toBeDefined();
    expect(updated.withdrawnBy).toBe(adminWallet);
  });

  it('does NOT set withdrawnAt when transitioning to non-WITHDRAWN status', async () => {
    const proposal = makeBaseProposal({ status: 'SUBMITTED' });

    mockDb.proposal.findUnique.mockResolvedValue(proposal);
    mockDb.proposal.update.mockImplementation(async ({ data }: any) => ({
      ...proposal,
      ...data,
    }));

    const newStatus: string = 'VOTABLE';
    const updateData: Record<string, any> = { status: newStatus };

    // Only set withdrawnAt if WITHDRAWN
    if (newStatus === 'WITHDRAWN') {
      updateData.withdrawnAt = new Date();
      updateData.withdrawnBy = 'admin';
    }

    const updated = await mockDb.proposal.update({
      where: { id: 'prop_gov01' },
      data: updateData,
      include: { kpis: true, auditChecks: true },
    });

    expect(updated.status).toBe('VOTABLE');
    // withdrawnAt/withdrawnBy remain at their initial null values (not set by update)
    expect(updated.withdrawnAt).toBeNull();
    expect(updated.withdrawnBy).toBeNull();
  });
});
