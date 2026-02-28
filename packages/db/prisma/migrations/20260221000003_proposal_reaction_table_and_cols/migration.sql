-- Migration 2 of 2: Add ProposalReaction table and new columns
-- Depends on ReactionType enum created in previous migration

-- ProposalReaction table
CREATE TABLE "public"."ProposalReaction" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "voterWallet" TEXT NOT NULL,
  "reaction" "public"."ReactionType" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ProposalReaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProposalReaction_proposalId_voterWallet_key" UNIQUE ("proposalId", "voterWallet"),
  CONSTRAINT "ProposalReaction_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE
);

CREATE INDEX "ProposalReaction_proposalId_idx" ON "public"."ProposalReaction"("proposalId");

-- Proposal — new governance columns
ALTER TABLE "public"."Proposal"
  ADD COLUMN IF NOT EXISTS "councilRequired" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "withdrawnAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "withdrawnBy" TEXT;

-- CoopConfig — council vote threshold
ALTER TABLE "public"."CoopConfig"
  ADD COLUMN IF NOT EXISTS "councilVoteThresholdUSD" DOUBLE PRECISION NOT NULL DEFAULT 5000;
