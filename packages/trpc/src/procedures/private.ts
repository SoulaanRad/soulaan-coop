import { TRPCError } from "@trpc/server";

import type { Context } from "../context.js";
import { t } from "../trpc.js";

const isAuthed = t.middleware(({ ctx, next }) => {
  // Explicitly type the context
  const context = ctx as Context;

  if (!context.req?.headers.authorization) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
    },
  });
});

export const privateProcedure = t.procedure.use(isAuthed);
