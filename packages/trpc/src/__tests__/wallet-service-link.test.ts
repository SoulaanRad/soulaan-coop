import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkExternalWalletToUser } from '../services/wallet-service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';
const NORMALIZED = WALLET_ADDRESS.toLowerCase();
const COOP_ID = 'coop_soulaan';

function makeClient(overrides: Record<string, any> = {}) {
  return {
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'user_new', roles: [], walletAddress: null, name: null }),
      update: vi.fn().mockResolvedValue({ id: 'user_existing', roles: ['member'], walletAddress: NORMALIZED, name: 'Existing' }),
      ...overrides.user,
    },
    wallet: {
      upsert: vi.fn().mockResolvedValue({ id: 'wallet_1', address: NORMALIZED }),
      ...overrides.wallet,
    },
    userCoopMembership: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'membership_1' }),
      ...overrides.userCoopMembership,
    },
    ...overrides,
  };
}

// ─── linkExternalWalletToUser ─────────────────────────────────────────────────

describe('linkExternalWalletToUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new user when no matching wallet or email exists', async () => {
    const client = makeClient();

    const result = await linkExternalWalletToUser(
      { walletAddress: WALLET_ADDRESS, coopId: COOP_ID, name: 'New Admin', roles: ['member', 'admin'] },
      client,
    );

    expect(client.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletAddress: NORMALIZED,
        name: 'New Admin',
        roles: ['member', 'admin'],
        status: 'ACTIVE',
      }),
    });
    expect(result.walletAddress).toBe(NORMALIZED);
  });

  it('updates an existing user rather than creating a duplicate', async () => {
    const client = makeClient({
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'user_existing',
          walletAddress: NORMALIZED,
          roles: ['member'],
          name: 'Existing',
        }),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'user_existing' }),
      },
    });

    await linkExternalWalletToUser(
      { walletAddress: WALLET_ADDRESS, coopId: COOP_ID },
      client,
    );

    expect(client.user.create).not.toHaveBeenCalled();
    expect(client.user.update).toHaveBeenCalled();
  });

  it('upserts the Wallet record with the correct chain', async () => {
    const client = makeClient({
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'user_new', roles: [], walletAddress: null, name: null }),
        update: vi.fn(),
      },
    });

    await linkExternalWalletToUser(
      { walletAddress: WALLET_ADDRESS, coopId: COOP_ID },
      client,
    );

    expect(client.wallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { address: NORMALIZED },
        create: expect.objectContaining({
          walletType: 'EXTERNAL',
          isPrimary: true,
        }),
      }),
    );
  });

  it('upserts the membership and merges roles from existing record', async () => {
    const existingMembership = {
      roles: ['member'],
      approvedBy: '0xprevious',
      approvedAt: new Date('2025-01-01T00:00:00.000Z'),
      joinedAt: new Date('2025-01-01T00:00:00.000Z'),
    };
    const client = makeClient({
      userCoopMembership: {
        findUnique: vi.fn().mockResolvedValue(existingMembership),
        upsert: vi.fn().mockResolvedValue({ id: 'membership_1' }),
      },
    });

    await linkExternalWalletToUser(
      { walletAddress: WALLET_ADDRESS, coopId: COOP_ID, roles: ['admin'] },
      client,
    );

    const upsertArgs = client.userCoopMembership.upsert.mock.calls[0][0];
    // Roles should be merged (existing 'member' + new 'admin')
    expect(upsertArgs.update.roles).toContain('member');
    expect(upsertArgs.update.roles).toContain('admin');
    // Preserves original approvedBy from existing record
    expect(upsertArgs.update.approvedBy).toBe('0xprevious');
    expect(upsertArgs.update.joinedAt).toEqual(existingMembership.joinedAt);
  });

  it('sets defaults when no existing membership is found', async () => {
    const client = makeClient(); // findUnique returns null by default

    await linkExternalWalletToUser(
      { walletAddress: WALLET_ADDRESS, coopId: COOP_ID, roles: ['member', 'admin'] },
      client,
    );

    const upsertArgs = client.userCoopMembership.upsert.mock.calls[0][0];
    expect(upsertArgs.update.roles).toContain('admin');
    expect(upsertArgs.update.approvedBy).toBe(NORMALIZED);
    expect(upsertArgs.update.approvedAt).toBeInstanceOf(Date);
    expect(upsertArgs.update.joinedAt).toBeInstanceOf(Date);
  });

  // ── Regression guard: the membership findUnique must use `select` with only
  // specific fields so it never pulls `username` (or other potentially absent
  // columns) from the database.
  it('REGRESSION: membership findUnique uses select to avoid missing-column errors', async () => {
    const client = makeClient();

    await linkExternalWalletToUser(
      { walletAddress: WALLET_ADDRESS, coopId: COOP_ID },
      client,
    );

    const callArgs = client.userCoopMembership.findUnique?.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();

    // Must have a `select` clause – not a bare call that pulls all columns
    expect(callArgs.select).toBeDefined();

    // Should select exactly the fields needed for the upsert update clause
    const selectedKeys = Object.keys(callArgs.select).sort();
    expect(selectedKeys).toEqual(['approvedAt', 'approvedBy', 'joinedAt', 'roles']);

    // username must NOT be selected (it may be absent in older databases)
    expect(callArgs.select.username).toBeUndefined();
  });

  it('returns userId and normalized walletAddress', async () => {
    const client = makeClient({
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'user_abc', roles: [], walletAddress: null, name: null }),
        update: vi.fn(),
      },
    });

    const result = await linkExternalWalletToUser(
      { walletAddress: WALLET_ADDRESS.toUpperCase(), coopId: COOP_ID },
      client,
    );

    expect(result.userId).toBe('user_abc');
    expect(result.walletAddress).toBe(NORMALIZED); // always lowercased
  });
});
