import { initTRPC } from "@trpc/server";

// Use require for superjson to avoid ESM/CJS issues
const SuperJson = require("superjson");

export const t = initTRPC.context<{}>().create({
  transformer: SuperJson,
});

export const router = t.router;
export const procedure = t.procedure;
