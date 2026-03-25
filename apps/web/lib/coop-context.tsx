'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

interface CoopContextValue {
  coopId: string;
}

const CoopContext = createContext<CoopContextValue | null>(null);

export function CoopProvider({ coopId, children }: { coopId: string; children: ReactNode }) {
  return (
    <CoopContext.Provider value={{ coopId }}>
      {children}
    </CoopContext.Provider>
  );
}

export function useCoopContext() {
  const context = useContext(CoopContext);
  if (!context) {
    throw new Error('useCoopContext must be used within a CoopProvider');
  }
  return context;
}
