import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    SUPPORT_EMAIL: z.string().email().default("support@mail.cahootzcoops.com"),
    ORDER_ALERT_EMAIL: z.string().email().optional(),
    APP_URL: z.string().url().optional(),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "lint",
});
