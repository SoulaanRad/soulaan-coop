-- CreateEnum for MembershipStatus
CREATE TYPE "public"."MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'INACTIVE');

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Create new UserCoopMembership table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "public"."UserCoopMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coopId" TEXT NOT NULL,
    "status" "public"."MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "roles" TEXT[] DEFAULT ARRAY['member']::TEXT[],
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "joinedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCoopMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCoopMembership_userId_coopId_key" ON "public"."UserCoopMembership"("userId", "coopId");
CREATE INDEX "UserCoopMembership_coopId_status_idx" ON "public"."UserCoopMembership"("coopId", "status");
CREATE INDEX "UserCoopMembership_userId_idx" ON "public"."UserCoopMembership"("userId");

ALTER TABLE "public"."UserCoopMembership" ADD CONSTRAINT "UserCoopMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Create CoopChainConfig table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "public"."CoopChainConfig" (
    "id" TEXT NOT NULL,
    "coopId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "chainName" TEXT NOT NULL,
    "rpcUrl" TEXT,
    "scTokenAddress" TEXT NOT NULL,
    "ucTokenAddress" TEXT NOT NULL,
    "redemptionVaultAddress" TEXT NOT NULL,
    "treasurySafeAddress" TEXT NOT NULL,
    "verifiedStoreRegistryAddress" TEXT NOT NULL,
    "storePaymentRouterAddress" TEXT NOT NULL,
    "rewardEngineAddress" TEXT NOT NULL,
    "scTokenSymbol" TEXT NOT NULL DEFAULT 'SC',
    "scTokenName" TEXT NOT NULL DEFAULT 'SoulaaniCoin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CoopChainConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoopChainConfig_coopId_key" ON "public"."CoopChainConfig"("coopId");
CREATE INDEX "CoopChainConfig_coopId_isActive_idx" ON "public"."CoopChainConfig"("coopId", "isActive");

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Add coopId to Application and change uniqueness
-- ═══════════════════════════════════════════════════════════════
-- Drop the old unique constraint on userId
ALTER TABLE "public"."Application" DROP CONSTRAINT IF EXISTS "Application_userId_key";

-- Add coopId column (nullable first for existing data)
ALTER TABLE "public"."Application" ADD COLUMN "coopId" TEXT;

-- Backfill existing applications with default coopId
UPDATE "public"."Application" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;

-- Make coopId non-nullable
ALTER TABLE "public"."Application" ALTER COLUMN "coopId" SET NOT NULL;

