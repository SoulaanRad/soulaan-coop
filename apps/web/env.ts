import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SLACK_WEBHOOK_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(32).optional(),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_CHAIN_ID: z.string().optional(),
    NEXT_PUBLIC_CHAIN_NAME: z.string().optional(),
    NEXT_PUBLIC_RPC_URL: z.string().url().optional(),
    NEXT_PUBLIC_SOULAANI_COIN_ADDRESS: z.string().optional(),
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().optional(),
    NEXT_PUBLIC_DOMAIN: z.string().optional(),
    NEXT_PUBLIC_URI: z.string().url().optional(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_SOULAANI_COIN_ADDRESS: process.env.NEXT_PUBLIC_SOULAANI_COIN_ADDRESS,
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
    NEXT_PUBLIC_URI: process.env.NEXT_PUBLIC_URI,
  },
  emptyStringAsUndefined: true,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
