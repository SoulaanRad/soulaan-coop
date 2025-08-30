import { z } from "zod";

import { Context } from "../context.js";
import { privateProcedure, publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";

export const userRouter = router({
  // Public procedures
  getAllUsers: publicProcedure.query(({ ctx }) => {
    const context = ctx as Context;
    return context.db.user.findMany();
  }),

  // Private procedures (require authentication)
  me: privateProcedure.query(({ ctx }) => {
    // Get the current user based on auth context
    // In a real app, you'd get the user ID from the auth token
    // For demo purposes, using a hardcoded ID:
    // const userId = "current-user-id";
    // return ctx.db.user.findUnique({
    //   where: { id: userId }
    // });
  }),
});
