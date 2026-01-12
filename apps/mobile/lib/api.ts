// Expo-compatible API client for Soulaan co-op application
// Uses native fetch API - no additional dependencies required

import { getApiUrl, networkConfig } from './config';

// API configuration
export const API_BASE_URL = getApiUrl();

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
      body: JSON.stringify({
        json: data
      })
    });

    // Always parse the response body, even for error responses
    const result = await response.json();
    
    console.log('📥 Raw API response:', JSON.stringify(result, null, 2));
    console.log('📥 Response status:', response.status);
    console.log('📥 Has error?', !!result.error);
    if (result.error) {
      console.log('📥 Error object:', JSON.stringify(result.error, null, 2));
      console.log('📥 Error message from json:', result.error.json?.message);
    }
    
    // Check if there's a tRPC error in the response
    // tRPC wraps errors in error.json.message (same as success responses)
    if (result.error) {
      const errorMessage = result.error.json?.message || result.error.message || result.error.data?.message || 'Application submission failed';
      console.log('📥 Throwing error with message:', errorMessage);
      throw new Error(errorMessage);
    }

    // If HTTP status is not OK but no error in JSON, throw generic error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // tRPC wraps the response in result.data.json
    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: data
      })
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
    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { email }
      })
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
    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { userId }
      })
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
    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { userId }
      })
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
    return result.result?.data?.json || result.result?.data;
  },

  // ──────────────────────────────────────────────────────────
  // UNITY COIN (UC) WALLET & TRANSFER FUNCTIONS
  // ──────────────────────────────────────────────────────────

  /**
   * Get wallet info for a user
   */
  async getWalletInfo(userId: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/user.getWalletInfo`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({
        json: { userId }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get wallet info');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { walletAddress }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get balance');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { walletAddress, limit }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get transfer history');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { recipientAddress }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to validate recipient');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { username }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'User not found');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
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
      body: JSON.stringify({
        json: { userId, recipientAddress, amount }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Transfer failed');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
  },

  /**
   * Get available payment processors for onramp
   */
  async getAvailableProcessors() {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.getAvailableProcessors`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({
        json: {}
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get processors');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
  },

  /**
   * Create payment intent for buying UC
   */
  async createPaymentIntent(amountUSD: number, processor?: 'stripe' | 'paypal' | 'square') {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.createPaymentIntent`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({
        json: { amountUSD, processor }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to create payment intent');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
  },

  /**
   * Get onramp transaction history
   */
  async getOnrampHistory(limit = 50, offset = 0) {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.getOnrampHistory`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({
        json: { limit, offset }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get onramp history');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
  },

  /**
   * Get onramp transaction status
   */
  async getOnrampStatus(transactionId: string) {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.getOnrampStatus`, {
      method: 'POST',
      headers: {
        ...networkConfig.defaultHeaders,
      },
      body: JSON.stringify({
        json: { transactionId }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to get transaction status');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return result.result?.data?.json || result.result?.data;
  },
};