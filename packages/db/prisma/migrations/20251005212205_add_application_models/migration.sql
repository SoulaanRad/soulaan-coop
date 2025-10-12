/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ProposalStatus" AS ENUM ('DRAFT', 'VOTABLE', 'APPROVED', 'FUNDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ProposalCategory" AS ENUM ('BUSINESS_FUNDING', 'PROCUREMENT', 'INFRASTRUCTURE', 'TRANSPORT', 'WALLET_INCENTIVE', 'GOVERNANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ProposerRole" AS ENUM ('MEMBER', 'MERCHANT', 'ANCHOR', 'BOT');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('UC', 'USD', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."KPIUnit" AS ENUM ('USD', 'UC', 'JOBS', 'PERCENT', 'COUNT');

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "password" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "agreeToMission" TEXT NOT NULL,
    "spendingCategories" TEXT[],
    "monthlyCommitment" TEXT NOT NULL,
    "useUC" TEXT NOT NULL,
    "acceptFees" TEXT NOT NULL,
    "voteOnInvestments" TEXT NOT NULL,
    "coopExperience" TEXT NOT NULL,
    "transparentTransactions" TEXT NOT NULL,
    "motivation" TEXT,
    "desiredService" TEXT,
    "agreeToCoopValues" BOOLEAN NOT NULL,
    "agreeToTerms" BOOLEAN NOT NULL,
    "agreeToPrivacy" BOOLEAN NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proposal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "public"."ProposalCategory" NOT NULL,
    "proposerWallet" TEXT NOT NULL,
    "proposerRole" "public"."ProposerRole" NOT NULL,
    "proposerDisplayName" TEXT,
    "regionCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "budgetCurrency" "public"."Currency" NOT NULL,
    "budgetAmount" DOUBLE PRECISION NOT NULL,
    "localPercent" DOUBLE PRECISION NOT NULL,
    "nationalPercent" DOUBLE PRECISION NOT NULL,
    "acceptUC" BOOLEAN NOT NULL DEFAULT true,
    "leakageReductionUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsCreated" INTEGER NOT NULL DEFAULT 0,
    "timeHorizonMonths" INTEGER NOT NULL DEFAULT 12,
    "alignmentScore" DOUBLE PRECISION NOT NULL,
    "feasibilityScore" DOUBLE PRECISION NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "quorumPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "approvalThresholdPercent" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "votingWindowDays" INTEGER NOT NULL DEFAULT 7,
    "engineVersion" TEXT NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalKPI" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "unit" "public"."KPIUnit" NOT NULL,

    CONSTRAINT "ProposalKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalAuditCheck" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "note" TEXT,

    CONSTRAINT "ProposalAuditCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voterWallet" TEXT NOT NULL,
    "vote" "public"."VoteType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_key" ON "public"."Application"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVote_proposalId_voterWallet_key" ON "public"."ProposalVote"("proposalId", "voterWallet");

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalKPI" ADD CONSTRAINT "ProposalKPI_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalAuditCheck" ADD CONSTRAINT "ProposalAuditCheck_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
