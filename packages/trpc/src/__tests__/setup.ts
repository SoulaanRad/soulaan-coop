import { vi, beforeEach } from 'vitest';

// Set up test environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_webhook_secret';
process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars = 32 bytes

// Mock @repo/db
vi.mock('@repo/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Stripe SDK
vi.mock('stripe', () => {
  class MockStripe {
    customers = {
      list: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ id: 'cus_mock' }),
    };
    
    paymentIntents = {
      create: vi.fn().mockImplementation((params: any) => {
        // Validate amount
        if (!params.amount || params.amount <= 0) {
          throw new Error('Amount must be positive');
        }
        
        return Promise.resolve({
          id: 'pi_mock',
          client_secret: 'pi_mock_secret',
          status: 'requires_payment_method',
          amount: params.amount,
          currency: 'usd',
          metadata: params.metadata || {},
        });
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'pi_mock',
        status: 'succeeded',
        amount: 5000,
        currency: 'usd',
        metadata: {},
      }),
      confirm: vi.fn().mockResolvedValue({
        id: 'pi_mock',
        status: 'succeeded',
      }),
    };
    
    webhooks = {
      constructEvent: vi.fn().mockImplementation(() => {
        return {
          id: 'evt_mock',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_mock',
              status: 'succeeded',
              amount: 5000,
              metadata: { userId: 'test-user' },
            },
          },
        };
      }),
    };
  }

  return {
    default: MockStripe,
  };
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
