import { initTRPC } from "@trpc/server";
import type { Context } from "./context.js";

export const t = initTRPC.context<Context>().create({
  // Removed SuperJSON transformer - using plain JSON for simplicity
  // transformer: SuperJson,
});

export const router = t.router;
export const procedure = t.procedure;

// Aliases for backwards compatibility
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const privateProcedure = t.procedure;
