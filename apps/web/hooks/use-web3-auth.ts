'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  error: string | null;
  address: string | null;
}

export function useWeb3Auth() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    hasProfile: false,
    error: null,
    address: null,
  });
  
  // Check if the user is already authenticated
  const checkAuth = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.isLoggedIn) {
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          hasProfile: data.hasProfile,
          error: null,
          address: data.address,
        });
      } else {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          hasProfile: false,
          error: null,
          address: null,
        });
      }
    } catch (error) {
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        hasProfile: false,
        error: 'Failed to check authentication status',
        address: null,
      });
    }
  }, []);
  
  // Login with wallet
  const login = useCallback(async () => {
    if (!isConnected || !address) {
      setAuthState((prev) => ({
        ...prev,
        error: 'Wallet not connected',
      }));
      return;
    }
    
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      // Request a challenge
      const challengeResponse = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      
      if (!challengeResponse.ok) {
        throw new Error('Failed to get challenge');
      }
      
      const { message } = await challengeResponse.json();
      
      // Sign the challenge
      const signature = await signMessageAsync({ message });
      
      // Verify the signature
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message }),
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Failed to verify signature');
      }
      
      const { hasProfile } = await verifyResponse.json();
      
      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        hasProfile,
        error: null,
        address,
      });
      
      // Redirect based on profile status
      if (!hasProfile) {
        router.push('/admin/create-profile');
      } else {
        router.push('/admin');
      }
      
      return true;
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        hasProfile: false,
        error: error.message || 'Authentication failed',
      }));
      return false;
    }
  }, [address, isConnected, router, signMessageAsync]);
  
  // Logout
  const logout = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Disconnect wallet
      disconnect();
      
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        hasProfile: false,
        error: null,
        address: null,
      });
      
      router.push('/admin');
      
      return true;
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to logout',
      }));
      return false;
    }
  }, [disconnect, router]);
  
  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
}
