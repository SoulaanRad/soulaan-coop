-- CreateEnum
CREATE TYPE "public"."CommentAlignment" AS ENUM ('ALIGNED', 'NEUTRAL', 'MISALIGNED');

-- AlterTable
ALTER TABLE "public"."Proposal" ADD COLUMN     "alternatives" JSONB,
ADD COLUMN     "bestAlternative" JSONB,
ADD COLUMN     "categoryKey" TEXT,
ADD COLUMN     "coopId" TEXT,
ADD COLUMN     "decision" TEXT,
ADD COLUMN     "decisionReasons" TEXT[],
ADD COLUMN     "goalScores" JSONB,
ADD COLUMN     "missingData" JSONB;

-- CreateTable
CREATE TABLE "public"."CoopConfig" (
    "id" TEXT NOT NULL,
    "coopId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "charterText" TEXT NOT NULL,
    "goalDefinitions" JSONB NOT NULL,
    "quorumPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "approvalThresholdPercent" DOUBLE PRECISION NOT NULL DEFAULT 51,
    "votingWindowDays" INTEGER NOT NULL DEFAULT 7,
    "scVotingCapPercent" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "proposalCategories" JSONB NOT NULL,
    "sectorExclusions" JSONB NOT NULL,
    "minScBalanceToSubmit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoringWeights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CoopConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoopConfigAudit" (
    "id" TEXT NOT NULL,
    "coopConfigId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "diff" JSONB NOT NULL,

    CONSTRAINT "CoopConfigAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalComment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "authorWallet" TEXT NOT NULL,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommentAIEvaluation" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "alignment" "public"."CommentAlignment" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "analysis" TEXT NOT NULL,
    "goalsImpacted" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentAIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoopConfig_coopId_isActive_idx" ON "public"."CoopConfig"("coopId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CoopConfig_coopId_version_key" ON "public"."CoopConfig"("coopId", "version");

-- CreateIndex
CREATE INDEX "CoopConfigAudit_coopConfigId_idx" ON "public"."CoopConfigAudit"("coopConfigId");

-- CreateIndex
CREATE INDEX "ProposalComment_proposalId_createdAt_idx" ON "public"."ProposalComment"("proposalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentAIEvaluation_commentId_key" ON "public"."CommentAIEvaluation"("commentId");

-- AddForeignKey
ALTER TABLE "public"."CoopConfigAudit" ADD CONSTRAINT "CoopConfigAudit_coopConfigId_fkey" FOREIGN KEY ("coopConfigId") REFERENCES "public"."CoopConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalComment" ADD CONSTRAINT "ProposalComment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentAIEvaluation" ADD CONSTRAINT "CommentAIEvaluation_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."ProposalComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
