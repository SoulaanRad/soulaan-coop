/*
  Warnings:

  - You are about to drop the `AdminApprovalRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminMFAConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "PublicCoopInfo" ADD COLUMN     "showStatsBar" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "AdminApprovalRequest";

-- DropTable
DROP TABLE "AdminMFAConfig";

-- DropEnum
DROP TYPE "ApprovalStatus";

-- DropEnum
DROP TYPE "MFAMethod";
