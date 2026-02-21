-- Migrate any existing DRAFT proposals to SUBMITTED
-- Runs in a separate transaction after enum values are committed
UPDATE "public"."Proposal" SET "status" = 'SUBMITTED' WHERE "status" = 'DRAFT';