-- Add new unique constraint and indexes
CREATE UNIQUE INDEX "Application_userId_coopId_key" ON "public"."Application"("userId", "coopId");
CREATE INDEX "Application_coopId_status_idx" ON "public"."Application"("coopId", "status");
CREATE INDEX "Application_userId_idx" ON "public"."Application"("userId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Add coopId to Business
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."Business" ADD COLUMN "coopId" TEXT;
UPDATE "public"."Business" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."Business" ALTER COLUMN "coopId" SET NOT NULL;
CREATE INDEX "Business_coopId_idx" ON "public"."Business"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Add coopId to Store
-- ═══════════════════════════════════════════════════════════════
-- Drop old unique constraint on shortCode
ALTER TABLE "public"."Store" DROP CONSTRAINT IF EXISTS "Store_shortCode_key";

ALTER TABLE "public"."Store" ADD COLUMN "coopId" TEXT;
UPDATE "public"."Store" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."Store" ALTER COLUMN "coopId" SET NOT NULL;

-- Add new unique constraint on [coopId, shortCode] and indexes
CREATE UNIQUE INDEX "Store_coopId_shortCode_key" ON "public"."Store"("coopId", "shortCode");
DROP INDEX IF EXISTS "public"."Store_status_idx";
CREATE INDEX "Store_coopId_status_idx" ON "public"."Store"("coopId", "status");

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: Add coopId to WaitlistEntry
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."WaitlistEntry" DROP CONSTRAINT IF EXISTS "WaitlistEntry_email_key";

ALTER TABLE "public"."WaitlistEntry" ADD COLUMN "coopId" TEXT;
UPDATE "public"."WaitlistEntry" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."WaitlistEntry" ALTER COLUMN "coopId" SET NOT NULL;

CREATE UNIQUE INDEX "WaitlistEntry_email_coopId_key" ON "public"."WaitlistEntry"("email", "coopId");
CREATE INDEX "WaitlistEntry_coopId_idx" ON "public"."WaitlistEntry"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 7: Add coopId to BusinessWaitlist
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."BusinessWaitlist" DROP CONSTRAINT IF EXISTS "BusinessWaitlist_ownerEmail_key";

ALTER TABLE "public"."BusinessWaitlist" ADD COLUMN "coopId" TEXT;
UPDATE "public"."BusinessWaitlist" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."BusinessWaitlist" ALTER COLUMN "coopId" SET NOT NULL;

CREATE UNIQUE INDEX "BusinessWaitlist_ownerEmail_coopId_key" ON "public"."BusinessWaitlist"("ownerEmail", "coopId");
CREATE INDEX "BusinessWaitlist_coopId_idx" ON "public"."BusinessWaitlist"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 8: Add coopId to P2PTransfer
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."P2PTransfer" ADD COLUMN "coopId" TEXT;
UPDATE "public"."P2PTransfer" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."P2PTransfer" ALTER COLUMN "coopId" SET NOT NULL;
CREATE INDEX "P2PTransfer_coopId_idx" ON "public"."P2PTransfer"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 9: Add coopId to PendingTransfer
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."PendingTransfer" ADD COLUMN "coopId" TEXT;
UPDATE "public"."PendingTransfer" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."PendingTransfer" ALTER COLUMN "coopId" SET NOT NULL;
CREATE INDEX "PendingTransfer_coopId_idx" ON "public"."PendingTransfer"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 10: Add coopId to Receipt
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."Receipt" ADD COLUMN "coopId" TEXT;
UPDATE "public"."Receipt" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."Receipt" ALTER COLUMN "coopId" SET NOT NULL;
CREATE INDEX "Receipt_coopId_idx" ON "public"."Receipt"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 11: Add coopId to Notification
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."Notification" ADD COLUMN "coopId" TEXT;
UPDATE "public"."Notification" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."Notification" ALTER COLUMN "coopId" SET NOT NULL;

-- Drop old index and create new one
DROP INDEX IF EXISTS "public"."Notification_userId_read_createdAt_idx";
CREATE INDEX "Notification_userId_coopId_read_createdAt_idx" ON "public"."Notification"("userId", "coopId", "read", "createdAt");
CREATE INDEX "Notification_coopId_idx" ON "public"."Notification"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 12: Add coopId to CommerceTransaction
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."CommerceTransaction" ADD COLUMN "coopId" TEXT;
UPDATE "public"."CommerceTransaction" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."CommerceTransaction" ALTER COLUMN "coopId" SET NOT NULL;
CREATE INDEX "CommerceTransaction_coopId_idx" ON "public"."CommerceTransaction"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 13: Update ExpertAssignment for per-coop experts
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."ExpertAssignment" DROP CONSTRAINT IF EXISTS "ExpertAssignment_walletAddress_domain_key";

ALTER TABLE "public"."ExpertAssignment" ADD COLUMN "coopId" TEXT;
UPDATE "public"."ExpertAssignment" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."ExpertAssignment" ALTER COLUMN "coopId" SET NOT NULL;

CREATE UNIQUE INDEX "ExpertAssignment_walletAddress_coopId_domain_key" ON "public"."ExpertAssignment"("walletAddress", "coopId", "domain");
DROP INDEX IF EXISTS "public"."ExpertAssignment_domain_isActive_idx";
CREATE INDEX "ExpertAssignment_coopId_domain_isActive_idx" ON "public"."ExpertAssignment"("coopId", "domain", "isActive");

-- ═══════════════════════════════════════════════════════════════
-- STEP 14: Update UserProfile for per-coop profiles
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "auth"."UserProfile" DROP CONSTRAINT IF EXISTS "UserProfile_walletAddress_key";
ALTER TABLE "auth"."UserProfile" DROP CONSTRAINT IF EXISTS "UserProfile_username_key";

ALTER TABLE "auth"."UserProfile" ADD COLUMN "coopId" TEXT;
UPDATE "auth"."UserProfile" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "auth"."UserProfile" ALTER COLUMN "coopId" SET NOT NULL;

CREATE UNIQUE INDEX "UserProfile_walletAddress_coopId_key" ON "auth"."UserProfile"("walletAddress", "coopId");
CREATE UNIQUE INDEX "UserProfile_username_coopId_key" ON "auth"."UserProfile"("username", "coopId");
CREATE INDEX "UserProfile_coopId_idx" ON "auth"."UserProfile"("coopId");

-- ═══════════════════════════════════════════════════════════════
-- STEP 15: Update AdminRole for per-coop admin roles
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE "public"."AdminRole" DROP CONSTRAINT IF EXISTS "AdminRole_userId_role_key";

ALTER TABLE "public"."AdminRole" ADD COLUMN "coopId" TEXT;
UPDATE "public"."AdminRole" SET "coopId" = 'soulaan' WHERE "coopId" IS NULL;
ALTER TABLE "public"."AdminRole" ALTER COLUMN "coopId" SET NOT NULL;

CREATE UNIQUE INDEX "AdminRole_userId_coopId_role_key" ON "public"."AdminRole"("userId", "coopId", "role");
CREATE INDEX "AdminRole_coopId_idx" ON "public"."AdminRole"("coopId");
