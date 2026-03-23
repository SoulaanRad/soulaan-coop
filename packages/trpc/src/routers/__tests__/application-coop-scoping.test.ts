/**
 * Tests for per-coop application and membership isolation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@repo/db';
import { applicationRouter } from '../application';
import type { Context } from '../../context';

describe('Application Coop Scoping', () => {
  let testUserId: string;
  let testEmail: string;

  beforeEach(async () => {
    testEmail = `test-${Date.now()}@example.com`;
  });

  afterEach(async () => {
    // Cleanup test data
    if (testUserId) {
      await db.application.deleteMany({
        where: { userId: testUserId },
      });
      await db.userCoopMembership.deleteMany({
        where: { userId: testUserId },
      });
      await db.user.delete({
        where: { id: testUserId },
      }).catch(() => {});
    }
  });

  it('should allow same user to apply to multiple coops', async () => {
    const mockContext = {
      db,
      req: {} as any,
      res: {} as any,
    } as Context;

    // Submit application to coop1
    const result1 = await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop1',
      firstName: 'John',
      lastName: 'Doe',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    expect(result1.success).toBe(true);
    testUserId = result1.userId;

    // Submit application to coop2 with same email
    const result2 = await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop2',
      firstName: 'John',
      lastName: 'Doe',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    expect(result2.success).toBe(true);
    expect(result2.userId).toBe(testUserId); // Same user

    // Verify both applications exist
    const applications = await db.application.findMany({
      where: { userId: testUserId },
    });

    expect(applications).toHaveLength(2);
    expect(applications.map(a => a.coopId).sort()).toEqual(['coop1', 'coop2']);
  });

  it('should prevent duplicate application to same coop', async () => {
    const mockContext = {
      db,
      req: {} as any,
      res: {} as any,
    } as Context;

    // Submit first application
    const result1 = await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop1',
      firstName: 'Jane',
      lastName: 'Smith',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    expect(result1.success).toBe(true);
    testUserId = result1.userId;

    // Try to submit duplicate application to same coop
    await expect(
      applicationRouter.createCaller(mockContext).submitApplication({
        coopId: 'coop1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: testEmail,
        phone: '+1234567890',
        password: 'password123',
        confirmPassword: 'password123',
        agreeToCoopValues: true,
        agreeToTerms: true,
        agreeToPrivacy: true,
      })
    ).rejects.toThrow('already submitted an application');
  });

  it('should create separate membership records per coop on approval', async () => {
    const mockContext = {
      db,
      req: {} as any,
      res: {} as any,
      coopId: 'coop1',
      walletAddress: '0x1234567890123456789012345678901234567890',
    } as Context;

    // Submit applications to two coops
    const result1 = await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop1',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    testUserId = result1.userId;

    await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop2',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    // Approve coop1 application
    await applicationRouter.createCaller(mockContext).approveApplication({
      userId: testUserId,
      coopId: 'coop1',
      reviewNotes: 'Approved for coop1',
    });

    // Verify membership record created for coop1
    const membership1 = await db.userCoopMembership.findUnique({
      where: {
        userId_coopId: {
          userId: testUserId,
          coopId: 'coop1',
        },
      },
    });

    expect(membership1).toBeTruthy();
    expect(membership1?.status).toBe('ACTIVE');

    // Verify coop2 membership doesn't exist yet
    const membership2 = await db.userCoopMembership.findUnique({
      where: {
        userId_coopId: {
          userId: testUserId,
          coopId: 'coop2',
        },
      },
    });

    expect(membership2).toBeNull();
  });

  it('should isolate application queries by coopId', async () => {
    const mockContext = {
      db,
      req: {} as any,
      res: {} as any,
    } as Context;

    // Create user with applications to multiple coops
    const result = await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop1',
      firstName: 'Alice',
      lastName: 'Williams',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    testUserId = result.userId;

    await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop2',
      firstName: 'Alice',
      lastName: 'Williams',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    // Query application for coop1
    const app1 = await applicationRouter.createCaller(mockContext).getApplicationStatus({
      userId: testUserId,
      coopId: 'coop1',
    });

    expect(app1.status).toBe('SUBMITTED');

    // Query application for coop2
    const app2 = await applicationRouter.createCaller(mockContext).getApplicationStatus({
      userId: testUserId,
      coopId: 'coop2',
    });

    expect(app2.status).toBe('SUBMITTED');
    expect(app1.applicationId).not.toBe(app2.applicationId);
  });

  it('should reject application for one coop without affecting other coops', async () => {
    const mockContext = {
      db,
      req: {} as any,
      res: {} as any,
      coopId: 'coop1',
      walletAddress: '0x1234567890123456789012345678901234567890',
    } as Context;

    // Submit applications to two coops
    const result = await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop1',
      firstName: 'Charlie',
      lastName: 'Brown',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    testUserId = result.userId;

    await applicationRouter.createCaller(mockContext).submitApplication({
      coopId: 'coop2',
      firstName: 'Charlie',
      lastName: 'Brown',
      email: testEmail,
      phone: '+1234567890',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    });

    // Reject coop1 application
    await applicationRouter.createCaller(mockContext).rejectApplication({
      userId: testUserId,
      coopId: 'coop1',
      reviewNotes: 'Not a good fit',
    });

    // Verify coop1 application is rejected
    const app1 = await db.application.findUnique({
      where: {
        userId_coopId: {
          userId: testUserId,
          coopId: 'coop1',
        },
      },
    });

    expect(app1?.status).toBe('REJECTED');

    // Verify coop2 application is still submitted
    const app2 = await db.application.findUnique({
      where: {
        userId_coopId: {
          userId: testUserId,
          coopId: 'coop2',
        },
      },
    });

    expect(app2?.status).toBe('SUBMITTED');

    // Verify rejection membership record created for coop1
    const membership1 = await db.userCoopMembership.findUnique({
      where: {
        userId_coopId: {
          userId: testUserId,
          coopId: 'coop1',
        },
      },
    });

    expect(membership1?.status).toBe('REJECTED');
  });
});
