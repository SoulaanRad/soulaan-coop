import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { createContext } from "../context";
import { appRouter } from "../routers";

export const trpcExpress = createExpressMiddleware({
  router: appRouter,
  createContext: createContext,
});
