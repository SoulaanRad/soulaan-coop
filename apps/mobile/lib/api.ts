// Expo-compatible API client for Soulaan co-op application
// Uses native fetch API - no additional dependencies required

import { getApiUrl, networkConfig } from './config';

// API configuration
export const API_BASE_URL = getApiUrl();

/**
 * Helper to create headers with optional wallet address
 * Used for authenticated requests that require wallet verification
 */
export function createApiHeaders(walletAddress?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    ...networkConfig.defaultHeaders,
  };

  // Add wallet address header if provided (for privateProcedure endpoints)
  if (walletAddress) {
    headers['x-wallet-address'] = walletAddress;
  }

  return headers;
}

// Application submission types
export interface ApplicationData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  
  // Identity & Eligibility
  identity: 'black-american' | 'afro-caribbean' | 'african-immigrant' | 'ally';
  agreeToMission: 'yes' | 'no';
  
  // Spending Habits & Demand
  spendingCategories: string[];
  monthlyCommitment: 'less-250' | '250-500' | '500-1000' | 'over-1000';
  
  // Commitment & Participation
  useUC: 'yes' | 'no';
  acceptFees: 'yes' | 'no';
  voteOnInvestments: 'yes' | 'no';
  
  // Trust & Accountability
  coopExperience: 'yes' | 'no';
  transparentTransactions: 'yes' | 'no';
  
  // Short Answer (optional)
  motivation?: string;
  desiredService?: string;

  // Media Uploads (optional)
  videoCID?: string;
  photoCID?: string;

  // Terms Agreement
  agreeToCoopValues: boolean;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

