import { initTRPC } from "@trpc/server";
import SuperJson from "superjson";
import type { Context } from "./context.js";

export const t = initTRPC.context<Context>().create({
  transformer: SuperJson,
});

export const router = t.router;
export const procedure = t.procedure;

// Aliases for backwards compatibility
export const createTRPCRouter = t.router;
export const privateProcedure = t.procedure;
