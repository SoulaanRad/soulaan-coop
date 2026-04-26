/*
  Warnings:

  - You are about to drop the `AdminApprovalRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminMFAConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "PublicCoopInfo" ADD COLUMN IF NOT EXISTS "showStatsBar" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE IF EXISTS "AdminApprovalRequest";

-- DropTable
DROP TABLE IF EXISTS "AdminMFAConfig";

-- DropEnum
DROP TYPE IF EXISTS "ApprovalStatus";

-- DropEnum
DROP TYPE IF EXISTS "MFAMethod";
