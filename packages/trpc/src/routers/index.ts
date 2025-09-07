import { publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { userRouter } from "./user.js";
import { proposalRouter } from "./proposal.js";
import { healthRouter } from "./health.js";



export const appRouter = router({
  user: userRouter,
  proposal: proposalRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
