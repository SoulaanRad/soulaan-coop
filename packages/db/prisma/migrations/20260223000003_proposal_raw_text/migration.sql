-- Add rawText column to Proposal for edit/resubmit flow
ALTER TABLE "public"."Proposal" ADD COLUMN "rawText" TEXT;
