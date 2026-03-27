-- DropIndex
DROP INDEX IF EXISTS "BusinessWaitlist_ownerEmail_coopId_key";

-- AlterTable
ALTER TABLE "BusinessWaitlist" ALTER COLUMN "coopId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWaitlist_ownerEmail_key" ON "BusinessWaitlist"("ownerEmail");
