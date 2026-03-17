import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  server: {},
  client: {
    EXPO_PUBLIC_API_BASE_URL: z.string().url(),
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.npm_lifecycle_event === "lint",
});

void env;
