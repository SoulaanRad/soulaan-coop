import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { secureStorage } from '@/lib/secure-storage';

interface User {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  status: string;
  walletAddress: string | null;
  phone: string | null;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(authenticated)';

    if (user && !inAuthGroup) {
      // User is logged in but not in authenticated routes, redirect to home
      router.replace('/(authenticated)/home');
    } else if (!user && inAuthGroup) {
      // User is not logged in but in authenticated routes, redirect to onboarding
      router.replace('/');
    }
  }, [user, segments, isLoading, router]);

  const loadSession = async () => {
    try {
      const userData = await secureStorage.getItem(secureStorage.keys.USER);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        // Convert createdAt string back to Date
        parsedUser.createdAt = new Date(parsedUser.createdAt);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      // Store user data securely
      await secureStorage.setItem(
        secureStorage.keys.USER,
        JSON.stringify(userData)
      );
      await secureStorage.setItem(
        secureStorage.keys.LOGIN_TIME,
        new Date().toISOString()
      );

      setUser(userData);
    } catch (error) {
      console.error('Error saving session:', error);
      throw new Error('Failed to save login session');
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process...');
      await secureStorage.clear();
      console.log('Secure storage cleared');
      setUser(null);
      console.log('User state cleared, should redirect to /');
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Failed to logout');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
