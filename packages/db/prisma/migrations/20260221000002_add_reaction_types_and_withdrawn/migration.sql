-- Migration 1 of 2: Add new enum values
-- These must be committed before any table/column referencing them is created

ALTER TYPE "public"."ProposalStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

CREATE TYPE "public"."ReactionType" AS ENUM ('SUPPORT', 'CONCERN');
