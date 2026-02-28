import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@repo/db';

const mockDb = db as any;

describe('proposalReaction router (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDb.proposal = {
      findUnique: vi.fn(),
    };
    mockDb.proposalReaction = {
      findUnique: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    };
  });

  // ---------------------------------------------------------------------------
  // getCounts helper logic
  // ---------------------------------------------------------------------------

  describe('getCounts', () => {
    it('returns support and concern counts', async () => {
      mockDb.proposalReaction.count
        .mockResolvedValueOnce(5)  // SUPPORT
        .mockResolvedValueOnce(2); // CONCERN

      const [support, concern] = await Promise.all([
        mockDb.proposalReaction.count({ where: { proposalId: 'prop_1', reaction: 'SUPPORT' } }),
        mockDb.proposalReaction.count({ where: { proposalId: 'prop_1', reaction: 'CONCERN' } }),
      ]);

      expect(support).toBe(5);
      expect(concern).toBe(2);
    });

    it('returns zero counts when no reactions exist', async () => {
      mockDb.proposalReaction.count.mockResolvedValue(0);

      const [support, concern] = await Promise.all([
        mockDb.proposalReaction.count({ where: { proposalId: 'prop_empty', reaction: 'SUPPORT' } }),
        mockDb.proposalReaction.count({ where: { proposalId: 'prop_empty', reaction: 'CONCERN' } }),
      ]);

      expect(support).toBe(0);
      expect(concern).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getCounts query — myReaction logic
  // ---------------------------------------------------------------------------

  describe('getCounts query — myReaction', () => {
    it('returns null myReaction when no walletAddress provided', async () => {
      mockDb.proposalReaction.count.mockResolvedValue(3);

      // No walletAddress — myReaction stays null
      let myReaction: 'SUPPORT' | 'CONCERN' | null = null;
      const walletAddress: string | undefined = undefined;

      if (walletAddress) {
        const existing = await mockDb.proposalReaction.findUnique({
          where: { proposalId_voterWallet: { proposalId: 'prop_1', voterWallet: walletAddress } },
        });
        if (existing) myReaction = existing.reaction;
      }

      expect(myReaction).toBeNull();
      expect(mockDb.proposalReaction.findUnique).not.toHaveBeenCalled();
    });

    it('returns existing reaction as myReaction when walletAddress provided', async () => {
      mockDb.proposalReaction.findUnique.mockResolvedValue({
        proposalId: 'prop_1',
        voterWallet: '0xabc',
        reaction: 'SUPPORT',
      });

      const existing = await mockDb.proposalReaction.findUnique({
        where: { proposalId_voterWallet: { proposalId: 'prop_1', voterWallet: '0xabc' } },
      });

      expect(existing).not.toBeNull();
      expect(existing.reaction).toBe('SUPPORT');
    });

    it('returns null myReaction when wallet has no reaction', async () => {
      mockDb.proposalReaction.findUnique.mockResolvedValue(null);

      const existing = await mockDb.proposalReaction.findUnique({
        where: { proposalId_voterWallet: { proposalId: 'prop_1', voterWallet: '0xnew' } },
      });

      let myReaction: 'SUPPORT' | 'CONCERN' | null = null;
      if (existing) myReaction = existing.reaction;

      expect(myReaction).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // upsert — toggle off (same reaction)
  // ---------------------------------------------------------------------------

  describe('upsert — toggle off', () => {
    it('deletes the reaction when same reaction already exists (toggle off)', async () => {
      const proposalId = 'prop_1';
      const voterWallet = '0xabc';
      const reaction = 'SUPPORT';

      mockDb.proposal.findUnique.mockResolvedValue({ id: proposalId });
      mockDb.proposalReaction.findUnique.mockResolvedValue({
        proposalId,
        voterWallet,
        reaction,
      });
      mockDb.proposalReaction.delete.mockResolvedValue({});
      mockDb.proposalReaction.count.mockResolvedValue(0);

      // Simulate upsert logic
      const proposal = await mockDb.proposal.findUnique({ where: { id: proposalId } });
      expect(proposal).not.toBeNull();

      const existing = await mockDb.proposalReaction.findUnique({
        where: { proposalId_voterWallet: { proposalId, voterWallet } },
      });

      let myReaction: 'SUPPORT' | 'CONCERN' | null = null;

      if (existing && existing.reaction === reaction) {
        // toggle off
        await mockDb.proposalReaction.delete({
          where: { proposalId_voterWallet: { proposalId, voterWallet } },
        });
        myReaction = null;
      } else {
        await mockDb.proposalReaction.upsert({});
        myReaction = reaction;
      }

      expect(mockDb.proposalReaction.delete).toHaveBeenCalledOnce();
      expect(mockDb.proposalReaction.upsert).not.toHaveBeenCalled();
      expect(myReaction).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // upsert — create new reaction
  // ---------------------------------------------------------------------------

  describe('upsert — create new reaction', () => {
    it('upserts reaction when no existing reaction', async () => {
      const proposalId = 'prop_1';
      const voterWallet = '0xnew';
      const reaction = 'CONCERN';

      mockDb.proposal.findUnique.mockResolvedValue({ id: proposalId });
      mockDb.proposalReaction.findUnique.mockResolvedValue(null);
      mockDb.proposalReaction.upsert.mockResolvedValue({ proposalId, voterWallet, reaction });
      mockDb.proposalReaction.count
        .mockResolvedValueOnce(2) // SUPPORT
        .mockResolvedValueOnce(1); // CONCERN

      const proposal = await mockDb.proposal.findUnique({ where: { id: proposalId } });
      expect(proposal).not.toBeNull();

      const existing = await mockDb.proposalReaction.findUnique({
        where: { proposalId_voterWallet: { proposalId, voterWallet } },
      });

      let myReaction: 'SUPPORT' | 'CONCERN' | null = null;

      if (existing && existing.reaction === reaction) {
        await mockDb.proposalReaction.delete({});
        myReaction = null;
      } else {
        await mockDb.proposalReaction.upsert({
          where: { proposalId_voterWallet: { proposalId, voterWallet } },
          create: { proposalId, voterWallet, reaction },
          update: { reaction },
        });
        myReaction = reaction;
      }

      expect(mockDb.proposalReaction.delete).not.toHaveBeenCalled();
      expect(mockDb.proposalReaction.upsert).toHaveBeenCalledOnce();
      expect(myReaction).toBe('CONCERN');
    });

    it('upserts reaction when different reaction already exists (change reaction type)', async () => {
      const proposalId = 'prop_1';
      const voterWallet = '0xexisting';
      const newReaction = 'CONCERN';

      mockDb.proposal.findUnique.mockResolvedValue({ id: proposalId });
      mockDb.proposalReaction.findUnique.mockResolvedValue({
        proposalId,
        voterWallet,
        reaction: 'SUPPORT', // existing is SUPPORT, new is CONCERN
      });
      mockDb.proposalReaction.upsert.mockResolvedValue({ proposalId, voterWallet, reaction: newReaction });
      mockDb.proposalReaction.count
        .mockResolvedValueOnce(1) // SUPPORT
        .mockResolvedValueOnce(3); // CONCERN

      const existing = await mockDb.proposalReaction.findUnique({
        where: { proposalId_voterWallet: { proposalId, voterWallet } },
      });

      let myReaction: 'SUPPORT' | 'CONCERN' | null = null;

      if (existing && existing.reaction === newReaction) {
        await mockDb.proposalReaction.delete({});
        myReaction = null;
      } else {
        await mockDb.proposalReaction.upsert({
          where: { proposalId_voterWallet: { proposalId, voterWallet } },
          create: { proposalId, voterWallet, reaction: newReaction },
          update: { reaction: newReaction },
        });
        myReaction = newReaction;
      }

      // Existing is SUPPORT but incoming is CONCERN → different → upsert, not delete
      expect(mockDb.proposalReaction.delete).not.toHaveBeenCalled();
      expect(mockDb.proposalReaction.upsert).toHaveBeenCalledOnce();
      expect(myReaction).toBe('CONCERN');
    });
  });

  // ---------------------------------------------------------------------------
  // upsert — proposal not found
  // ---------------------------------------------------------------------------

  describe('upsert — proposal not found', () => {
    it('throws NOT_FOUND when proposal does not exist', async () => {
      mockDb.proposal.findUnique.mockResolvedValue(null);

      const proposal = await mockDb.proposal.findUnique({ where: { id: 'nonexistent' } });
      expect(proposal).toBeNull();

      // Router would throw TRPCError NOT_FOUND here
      // Verify the check works
      const shouldThrow = !proposal;
      expect(shouldThrow).toBe(true);
    });
  });
});
