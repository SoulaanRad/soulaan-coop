-- Add SUBMITTED and FAILED to ProposalStatus enum
-- Note: ADD VALUE cannot be used in the same transaction as DML using the new value.
-- The data migration (DRAFT → SUBMITTED) is handled in the next migration.
ALTER TYPE "public"."ProposalStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "public"."ProposalStatus" ADD VALUE IF NOT EXISTS 'FAILED';
