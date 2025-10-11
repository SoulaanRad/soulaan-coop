import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { createContext } from "../context.js";
import { appRouter } from "../routers/index.js";

export const trpcExpress = createExpressMiddleware({
  router: appRouter,
  createContext: createContext,
  onError: ({ path, error }) => {
    console.error(`\n❌ tRPC Error on path: ${path}`);
    console.error(`Error name: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    console.error(`Full error:`, error);
    if (error.cause) {
      console.error(`Error cause:`, error.cause);
    }
    console.error('\n');
  },
});
