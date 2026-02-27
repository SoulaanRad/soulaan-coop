-- Add configurable scoring gate thresholds to CoopConfig
ALTER TABLE "CoopConfig" ADD COLUMN "strongGoalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.70;
ALTER TABLE "CoopConfig" ADD COLUMN "missionMinThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.50;
ALTER TABLE "CoopConfig" ADD COLUMN "structuralGate"      DOUBLE PRECISION NOT NULL DEFAULT 0.65;
