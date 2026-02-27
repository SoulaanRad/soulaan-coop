-- Audit trail: snapshot of every proposal submission (initial + resubmissions)
CREATE TABLE "public"."ProposalRevision" (
    "id"             TEXT NOT NULL,
    "proposalId"     TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "submittedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawText"        TEXT,
    "evaluation"     JSONB,
    "decision"       TEXT,
    "decisionReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "auditChecks"    JSONB NOT NULL DEFAULT '[]'::jsonb,
    "status"         TEXT NOT NULL,
    "engineVersion"  TEXT NOT NULL,

    CONSTRAINT "ProposalRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProposalRevision_proposalId_revisionNumber_key"
    ON "public"."ProposalRevision"("proposalId", "revisionNumber");

ALTER TABLE "public"."ProposalRevision"
    ADD CONSTRAINT "ProposalRevision_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
