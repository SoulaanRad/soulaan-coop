'use client';

import { useCoopValidation } from '@/hooks/use-coop-validation';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Banner that displays a warning if the web app's COOP_ID doesn't match the API server's COOP_ID
 */
export function CoopValidationBanner() {
  const { isValid, isLoading, error, clientCoopId, serverCoopId } = useCoopValidation();

  if (isLoading) {
    return (
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Validating co-op configuration...</span>
        </div>
      </div>
    );
  }

  if (!isValid && error) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400 mb-1">
                Co-op Configuration Mismatch
              </p>
              <p className="text-sm text-red-300/80">
                {error}
              </p>
              <div className="mt-2 text-xs text-red-300/60 font-mono">
                Web App: {clientCoopId} | API Server: {serverCoopId || 'unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
