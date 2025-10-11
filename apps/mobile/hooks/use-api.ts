import { useState } from 'react';
import { api } from '@/lib/api';
import type { ApplicationData, LoginData } from '@/lib/api';

// Hook for application submission
export function useSubmitApplication() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitApplication = async (data: ApplicationData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.submitApplication(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Application submission failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitApplication,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for login
export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.login(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for checking login status
export function useCheckLoginStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLoginStatus = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.checkLoginStatus(email);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Status check failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    checkLoginStatus,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for getting application status
export function useApplicationStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApplicationStatus = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.getApplicationStatus(userId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get application status';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getApplicationStatus,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for getting application data
export function useApplicationData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApplicationData = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.getApplicationData(userId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get application data';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getApplicationData,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

