-- AlterTable
ALTER TABLE "CoopConfigAudit" ADD COLUMN     "proposedChanges" JSONB,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "sequence" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'APPLIED';

-- CreateIndex
CREATE INDEX "CoopConfigAudit_coopConfigId_status_idx" ON "CoopConfigAudit"("coopConfigId", "status");