// Helper functions for API calls
export const api = {
  /**
   * Submit a new application to join the Soulaan co-op
   */
  async submitApplication(data: ApplicationData) {
    const response = await fetch(`${API_BASE_URL}/trpc/application.submitApplication`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify(data)
    });

    // Always parse the response body, even for error responses
    const result = await response.json();

    console.log('📥 Raw API response:', JSON.stringify(result, null, 2));
    console.log('📥 Response status:', response.status);
    console.log('📥 Has error?', !!result.error);
    if (result.error) {
      console.log('📥 Error object:', JSON.stringify(result.error, null, 2));
      console.log('📥 Error message:', result.error.message);
    }

    // Check if there's a tRPC error in the response
    if (result.error) {
      const errorMessage = result.error.message || result.error.data?.message || 'Application submission failed';
      console.log('📥 Throwing error with message:', errorMessage);
      throw new Error(errorMessage);
    }

    // If HTTP status is not OK but no error in JSON, throw generic error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // tRPC wraps the response in result.data
    return result.result?.data;
  },

  /**
   * Login with email and password
   */
  async login(data: LoginData) {
    const response = await fetch(`${API_BASE_URL}/trpc/auth.login`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify(data)
    });

    // Always parse the response body, even for error responses
    const result = await response.json();
    
    // Check if there's a tRPC error in the response
    if (result.error) {
      throw new Error(result.error.message || 'Login failed');
    }

    // If HTTP status is not OK but no error in JSON, throw generic error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // tRPC wraps the response in result.data.json
    return result.result?.data;
  },

  /**
   * Check if user can login (status check)
   */
  async checkLoginStatus(email: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/auth.checkLoginStatus`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ email })
    });

    // Always parse the response body, even for error responses
    const result = await response.json();
    
    // Check if there's a tRPC error in the response
    if (result.error) {
      throw new Error(result.error.message || 'Status check failed');
    }

    // If HTTP status is not OK but no error in JSON, throw generic error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // tRPC wraps the response in result.data.json
    return result.result?.data;
  },

  /**
   * Get application status
   */
  async getApplicationStatus(userId: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/application.getApplicationStatus`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ userId })
    });

    // Always parse the response body, even for error responses
    const result = await response.json();
    
    // Check if there's a tRPC error in the response
    if (result.error) {
      throw new Error(result.error.message || 'Status check failed');
    }

    // If HTTP status is not OK but no error in JSON, throw generic error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // tRPC wraps the response in result.data.json
    return result.result?.data;
  },

  /**
   * Get full application data (for admin/review purposes)
   */
  async getApplicationData(userId: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/application.getApplicationData`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ userId })
    });

    // Always parse the response body, even for error responses
    const result = await response.json();

    // Check if there's a tRPC error in the response
    if (result.error) {
      throw new Error(result.error.message || 'Data retrieval failed');
    }

    // If HTTP status is not OK but no error in JSON, throw generic error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // tRPC wraps the response in result.data.json
    return result.result?.data;
  },

  /**
   * Refresh user data from the server
   * Used to get updated user info including wallet address
   */
  async refreshUser(userId: string, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId }));
    const response = await fetch(`${API_BASE_URL}/trpc/user.getMe?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to refresh user');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  // ──────────────────────────────────────────────────────────
  // UNITY COIN (UC) WALLET & TRANSFER FUNCTIONS
  // ──────────────────────────────────────────────────────────

  /**
   * Get wallet info for a user
   */
  async getWalletInfo(userId: string, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId }));
    const response = await fetch(`${API_BASE_URL}/trpc/user.getWalletInfo?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get wallet info');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Create a wallet for a user
   */
  async createWallet(userId: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/user.createWallet`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ userId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to create wallet');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get UC balance for a wallet
   */
  async getUCBalance(walletAddress: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/ucTransfer.getBalance`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ walletAddress })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get balance');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get transfer history for a wallet
   */
  async getTransferHistory(walletAddress: string, limit = 50) {
    const response = await fetch(`${API_BASE_URL}/trpc/ucTransfer.getTransferHistory`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ walletAddress, limit })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get transfer history');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Validate a recipient address for transfers
   */
  async validateRecipient(recipientAddress: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/ucTransfer.validateRecipient`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ recipientAddress })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to validate recipient');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Find user by username for transfers
   */
  async getUserByUsername(username: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/ucTransfer.getUserByUsername`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ username })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'User not found');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Execute a UC transfer
   */
  async executeTransfer(userId: string, recipientAddress: string, amount: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/ucTransfer.executeTransfer`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({ userId, recipientAddress, amount })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Transfer failed');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get available payment processors for onramp
   * @param walletAddress - User's wallet address for authentication
   */
  async getAvailableProcessors(walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.getAvailableProcessors`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({})
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get processors');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Create payment intent for buying UC
   * @param walletAddress - User's wallet address for authentication
   */
  async createPaymentIntent(
    amountUSD: number, 
    walletAddress: string | null,
    processor?: 'stripe' | 'paypal' | 'square'
  ) {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.createPaymentIntent`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ amountUSD, processor })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to create payment intent');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get onramp transaction history
   * @param walletAddress - User's wallet address for authentication
   */
  async getOnrampHistory(walletAddress: string | null, limit = 50, offset = 0) {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.getOnrampHistory`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ limit, offset })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get onramp history');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get onramp transaction status
   * @param walletAddress - User's wallet address for authentication
   */
  async getOnrampStatus(transactionId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.getOnrampStatus`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ transactionId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get transaction status');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  // ──────────────────────────────────────────────────────────
  // P2P PAYMENT FUNCTIONS
  // ──────────────────────────────────────────────────────────

  /**
   * Get user's balance in USD
   */
  async getUSDBalance(userId: string, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId }));
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.getBalance?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get balance');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Send payment to another user (Soulaan user or non-user via phone)
   */
  async sendPayment(
    userId: string,
    recipient: string,
    recipientType: 'username' | 'phone' | 'userId',
    amount: number,
    note?: string,
    walletAddress?: string | null
  ) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.sendPayment`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, recipient, recipientType, amount, note })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Payment failed');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Look up a recipient by username or phone
   */
  async lookupRecipient(
    query: string,
    type: 'username' | 'phone',
    walletAddress?: string | null
  ) {
    const input = encodeURIComponent(JSON.stringify({ query, type }));
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.lookupRecipient?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Lookup failed');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get P2P payment history
   */
  async getP2PHistory(userId: string, limit = 50, offset = 0, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId, limit, offset }));
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.getHistory?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get history');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(userId: string, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId }));
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.getPaymentMethods?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get payment methods');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Create SetupIntent for adding a new card
   */
  async createSetupIntent(userId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.createSetupIntent`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to create setup intent');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Save payment method after SetupIntent succeeds
   */
  async savePaymentMethod(userId: string, paymentMethodId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.savePaymentMethod`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, paymentMethodId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to save payment method');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Remove a payment method
   */
  async removePaymentMethod(userId: string, paymentMethodId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.removePaymentMethod`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, paymentMethodId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to remove payment method');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.setDefaultPaymentMethod`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, paymentMethodId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to set default payment method');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get notifications
   */
  async getNotifications(userId: string, unreadOnly = false, limit = 20, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId, unreadOnly, limit }));
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.getNotifications?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get notifications');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.markNotificationRead`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ notificationId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to mark notification as read');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.markAllNotificationsRead`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to mark notifications as read');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  // ──────────────────────────────────────────────────────────
  // BANK ACCOUNTS
  // ──────────────────────────────────────────────────────────

  /**
   * Get saved bank accounts
   */
  async getBankAccounts(userId: string, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId }));
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.getBankAccounts?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get bank accounts');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Add a new bank account
   */
  async addBankAccount(
    userId: string,
    accountHolderName: string,
    routingNumber: string,
    accountNumber: string,
    bankName?: string,
    walletAddress?: string | null
  ) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.addBankAccount`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, accountHolderName, routingNumber, accountNumber, bankName })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to add bank account');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Remove a bank account
   */
  async removeBankAccount(userId: string, bankAccountId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.removeBankAccount`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, bankAccountId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to remove bank account');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Set default bank account
   */
  async setDefaultBankAccount(userId: string, bankAccountId: string, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.setDefaultBankAccount`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, bankAccountId })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to set default bank account');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  // ──────────────────────────────────────────────────────────
  // WITHDRAWALS
  // ──────────────────────────────────────────────────────────

  /**
   * Withdraw funds to bank account
   */
  async withdraw(userId: string, bankAccountId: string, amountUSD: number, walletAddress?: string | null) {
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.withdraw`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),
      body: JSON.stringify({ userId, bankAccountId, amountUSD })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to process withdrawal');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },

  /**
   * Get withdrawal history
   */
  async getWithdrawals(userId: string, limit = 20, offset = 0, walletAddress?: string | null) {
    const input = encodeURIComponent(JSON.stringify({ userId, limit, offset }));
    const response = await fetch(`${API_BASE_URL}/trpc/p2p.getWithdrawals?input=${input}`, {
      method: 'GET',
      headers: createApiHeaders(walletAddress),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get withdrawals');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data;
  },
};