import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { Address } from 'viem';

vi.mock('../services/admin-verification.js', () => ({
  checkAdminStatusWithRole: vi.fn(),
}));

import { privateProcedure } from '../procedures/private.js';
import { checkAdminStatusWithRole } from '../services/admin-verification.js';
import { router } from '../trpc.js';

const testRouter = router({
  testPrivate: privateProcedure.query(() => {
    return { success: true };
  }),
});

describe('privateProcedure Middleware', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890' as Address;
  const mockCoopId = 'soulaan';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow request when wallet is admin with valid coopId', async () => {
    vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
      isAdmin: true,
      role: 'Treasury Safe Owner',
    });

    const mockContext = {
      db: {} as any,
      req: {
        headers: {
          'x-wallet-address': mockWalletAddress,
          'x-coop-id': mockCoopId,
        },
      } as any,
      res: {} as any,
      coopId: mockCoopId,
    };

    const caller = testRouter.createCaller(mockContext);
    const result = await caller.testPrivate();

    expect(result.success).toBe(true);
    expect(checkAdminStatusWithRole).toHaveBeenCalledWith(mockWalletAddress, mockCoopId);
  });

  it('should reject request when wallet address is missing', async () => {
    const mockContext = {
      db: {} as any,
      req: {
        headers: {},
      } as any,
      res: {} as any,
      coopId: mockCoopId,
    };

    const caller = testRouter.createCaller(mockContext);

    await expect(caller.testPrivate()).rejects.toThrow(TRPCError);
    await expect(caller.testPrivate()).rejects.toThrow('No wallet address provided');
  });

  it('should reject request when wallet address format is invalid', async () => {
    const mockContext = {
      db: {} as any,
      req: {
        headers: {
          'x-wallet-address': 'invalid-address',
        },
      } as any,
      res: {} as any,
      coopId: mockCoopId,
    };

    const caller = testRouter.createCaller(mockContext);

    await expect(caller.testPrivate()).rejects.toThrow(TRPCError);
    await expect(caller.testPrivate()).rejects.toThrow('Invalid wallet address format');
  });

  it('should reject request when user is not an admin', async () => {
    vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
      isAdmin: false,
    });

    const mockContext = {
      db: {} as any,
      req: {
        headers: {
          'x-wallet-address': mockWalletAddress,
          'x-coop-id': mockCoopId,
        },
      } as any,
      res: {} as any,
      coopId: mockCoopId,
    };

    const caller = testRouter.createCaller(mockContext);

    await expect(caller.testPrivate()).rejects.toThrow(TRPCError);
    await expect(caller.testPrivate()).rejects.toThrow('You must be an admin to perform this action');
    expect(checkAdminStatusWithRole).toHaveBeenCalledWith(mockWalletAddress, mockCoopId);
  });

  it('should use empty string as default when coopId is missing', async () => {
    vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
      isAdmin: false,
    });

    const mockContext = {
      db: {} as any,
      req: {
        headers: {
          'x-wallet-address': mockWalletAddress,
        },
      } as any,
      res: {} as any,
      coopId: undefined,
    };

    const caller = testRouter.createCaller(mockContext);

    await expect(caller.testPrivate()).rejects.toThrow(TRPCError);
    expect(checkAdminStatusWithRole).toHaveBeenCalledWith(mockWalletAddress, '');
  });

  it('should handle admin verification errors gracefully', async () => {
    vi.mocked(checkAdminStatusWithRole).mockRejectedValue(
      new Error('Network error')
    );

    const mockContext = {
      db: {} as any,
      req: {
        headers: {
          'x-wallet-address': mockWalletAddress,
          'x-coop-id': mockCoopId,
        },
      } as any,
      res: {} as any,
      coopId: mockCoopId,
    };

    const caller = testRouter.createCaller(mockContext);

    await expect(caller.testPrivate()).rejects.toThrow(TRPCError);
    await expect(caller.testPrivate()).rejects.toThrow('Admin verification failed');
  });

  it('should pass admin role to context when verification succeeds', async () => {
    const mockRole = 'Soulaani Coin Admin';
    
    vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
      isAdmin: true,
      role: mockRole,
    });

    const testRouterWithContext = router({
      testWithContext: privateProcedure.query(({ ctx }) => {
        return {
          walletAddress: ctx.walletAddress,
          adminRole: (ctx as any).adminRole,
        };
      }),
    });

    const mockContext = {
      db: {} as any,
      req: {
        headers: {
          'x-wallet-address': mockWalletAddress,
          'x-coop-id': mockCoopId,
        },
      } as any,
      res: {} as any,
      coopId: mockCoopId,
    };

    const caller = testRouterWithContext.createCaller(mockContext);
    const result = await caller.testWithContext();

    expect(result.walletAddress).toBe(mockWalletAddress);
    expect(result.adminRole).toBe(mockRole);
  });
});
