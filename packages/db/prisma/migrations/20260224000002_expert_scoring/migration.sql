-- Add scorerAgents column to CoopConfig (config-driven agent registry)
ALTER TABLE "public"."CoopConfig" ADD COLUMN IF NOT EXISTS "scorerAgents" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Expert domain assignments (many-to-many: one wallet can own multiple domains)
CREATE TABLE "public"."ExpertAssignment" (
    "id"            TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "domain"        TEXT NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "assignedBy"    TEXT NOT NULL,
    "assignedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpertAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExpertAssignment_walletAddress_domain_key" ON "public"."ExpertAssignment"("walletAddress", "domain");
CREATE INDEX "ExpertAssignment_domain_isActive_idx" ON "public"."ExpertAssignment"("domain", "isActive");

-- Per-goal AI + expert scores per proposal revision
CREATE TABLE "public"."ProposalGoalScore" (
    "id"             TEXT NOT NULL,
    "proposalId"     TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "goalId"         TEXT NOT NULL,
    "domain"         TEXT NOT NULL,
    "aiScore"        DOUBLE PRECISION NOT NULL,
    "expertScore"    DOUBLE PRECISION,
    "finalScore"     DOUBLE PRECISION NOT NULL,
    "expertWallet"   TEXT,
    "expertReason"   TEXT,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProposalGoalScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProposalGoalScore_proposalId_revisionNumber_goalId_key"
    ON "public"."ProposalGoalScore"("proposalId", "revisionNumber", "goalId");
CREATE INDEX "ProposalGoalScore_proposalId_revisionNumber_idx" ON "public"."ProposalGoalScore"("proposalId", "revisionNumber");
CREATE INDEX "ProposalGoalScore_domain_idx" ON "public"."ProposalGoalScore"("domain");

-- Immutable audit log of every expert score change
CREATE TABLE "public"."ProposalScoreAdjustmentLog" (
    "id"           TEXT NOT NULL,
    "goalScoreId"  TEXT NOT NULL,
    "fromScore"    DOUBLE PRECISION NOT NULL,
    "toScore"      DOUBLE PRECISION NOT NULL,
    "reason"       TEXT NOT NULL,
    "expertWallet" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalScoreAdjustmentLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProposalScoreAdjustmentLog_goalScoreId_idx" ON "public"."ProposalScoreAdjustmentLog"("goalScoreId");
CREATE INDEX "ProposalScoreAdjustmentLog_expertWallet_createdAt_idx" ON "public"."ProposalScoreAdjustmentLog"("expertWallet", "createdAt");

ALTER TABLE "public"."ProposalScoreAdjustmentLog"
    ADD CONSTRAINT "ProposalScoreAdjustmentLog_goalScoreId_fkey"
    FOREIGN KEY ("goalScoreId") REFERENCES "public"."ProposalGoalScore"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
