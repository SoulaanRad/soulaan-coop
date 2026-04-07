import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { Address } from 'viem';

vi.mock('../services/admin-verification.js', () => ({
  checkAdminStatusWithRole: vi.fn(),
}));

vi.mock('@repo/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    store: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { storeRouter } from '../routers/store.js';
import { checkAdminStatusWithRole } from '../services/admin-verification.js';
import { db } from '@repo/db';

describe('Store Admin Creation', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890' as Address;
  const mockCoopId = 'soulaan';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStoreAdmin', () => {
    it('should successfully create a store when user is admin with valid coopId', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        walletAddress: mockWalletAddress,
      };

      const mockStore = {
        id: 'store-123',
        name: 'Test Store',
        status: 'APPROVED',
        ownerId: mockUserId,
        coopId: mockCoopId,
      };

      vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
        isAdmin: true,
        role: 'Treasury Safe Owner',
      });

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(db.store.findFirst).mockResolvedValue(null);
      vi.mocked(db.store.create).mockResolvedValue(mockStore as any);

      const mockContext = {
        db,
        req: {
          headers: {
            'x-wallet-address': mockWalletAddress,
            'x-coop-id': mockCoopId,
          },
        } as any,
        res: {} as any,
        coopId: mockCoopId,
        walletAddress: mockWalletAddress,
      };

      const caller = storeRouter.createCaller(mockContext as any);

      const result = await caller.createStoreAdmin({
        ownerId: mockUserId,
        name: 'Test Store',
        description: 'A test store',
        category: 'FOOD_BEVERAGE' as any,
      });

      expect(result.success).toBe(true);
      expect(result.store.id).toBe('store-123');
      expect(result.store.name).toBe('Test Store');
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
      expect(db.store.create).toHaveBeenCalled();
    });

    it('should fail when coopId is missing (empty string)', async () => {
      vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
        isAdmin: false,
      });

      const mockContext = {
        db,
        req: {
          headers: {
            'x-wallet-address': mockWalletAddress,
          },
        } as any,
        res: {} as any,
        coopId: undefined,
        walletAddress: mockWalletAddress,
      };

      const caller = storeRouter.createCaller(mockContext as any);

      await expect(
        caller.createStoreAdmin({
          ownerId: mockUserId,
          name: 'Test Store',
          category: 'FOOD_BEVERAGE' as any,
        })
      ).rejects.toThrow();

      expect(checkAdminStatusWithRole).toHaveBeenCalledWith(mockWalletAddress, '');
    });

    it('should fail when user is not an admin', async () => {
      vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
        isAdmin: false,
      });

      const mockContext = {
        db,
        req: {
          headers: {
            'x-wallet-address': mockWalletAddress,
            'x-coop-id': mockCoopId,
          },
        } as any,
        res: {} as any,
        coopId: mockCoopId,
        walletAddress: mockWalletAddress,
      };

      const caller = storeRouter.createCaller(mockContext as any);

      await expect(
        caller.createStoreAdmin({
          ownerId: mockUserId,
          name: 'Test Store',
          category: 'FOOD_BEVERAGE' as any,
        })
      ).rejects.toThrow('You must be an admin to perform this action');
    });

    it('should fail when owner user does not exist', async () => {
      vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
        isAdmin: true,
        role: 'Treasury Safe Owner',
      });

      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const mockContext = {
        db,
        req: {
          headers: {
            'x-wallet-address': mockWalletAddress,
            'x-coop-id': mockCoopId,
          },
        } as any,
        res: {} as any,
        coopId: mockCoopId,
        walletAddress: mockWalletAddress,
      };

      const caller = storeRouter.createCaller(mockContext as any);

      await expect(
        caller.createStoreAdmin({
          ownerId: 'non-existent-user',
          name: 'Test Store',
          category: 'FOOD_BEVERAGE' as any,
        })
      ).rejects.toThrow('Owner user not found');
    });

    it('should allow user to create multiple stores', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        walletAddress: mockWalletAddress,
      };

      const existingStore = {
        id: 'existing-store-123',
        ownerId: mockUserId,
        coopId: mockCoopId,
      };

      const newStore = {
        id: 'store-123',
        ownerId: mockUserId,
        coopId: mockCoopId,
        name: 'Test Store',
        status: 'APPROVED',
      };

      vi.mocked(checkAdminStatusWithRole).mockResolvedValue({
        isAdmin: true,
        role: 'Treasury Safe Owner',
      });

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(db.store.findFirst).mockResolvedValue(existingStore as any);
      vi.mocked(db.store.create).mockResolvedValue(newStore as any);

      const mockContext = {
        db,
        req: {
          headers: {
            'x-wallet-address': mockWalletAddress,
            'x-coop-id': mockCoopId,
          },
        } as any,
        res: {} as any,
        coopId: mockCoopId,
        walletAddress: mockWalletAddress,
      };

      const caller = storeRouter.createCaller(mockContext as any);

      const result = await caller.createStoreAdmin({
        ownerId: mockUserId,
        name: 'Test Store',
        category: 'FOOD_BEVERAGE' as any,
      });

      expect(result.success).toBe(true);
      expect(result.store.id).toBe('store-123');
      expect(result.store.name).toBe('Test Store');
    });
  });
});
