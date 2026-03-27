-- DropIndex
DROP INDEX IF EXISTS "WaitlistEntry_email_coopId_key";

-- AlterTable
ALTER TABLE "WaitlistEntry" ALTER COLUMN "coopId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
