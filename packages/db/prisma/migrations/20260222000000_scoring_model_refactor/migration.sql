-- Migration: Scoring Model Refactor
-- Replaces goalDefinitions/scoringWeights on CoopConfig with
-- missionGoals/structuralWeights/scoreMix/screeningPassThreshold.
-- Replaces alignmentScore/feasibilityScore/compositeScore/goalScores on Proposal
-- with evaluation JSON + charterVersionId.

-- ── CoopConfig: add new columns ───────────────────────────────────────────────

ALTER TABLE "public"."CoopConfig"
  ADD COLUMN IF NOT EXISTS "missionGoals" JSONB,
  ADD COLUMN IF NOT EXISTS "structuralWeights" JSONB,
  ADD COLUMN IF NOT EXISTS "scoreMix" JSONB,
  ADD COLUMN IF NOT EXISTS "screeningPassThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6;

-- Backfill missionGoals from goalDefinitions (rename weight -> priorityWeight)
UPDATE "public"."CoopConfig"
SET "missionGoals" = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'key',           g->>'key',
      'label',         g->>'label',
      'priorityWeight', (g->>'weight')::float,
      'description',   g->>'description'
    )
  )
  FROM jsonb_array_elements("goalDefinitions") AS g
)
WHERE "goalDefinitions" IS NOT NULL
  AND jsonb_typeof("goalDefinitions") = 'array';

-- Default missionGoals for configs that had null/invalid goalDefinitions
UPDATE "public"."CoopConfig"
SET "missionGoals" = '[
  {"key":"income_stability","label":"Income Stability","priorityWeight":0.35},
  {"key":"asset_creation","label":"Asset Creation","priorityWeight":0.25},
  {"key":"leakage_reduction","label":"Leakage Reduction","priorityWeight":0.20},
  {"key":"export_expansion","label":"Export Expansion","priorityWeight":0.20}
]'::jsonb
WHERE "missionGoals" IS NULL;

-- Default structuralWeights for all existing configs
UPDATE "public"."CoopConfig"
SET "structuralWeights" = '{"feasibility":0.40,"risk":0.35,"accountability":0.25}'::jsonb
WHERE "structuralWeights" IS NULL;

-- Default scoreMix for all existing configs (60% mission, 40% structural)
UPDATE "public"."CoopConfig"
SET "scoreMix" = '{"missionWeight":0.6,"structuralWeight":0.4}'::jsonb
WHERE "scoreMix" IS NULL;

-- Make columns NOT NULL now that backfill is complete
ALTER TABLE "public"."CoopConfig"
  ALTER COLUMN "missionGoals" SET NOT NULL,
  ALTER COLUMN "structuralWeights" SET NOT NULL,
  ALTER COLUMN "scoreMix" SET NOT NULL;

-- Drop old columns
ALTER TABLE "public"."CoopConfig"
  DROP COLUMN IF EXISTS "goalDefinitions",
  DROP COLUMN IF EXISTS "scoringWeights";

-- ── Proposal: add new columns ─────────────────────────────────────────────────

ALTER TABLE "public"."Proposal"
  ADD COLUMN IF NOT EXISTS "evaluation" JSONB,
  ADD COLUMN IF NOT EXISTS "charterVersionId" TEXT;

-- Backfill evaluation from old score columns
UPDATE "public"."Proposal"
SET "evaluation" = jsonb_build_object(
  'structural_scores', jsonb_build_object(
    'goal_mapping_valid', true,
    'feasibility_score',  COALESCE("feasibilityScore", 0.5),
    'risk_score',         0.5,
    'accountability_score', 0.5
  ),
  'mission_impact_scores', COALESCE("goalScores", '[]'::jsonb),
  'computed_scores', jsonb_build_object(
    'mission_weighted_score',    COALESCE("alignmentScore", 0.5),
    'structural_weighted_score', COALESCE("feasibilityScore", 0.5),
    'overall_score',             COALESCE("compositeScore", 0.5),
    'passes_threshold',          COALESCE("compositeScore", 0) >= 0.6
  ),
  'violations', '[]'::jsonb,
  'risk_flags', '[]'::jsonb,
  'llm_summary', 'Backfilled from v0.2 scores'
)
WHERE "evaluation" IS NULL;

-- Drop old score columns
ALTER TABLE "public"."Proposal"
  DROP COLUMN IF EXISTS "alignmentScore",
  DROP COLUMN IF EXISTS "feasibilityScore",
  DROP COLUMN IF EXISTS "compositeScore",
  DROP COLUMN IF EXISTS "goalScores";
