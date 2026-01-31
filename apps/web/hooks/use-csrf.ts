'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing CSRF tokens
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch a CSRF token from the server
  const fetchCsrfToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/csrf');
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const data = await response.json();
      setCsrfToken(data.csrfToken);
      
      return data.csrfToken;
    } catch (err: any) {
      setError(err.message || 'Error fetching CSRF token');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch a token on mount
  useEffect(() => {
    fetchCsrfToken();
  }, [fetchCsrfToken]);

  // Create headers with CSRF token
  const createCsrfHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    return headers;
  }, [csrfToken]);

  // Fetch with CSRF token
  const fetchWithCsrf = useCallback(async (url: string, options: RequestInit = {}) => {
    // If no token, fetch one first
    if (!csrfToken) {
      const token = await fetchCsrfToken();
      if (!token) {
        throw new Error('Failed to get CSRF token');
      }
    }
    
    // Add CSRF token to headers
    const headers = {
      ...options.headers,
      'X-CSRF-Token': csrfToken!,
      'Content-Type': 'application/json',
    };
    
    // Make the request
    return fetch(url, {
      ...options,
      headers,
    });
  }, [csrfToken, fetchCsrfToken]);

  return {
    csrfToken,
    isLoading,
    error,
    fetchCsrfToken,
    createCsrfHeaders,
    fetchWithCsrf,
  };
}
