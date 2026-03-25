import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { db } from "@repo/db";

/**
 * Creates the context for tRPC by extracting the request and response objects from the Express context options.
 * Also extracts coopId from X-Coop-Id header if present.
 */
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  // Extract coopId from header (set by client or middleware)
  const coopId = req.headers['x-coop-id'] as string | undefined;
  
  return {
    db,
    req,
    res,
    coopId,
  };
};

export type Context = ReturnType<typeof createContext>;

/**
 * Authenticated context - includes walletAddress from the authenticated middleware
 */
export type AuthenticatedContext = Context & {
  walletAddress: string;
};

/**
 * Coop-scoped context - requires coopId to be present
 */
export type CoopScopedContext = Context & {
  coopId: string;
};
