-- Insert the HYBRID_ARCHITECTURE_ENABLED feature flag (disabled by default)
INSERT INTO "public"."FeatureFlag" ("id", "key", "enabled", "description", "metadata", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'HYBRID_ARCHITECTURE_ENABLED',
  false,
  'Enable hybrid architecture with Stripe payments and SC rewards',
  '{"version": "1.0.0", "rollout": "controlled"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;