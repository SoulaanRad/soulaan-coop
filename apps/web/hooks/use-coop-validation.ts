'use client';

import { useEffect, useState } from 'react';
import { env } from '@/env';

interface CoopValidationResult {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
  clientCoopId: string;
  serverCoopId: string | null;
}

/**
 * Validates that the web app's NEXT_PUBLIC_COOP_ID matches the API server's COOP_ID
 * This ensures the frontend and backend are configured for the same co-op
 */
export function useCoopValidation(): CoopValidationResult {
  const [serverCoopId, setServerCoopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const clientCoopId = env.NEXT_PUBLIC_COOP_ID;

  useEffect(() => {
    async function validateCoopId() {
      try {
        let apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        // Strip /trpc suffix if present since health endpoint is at root
        if (apiUrl.endsWith('/trpc')) {
          apiUrl = apiUrl.slice(0, -5);
        }
        
        const response = await fetch(`${apiUrl}/health`);
        
        if (!response.ok) {
          throw new Error(`API health check failed: ${response.status}`);
        }
        
        const data = await response.json();
        setServerCoopId(data.coopId);
        
        if (data.coopId !== clientCoopId) {
          setError(
            `Co-op ID mismatch! Web app is configured for "${clientCoopId}" but API server is configured for "${data.coopId}". ` +
            `Update NEXT_PUBLIC_COOP_ID in your .env.local file to match the API server's COOP_ID.`
          );
        }
      } catch (err: any) {
        setError(`Failed to validate co-op configuration: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    validateCoopId();
  }, [clientCoopId]);

  return {
    isValid: !error && serverCoopId === clientCoopId,
    isLoading,
    error,
    clientCoopId,
    serverCoopId,
  };
}
