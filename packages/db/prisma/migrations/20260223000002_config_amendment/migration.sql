-- CreateTable: ConfigAmendment
-- Proposed change to any config section; must be acknowledged before going live.
CREATE TABLE "public"."ConfigAmendment" (
  "id"               TEXT NOT NULL,
  "coopId"           TEXT NOT NULL,
  "section"          TEXT NOT NULL,
  "proposedChanges"  JSONB NOT NULL,
  "currentSnapshot"  JSONB NOT NULL,
  "reason"           TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'PENDING',
  "proposedBy"       TEXT NOT NULL,
  "proposedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedBy"       TEXT,
  "reviewedAt"       TIMESTAMP(3),

  CONSTRAINT "ConfigAmendment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConfigAmendment_coopId_status_idx"         ON "public"."ConfigAmendment"("coopId", "status");
CREATE INDEX "ConfigAmendment_coopId_section_status_idx" ON "public"."ConfigAmendment"("coopId", "section", "status");
