-- AddColumn: aiAutoApproveThresholdUSD on CoopConfig
-- Below this amount → AI can auto-approve (if passes screening)
-- Between this and councilVoteThresholdUSD → council votes
-- Above councilVoteThresholdUSD → full coop vote
ALTER TABLE "public"."CoopConfig" ADD COLUMN "aiAutoApproveThresholdUSD" DOUBLE PRECISION NOT NULL DEFAULT 500;
