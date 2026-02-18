import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { db } from "@repo/db";

/**
 * Creates the context for tRPC by extracting the request and response objects from the Express context options.
 */
export const createContext = ({ req, res }: CreateExpressContextOptions) => ({
  db,
  req,
  res,
});

export type Context = ReturnType<typeof createContext>;

/**
 * Authenticated context - includes walletAddress from the authenticated middleware
 */
export type AuthenticatedContext = Context & {
  walletAddress: string;
};
