-- Remove treasury plan columns (no longer needed; coop config drives these values)
ALTER TABLE "public"."Proposal" DROP COLUMN IF EXISTS "localPercent";
ALTER TABLE "public"."Proposal" DROP COLUMN IF EXISTS "nationalPercent";
ALTER TABLE "public"."Proposal" DROP COLUMN IF EXISTS "acceptUC";

-- Remove hardcoded impact metric columns (replaced by coop-config-driven mission_impact_scores in evaluation JSON)
ALTER TABLE "public"."Proposal" DROP COLUMN IF EXISTS "leakageReductionUSD";
ALTER TABLE "public"."Proposal" DROP COLUMN IF EXISTS "jobsCreated";
ALTER TABLE "public"."Proposal" DROP COLUMN IF EXISTS "timeHorizonMonths";
