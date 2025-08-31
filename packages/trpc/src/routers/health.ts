import { z } from "zod";
import { router } from "../trpc.js";
import { publicProcedure } from "../procedures/index.js";

export const healthRouter = router({
  /**
   * Health check endpoint - returns pong with 200 status
   */
  ping: publicProcedure
    .input(z.void())
    .output(z.object({
      status: z.string(),
      message: z.string(),
      timestamp: z.string()
    }))
    .query(() => {
      return {
        status: "ok",
        message: "pong",
        timestamp: new Date().toISOString()
      };
    }),
});
