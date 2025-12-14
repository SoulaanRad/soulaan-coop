import { publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { userRouter } from "./user.js";
import { proposalRouter } from "./proposal.js";
import { healthRouter } from "./health.js";
import { applicationRouter } from "./application.js";
import { authRouter } from "./auth.js";
import { adminRouter } from "./admin";


export const appRouter = router({
  user: userRouter,
  proposal: proposalRouter,
  health: healthRouter,
  application: applicationRouter,
  auth: authRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
