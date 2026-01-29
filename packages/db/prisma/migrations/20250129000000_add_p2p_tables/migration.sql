-- CreateEnum
CREATE TYPE "public"."OnrampStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."FundingSource" AS ENUM ('BALANCE', 'CARD');

-- CreateEnum
CREATE TYPE "public"."P2PStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."PendingStatus" AS ENUM ('PENDING_CLAIM', 'CLAIMED_TO_BANK', 'CLAIMED_TO_SOULAAN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "auth"."UserProfile" ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "public"."Application" ADD COLUMN     "documentCID" TEXT,
ADD COLUMN     "photoCID" TEXT,
ADD COLUMN     "videoCID" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "defaultPaymentMethodId" TEXT,
ADD COLUMN     "encryptedPrivateKey" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "walletCreatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."OnrampTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "amountUC" DOUBLE PRECISION NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "status" "public"."OnrampStatus" NOT NULL DEFAULT 'PENDING',
    "mintTxHash" TEXT,
    "processorChargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "OnrampTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."P2PTransfer" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "amountUC" DOUBLE PRECISION NOT NULL,
    "fundingSource" "public"."FundingSource" NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "blockchainTxHash" TEXT,
    "status" "public"."P2PStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "P2PTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PendingTransfer" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "amountUC" DOUBLE PRECISION NOT NULL,
    "claimToken" TEXT NOT NULL,
    "status" "public"."PendingStatus" NOT NULL DEFAULT 'PENDING_CLAIM',
    "fundingSource" "public"."FundingSource" NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "PendingTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeBankAccountId" TEXT,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "routingLast4" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "amountUC" DOUBLE PRECISION NOT NULL,
    "stripePayoutId" TEXT,
    "status" "public"."WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnrampTransaction_paymentIntentId_key" ON "public"."OnrampTransaction"("paymentIntentId");

-- CreateIndex
CREATE INDEX "OnrampTransaction_userId_createdAt_idx" ON "public"."OnrampTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OnrampTransaction_processor_status_idx" ON "public"."OnrampTransaction"("processor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "public"."PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "public"."PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "P2PTransfer_senderId_createdAt_idx" ON "public"."P2PTransfer"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "P2PTransfer_recipientId_createdAt_idx" ON "public"."P2PTransfer"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "P2PTransfer_status_idx" ON "public"."P2PTransfer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PendingTransfer_claimToken_key" ON "public"."PendingTransfer"("claimToken");

-- CreateIndex
CREATE INDEX "PendingTransfer_recipientPhone_idx" ON "public"."PendingTransfer"("recipientPhone");

-- CreateIndex
CREATE INDEX "PendingTransfer_claimToken_idx" ON "public"."PendingTransfer"("claimToken");

-- CreateIndex
CREATE INDEX "PendingTransfer_status_expiresAt_idx" ON "public"."PendingTransfer"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_stripeBankAccountId_key" ON "public"."BankAccount"("stripeBankAccountId");

-- CreateIndex
CREATE INDEX "BankAccount_userId_idx" ON "public"."BankAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_stripePayoutId_key" ON "public"."Withdrawal"("stripePayoutId");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_createdAt_idx" ON "public"."Withdrawal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "public"."Withdrawal"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "public"."Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_username_key" ON "auth"."UserProfile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "public"."User"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "public"."OnrampTransaction" ADD CONSTRAINT "OnrampTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."P2PTransfer" ADD CONSTRAINT "P2PTransfer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."P2PTransfer" ADD CONSTRAINT "P2PTransfer_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PendingTransfer" ADD CONSTRAINT "PendingTransfer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

