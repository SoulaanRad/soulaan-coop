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
  }
};