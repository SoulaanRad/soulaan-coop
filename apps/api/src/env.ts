import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3001),
    APP_URL: z.string().url(),
    PINATA_JWT: z.string().min(1),
    WALLET_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
    BACKEND_WALLET_PRIVATE_KEY: z.string().regex(/^(0x)?[a-fA-F0-9]{64}$/),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
    RPC_URL: z.string().url().default("https://sepolia.base.org"),
    BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
    UNITY_COIN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    SOULAANI_COIN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    REDEMPTION_VAULT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    MOCK_USDC_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    VERIFIED_STORE_REGISTRY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    SC_REWARD_ENGINE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    STORE_PAYMENT_ROUTER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    HOOKDECK_SIGNATURE_KEY: z.string().optional(),
    USE_HOOKDECK: z.enum(["true", "false"]).optional(),
    OPENAI_API_KEY: z.string().optional(),
    PAYPAL_WEBHOOK_ID: z.string().optional(),
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_CLIENT_SECRET: z.string().optional(),
    SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.npm_lifecycle_event === "lint",
});

console.log("✅ API environment variables validated successfully");
