-- CreateTable: CharterAmendment
-- Stores proposed charter text changes. Must be acknowledged before going live.
CREATE TABLE "public"."CharterAmendment" (
  "id"           TEXT NOT NULL,
  "coopId"       TEXT NOT NULL,
  "proposedText" TEXT NOT NULL,
  "currentText"  TEXT NOT NULL,
  "reason"       TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "proposedBy"   TEXT NOT NULL,
  "proposedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedBy"   TEXT,
  "reviewedAt"   TIMESTAMP(3),

  CONSTRAINT "CharterAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharterAmendment_coopId_status_idx" ON "public"."CharterAmendment"("coopId", "status");
