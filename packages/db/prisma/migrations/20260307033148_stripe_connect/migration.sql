/*
  Warnings:

  - Added the required column `updatedAt` to the `Business` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "auth"."ActivitySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('EXTERNAL', 'MANAGED');

-- CreateEnum
CREATE TYPE "StripeVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StripeOnboardingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RESTRICTED', 'CHARGES_ENABLED', 'PAYOUTS_ENABLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommerceTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "TreasuryAccountType" AS ENUM ('PLATFORM_FEES', 'TREASURY_FEES', 'PENDING_SETTLEMENT', 'ADJUSTMENTS', 'GRANTS');

-- CreateEnum
CREATE TYPE "TreasuryEntryType" AS ENUM ('FEE_COLLECTION', 'REFUND', 'ALLOCATION', 'ADJUSTMENT', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "TreasuryDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "SCEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminRoleType" AS ENUM ('SUPER_ADMIN', 'TREASURY_ADMIN', 'MERCHANT_ADMIN', 'TOKEN_ADMIN', 'GOVERNANCE_ADMIN', 'SUPPORT_ADMIN');

-- CreateEnum
CREATE TYPE "MFAMethod" AS ENUM ('TOTP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "auth"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."SuspiciousActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "activityType" TEXT NOT NULL,
    "severity" "auth"."ActivitySeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuspiciousActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'base-sepolia',
    "walletType" "WalletType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "encryptedPrivateKey" TEXT,
    "custodyProvider" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeAccount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "requirementsCurrentlyDue" TEXT[],
    "requirementsEventuallyDue" TEXT[],
    "requirementsPastDue" TEXT[],
    "verificationStatus" "StripeVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "onboardingStatus" "StripeOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "cardIssuingEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessOnboardingEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "StripeOnboardingStatus" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessOnboardingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommerceTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "listedAmount" DOUBLE PRECISION NOT NULL,
    "chargedAmount" DOUBLE PRECISION NOT NULL,
    "merchantSettlementAmount" DOUBLE PRECISION NOT NULL,
    "treasuryFeeAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeDestinationAccountId" TEXT,
    "status" "CommerceTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "sourceType" TEXT NOT NULL DEFAULT 'CHECKOUT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "CommerceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripePaymentEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "accountId" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripePaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryLedgerEntry" (
    "id" TEXT NOT NULL,
    "sourceTransactionId" TEXT,
    "sourceTransactionType" TEXT NOT NULL,
    "accountType" "TreasuryAccountType" NOT NULL,
    "entryType" "TreasuryEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "direction" "TreasuryDirection" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeConfig" (
    "id" TEXT NOT NULL,
    "platformMarkupBps" INTEGER NOT NULL DEFAULT 400,
    "merchantFeeBps" INTEGER NOT NULL DEFAULT 0,
    "treasuryFeeBps" INTEGER NOT NULL DEFAULT 400,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCMintEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "coopTokenClass" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION,
    "sourceTransactionId" TEXT,
    "sourceType" TEXT,
    "contractTxHash" TEXT,
    "blockNumber" INTEGER,
    "status" "SCEventStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "SCMintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCBurnEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "authorizedBy" TEXT NOT NULL,
    "contractTxHash" TEXT,
    "blockNumber" INTEGER,
    "status" "SCEventStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "SCBurnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCBalanceCache" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SCBalanceCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AdminRoleType" NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMFAConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "MFAMethod" NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMFAConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "status" "AuditStatus" NOT NULL,
    "errorMessage" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "executedAt" TIMESTAMP(3),
    "executionResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "auth"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_isRevoked_idx" ON "auth"."Session"("userId", "isRevoked");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "auth"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "auth"."Session"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_attemptedAt_idx" ON "auth"."LoginAttempt"("identifier", "attemptedAt" DESC);

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_attemptedAt_idx" ON "auth"."LoginAttempt"("ipAddress", "attemptedAt" DESC);

-- CreateIndex
CREATE INDEX "SuspiciousActivity_userId_detectedAt_idx" ON "auth"."SuspiciousActivity"("userId", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "SuspiciousActivity_resolved_severity_idx" ON "auth"."SuspiciousActivity"("resolved", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE INDEX "Wallet_userId_isPrimary_idx" ON "Wallet"("userId", "isPrimary");

-- CreateIndex
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "StripeAccount_businessId_key" ON "StripeAccount"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeAccount_stripeAccountId_key" ON "StripeAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeAccount_stripeAccountId_idx" ON "StripeAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeAccount_onboardingStatus_idx" ON "StripeAccount"("onboardingStatus");

-- CreateIndex
CREATE INDEX "BusinessOnboardingEvent_businessId_occurredAt_idx" ON "BusinessOnboardingEvent"("businessId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CommerceTransaction_stripePaymentIntentId_key" ON "CommerceTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "CommerceTransaction_customerId_createdAt_idx" ON "CommerceTransaction"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommerceTransaction_businessId_createdAt_idx" ON "CommerceTransaction"("businessId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommerceTransaction_status_idx" ON "CommerceTransaction"("status");

-- CreateIndex
CREATE INDEX "CommerceTransaction_stripePaymentIntentId_idx" ON "CommerceTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "StripePaymentEvent_stripeEventId_key" ON "StripePaymentEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripePaymentEvent_stripeEventId_idx" ON "StripePaymentEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripePaymentEvent_processed_createdAt_idx" ON "StripePaymentEvent"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "TreasuryLedgerEntry_accountType_occurredAt_idx" ON "TreasuryLedgerEntry"("accountType", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "TreasuryLedgerEntry_sourceTransactionId_idx" ON "TreasuryLedgerEntry"("sourceTransactionId");

-- CreateIndex
CREATE INDEX "TreasuryLedgerEntry_entryType_idx" ON "TreasuryLedgerEntry"("entryType");

-- CreateIndex
CREATE INDEX "FeeConfig_isActive_effectiveFrom_idx" ON "FeeConfig"("isActive", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "SCMintEvent_idempotencyKey_key" ON "SCMintEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SCMintEvent_contractTxHash_key" ON "SCMintEvent"("contractTxHash");

-- CreateIndex
CREATE INDEX "SCMintEvent_userId_createdAt_idx" ON "SCMintEvent"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SCMintEvent_walletAddress_idx" ON "SCMintEvent"("walletAddress");

-- CreateIndex
CREATE INDEX "SCMintEvent_status_idx" ON "SCMintEvent"("status");

-- CreateIndex
CREATE INDEX "SCMintEvent_idempotencyKey_idx" ON "SCMintEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SCBurnEvent_idempotencyKey_key" ON "SCBurnEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SCBurnEvent_contractTxHash_key" ON "SCBurnEvent"("contractTxHash");

-- CreateIndex
CREATE INDEX "SCBurnEvent_userId_createdAt_idx" ON "SCBurnEvent"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SCBurnEvent_walletAddress_idx" ON "SCBurnEvent"("walletAddress");

-- CreateIndex
CREATE INDEX "SCBurnEvent_status_idx" ON "SCBurnEvent"("status");

-- CreateIndex
CREATE INDEX "SCBurnEvent_idempotencyKey_idx" ON "SCBurnEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SCBalanceCache_walletId_key" ON "SCBalanceCache"("walletId");

-- CreateIndex
CREATE INDEX "SCBalanceCache_walletId_syncedAt_idx" ON "SCBalanceCache"("walletId", "syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "AdminRole_userId_idx" ON "AdminRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_userId_role_key" ON "AdminRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "AdminMFAConfig_userId_key" ON "AdminMFAConfig"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_occurredAt_idx" ON "AuditLog"("actorId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_occurredAt_idx" ON "AuditLog"("action", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AdminApprovalRequest_status_createdAt_idx" ON "AdminApprovalRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminApprovalRequest_requestedBy_idx" ON "AdminApprovalRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeAccount" ADD CONSTRAINT "StripeAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessOnboardingEvent" ADD CONSTRAINT "BusinessOnboardingEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommerceTransaction" ADD CONSTRAINT "CommerceTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommerceTransaction" ADD CONSTRAINT "CommerceTransaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryLedgerEntry" ADD CONSTRAINT "TreasuryLedgerEntry_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "CommerceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCMintEvent" ADD CONSTRAINT "SCMintEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCMintEvent" ADD CONSTRAINT "SCMintEvent_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "CommerceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCBurnEvent" ADD CONSTRAINT "SCBurnEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCBalanceCache" ADD CONSTRAINT "SCBalanceCache_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
