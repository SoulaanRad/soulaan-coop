/*
  Warnings:

  - Made the column `coopId` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `coopId` to the `SCRewardTransaction` table without a default value. This is not possible if the table is not empty.

*/

-- Backfill existing NULL coopId values in Proposal table with 'soulaan'
UPDATE "Proposal" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;

-- AlterTable: Make Proposal.coopId required
ALTER TABLE "Proposal" ALTER COLUMN "coopId" SET NOT NULL;

-- AlterTable: Add coopId to SCRewardTransaction with default, then make it required
ALTER TABLE "SCRewardTransaction" ADD COLUMN "coopId" TEXT;
UPDATE "SCRewardTransaction" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "SCRewardTransaction" ALTER COLUMN "coopId" SET NOT NULL;

-- AlterTable: Remove default from TreasuryReservePolicy.coopId
ALTER TABLE "TreasuryReservePolicy" ALTER COLUMN "coopId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Proposal_coopId_idx" ON "Proposal"("coopId");

-- CreateIndex
CREATE INDEX "Proposal_coopId_status_idx" ON "Proposal"("coopId", "status");

-- CreateIndex
CREATE INDEX "SCRewardTransaction_coopId_idx" ON "SCRewardTransaction"("coopId");
