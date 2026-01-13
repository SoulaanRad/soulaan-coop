import { publicProcedure } from "../procedures/index.js";
import { router } from "../trpc.js";
import { userRouter } from "./user.js";
import { proposalRouter } from "./proposal.js";
import { healthRouter } from "./health.js";
import { applicationRouter } from "./application.js";
import { authRouter } from "./auth.js";
import { adminRouter } from "./admin";
import { adminAuthRouter } from "./admin-auth.js";
import { ucTransferRouter } from "./uc-transfer.js";
import { onrampRouter } from "./onramp.js";
import { ucAdminRouter } from "./uc-admin.js";


export const appRouter = router({
  user: userRouter,
  proposal: proposalRouter,
  health: healthRouter,
  application: applicationRouter,
  auth: authRouter,
  admin: adminRouter,
  adminAuth: adminAuthRouter,
  ucTransfer: ucTransferRouter,
  onramp: onrampRouter,
  ucAdmin: ucAdminRouter,
});

export type AppRouter = typeof appRouter;
