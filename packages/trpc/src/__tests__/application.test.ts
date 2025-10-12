import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appRouter } from '../routers/index.js';
import type { Context } from '../context.js';

// Mock Prisma client
const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  application: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('Application Router - submitApplication', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockContext: Context = {
      db: mockPrismaClient as any,
      req: {} as any,
      res: {} as any,
    };
    
    caller = appRouter.createCaller(mockContext);
  });

  it('should successfully submit a valid application', async () => {
    // Arrange - Mock that user doesn't exist
    mockPrismaClient.user.findUnique.mockResolvedValue(null);
    
    // Mock transaction to return created user and application
    mockPrismaClient.$transaction.mockImplementation(async (callback) => {
      return callback({
        user: {
          create: vi.fn().mockResolvedValue({
            id: 'user_123',
            email: 'deon@appi.com',
            name: 'Deon Robinson',
            phone: '4159363880',
            role: 'user',
            status: 'PENDING',
          }),
        },
        application: {
          create: vi.fn().mockResolvedValue({
            id: 'app_456',
            userId: 'user_123',
            status: 'SUBMITTED',
            data: {},
            createdAt: new Date(),
          }),
        },
      });
    });

    const validApplicationData = {
      firstName: 'Deon',
      lastName: 'Robinson',
      email: 'deon@appi.com',
      phone: '4159363880',
      password: 'Radzell1',
      confirmPassword: 'Radzell1',
      identity: 'black-american' as const,
      agreeToMission: 'yes' as const,
      spendingCategories: ['Retail/Shopping'],
      monthlyCommitment: '500-1000' as const,
      useUC: 'yes' as const,
      acceptFees: 'yes' as const,
      voteOnInvestments: 'yes' as const,
      coopExperience: 'yes' as const,
      transparentTransactions: 'yes' as const,
      motivation: '',
      desiredService: '',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    // Act
    const result = await caller.application.submitApplication(validApplicationData);

    // Assert
    expect(result).toEqual({
      success: true,
      message: 'Application submitted successfully. You will be notified once your application is reviewed.',
      applicationId: 'app_456',
      userId: 'user_123',
    });
    
    expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'deon@appi.com' },
    });
    
    expect(mockPrismaClient.$transaction).toHaveBeenCalled();
  });

  it('should reject application if email already exists', async () => {
    // Arrange - Mock that user already exists
    mockPrismaClient.user.findUnique.mockResolvedValue({
      id: 'existing_user',
      email: 'deon@appi.com',
    });

    const applicationData = {
      firstName: 'Deon',
      lastName: 'Robinson',
      email: 'deon@appi.com',
      phone: '4159363880',
      password: 'Radzell1',
      confirmPassword: 'Radzell1',
      identity: 'black-american' as const,
      agreeToMission: 'yes' as const,
      spendingCategories: ['Retail/Shopping'],
      monthlyCommitment: '500-1000' as const,
      useUC: 'yes' as const,
      acceptFees: 'yes' as const,
      voteOnInvestments: 'yes' as const,
      coopExperience: 'yes' as const,
      transparentTransactions: 'yes' as const,
      motivation: '',
      desiredService: '',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    // Act & Assert
    await expect(
      caller.application.submitApplication(applicationData)
    ).rejects.toThrow('An account with this email already exists');
    
    expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('should reject application with mismatched passwords', async () => {
    const applicationData = {
      firstName: 'Deon',
      lastName: 'Robinson',
      email: 'deon@appi.com',
      phone: '4159363880',
      password: 'Radzell1',
      confirmPassword: 'DifferentPassword',
      identity: 'black-american' as const,
      agreeToMission: 'yes' as const,
      spendingCategories: ['Retail/Shopping'],
      monthlyCommitment: '500-1000' as const,
      useUC: 'yes' as const,
      acceptFees: 'yes' as const,
      voteOnInvestments: 'yes' as const,
      coopExperience: 'yes' as const,
      transparentTransactions: 'yes' as const,
      motivation: '',
      desiredService: '',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    // Act & Assert
    await expect(
      caller.application.submitApplication(applicationData)
    ).rejects.toThrow();
  });

  it('should reject application with invalid email', async () => {
    const applicationData = {
      firstName: 'Deon',
      lastName: 'Robinson',
      email: 'invalid-email',
      phone: '4159363880',
      password: 'Radzell1',
      confirmPassword: 'Radzell1',
      identity: 'black-american' as const,
      agreeToMission: 'yes' as const,
      spendingCategories: ['Retail/Shopping'],
      monthlyCommitment: '500-1000' as const,
      useUC: 'yes' as const,
      acceptFees: 'yes' as const,
      voteOnInvestments: 'yes' as const,
      coopExperience: 'yes' as const,
      transparentTransactions: 'yes' as const,
      motivation: '',
      desiredService: '',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    // Act & Assert
    await expect(
      caller.application.submitApplication(applicationData)
    ).rejects.toThrow();
  });

  it('should reject application with short password', async () => {
    const applicationData = {
      firstName: 'Deon',
      lastName: 'Robinson',
      email: 'deon@appi.com',
      phone: '4159363880',
      password: 'short',
      confirmPassword: 'short',
      identity: 'black-american' as const,
      agreeToMission: 'yes' as const,
      spendingCategories: ['Retail/Shopping'],
      monthlyCommitment: '500-1000' as const,
      useUC: 'yes' as const,
      acceptFees: 'yes' as const,
      voteOnInvestments: 'yes' as const,
      coopExperience: 'yes' as const,
      transparentTransactions: 'yes' as const,
      motivation: '',
      desiredService: '',
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    // Act & Assert
    await expect(
      caller.application.submitApplication(applicationData)
    ).rejects.toThrow();
  });

  it('should accept optional fields as empty strings', async () => {
    // Arrange
    mockPrismaClient.user.findUnique.mockResolvedValue(null);
    mockPrismaClient.$transaction.mockImplementation(async (callback) => {
      return callback({
        user: {
          create: vi.fn().mockResolvedValue({
            id: 'user_123',
            email: 'deon@appi.com',
          }),
        },
        application: {
          create: vi.fn().mockResolvedValue({
            id: 'app_456',
            userId: 'user_123',
          }),
        },
      });
    });

    const applicationData = {
      firstName: 'Deon',
      lastName: 'Robinson',
      email: 'deon@appi.com',
      phone: '4159363880',
      password: 'Radzell1',
      confirmPassword: 'Radzell1',
      identity: 'black-american' as const,
      agreeToMission: 'yes' as const,
      spendingCategories: ['Retail/Shopping'],
      monthlyCommitment: '500-1000' as const,
      useUC: 'yes' as const,
      acceptFees: 'yes' as const,
      voteOnInvestments: 'yes' as const,
      coopExperience: 'yes' as const,
      transparentTransactions: 'yes' as const,
      motivation: '', // Empty optional field
      desiredService: '', // Empty optional field
      agreeToCoopValues: true,
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    // Act
    const result = await caller.application.submitApplication(applicationData);

    // Assert
    expect(result.success).toBe(true);
  });
});

