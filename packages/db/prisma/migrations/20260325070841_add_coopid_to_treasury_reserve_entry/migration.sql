/*
  Warnings:

  - Added the required column `coopId` to the `TreasuryReserveEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add coopId with default, then make it required
ALTER TABLE "TreasuryReserveEntry" ADD COLUMN "coopId" TEXT;
UPDATE "TreasuryReserveEntry" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "TreasuryReserveEntry" ALTER COLUMN "coopId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "TreasuryReserveEntry_coopId_idx" ON "TreasuryReserveEntry"("coopId");
