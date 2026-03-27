'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  activeCoopId: string | null;
  isAdmin: boolean;
  adminRole: string | null;
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
    activeCoopId: null,
    isAdmin: false,
    adminRole: null,
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
          activeCoopId: data.activeCoopId || null,
          isAdmin: data.isAdmin || false,
          adminRole: data.adminRole || null,
          error: null,
          address: data.address,
        });
      } else {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          hasProfile: false,
          activeCoopId: null,
          isAdmin: false,
          adminRole: null,
          error: null,
          address: null,
        });
      }
    } catch (_error) {
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        hasProfile: false,
        activeCoopId: null,
        isAdmin: false,
        adminRole: null,
        error: 'Failed to check authentication status',
        address: null,
      });
    }
  }, []);
  
  // Login with wallet
  const login = useCallback(async (coopId?: string) => {
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
      
      // Verify the signature with coopId
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message, coopId }),
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Failed to verify signature');
      }
      
      const { hasProfile, activeCoopId, isAdmin, adminRole } = await verifyResponse.json();

      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        hasProfile,
        activeCoopId: activeCoopId || null,
        isAdmin: isAdmin || false,
        adminRole: adminRole || null,
        error: null,
        address,
      });
      
      // Redirect based on profile status
      const targetCoopId = activeCoopId || coopId || 'soulaan';
      if (!hasProfile) {
        router.push(`/portal/${targetCoopId}/create-profile`);
      } else {
        router.push(`/portal/${targetCoopId}`);
      }
      
      return true;
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        hasProfile: false,
        activeCoopId: null,
        isAdmin: false,
        adminRole: null,
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
        activeCoopId: null,
        isAdmin: false,
        adminRole: null,
        error: null,
        address: null,
      });

      router.push('/login');

      return true;
    } catch (_error) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        activeCoopId: null,
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
