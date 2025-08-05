import { db } from '@repo/db';
import type {CreateExpressContextOptions} from "@trpc/server/adapters/express";

/**
 * Creates the context for tRPC by extracting the request and response objects from the Express context options.
 */
export const createContext = ({
  req,
  res,
}: CreateExpressContextOptions) => ({
  db, req, res
});

export type Context = ReturnType<typeof createContext>;
