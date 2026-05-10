import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    RESEND_API_KEY: z.string().startsWith("re_").optional(),

  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "lint",
});
