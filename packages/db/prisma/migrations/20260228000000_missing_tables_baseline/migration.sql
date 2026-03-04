-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('PERSONAL', 'RENT', 'SERVICE', 'STORE');

-- CreateEnum
CREATE TYPE "ReceiptVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StoreCategory" AS ENUM ('FOOD_BEVERAGE', 'RETAIL', 'SERVICES', 'HEALTH_WELLNESS', 'ENTERTAINMENT', 'EDUCATION', 'PROFESSIONAL', 'HOME_GARDEN', 'AUTOMOTIVE', 'FOUNDER_PACKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('FOOD', 'BEVERAGES', 'CLOTHING', 'ELECTRONICS', 'HOME', 'BEAUTY', 'HEALTH', 'SPORTS', 'TOYS', 'BOOKS', 'SERVICES', 'FOUNDER_BADGES', 'OTHER');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StoreApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CARD', 'UC_BALANCE', 'MIXED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SCRewardReason" AS ENUM ('STORE_PURCHASE_REWARD', 'STORE_SALE_REWARD', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SCRewardStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TreasuryReserveStatus" AS ENUM ('PENDING', 'SETTLING', 'SETTLED', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "ProposalStatus_new" AS ENUM ('SUBMITTED', 'VOTABLE', 'APPROVED', 'FUNDED', 'REJECTED', 'FAILED', 'WITHDRAWN');
ALTER TABLE "public"."Proposal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Proposal" ALTER COLUMN "status" TYPE "ProposalStatus_new" USING ("status"::text::"ProposalStatus_new");
ALTER TYPE "ProposalStatus" RENAME TO "ProposalStatus_old";
ALTER TYPE "ProposalStatus_new" RENAME TO "ProposalStatus";
DROP TYPE "public"."ProposalStatus_old";
ALTER TABLE "Proposal" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- DropForeignKey
ALTER TABLE "ProposalReaction" DROP CONSTRAINT "ProposalReaction_proposalId_fkey";

-- AlterTable
ALTER TABLE "P2PTransfer" ADD COLUMN     "transferMetadata" JSONB,
ADD COLUMN     "transferType" "TransferType" NOT NULL DEFAULT 'PERSONAL';

-- AlterTable
ALTER TABLE "PendingTransfer" ADD COLUMN     "transferMetadata" JSONB,
ADD COLUMN     "transferType" "TransferType" NOT NULL DEFAULT 'PERSONAL';

-- AlterTable
ALTER TABLE "Proposal" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED',
ALTER COLUMN "withdrawnAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProposalReaction" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProposalRevision" ALTER COLUMN "decisionReasons" DROP DEFAULT,
ALTER COLUMN "auditChecks" DROP DEFAULT;

-- DropTable
DROP TABLE IF EXISTS "WealthFundAddressChange";

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "p2pTransferId" TEXT,
    "pendingTransferId" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientPhone" TEXT,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "transferType" "TransferType" NOT NULL,
    "metadata" JSONB,
    "verificationStatus" "ReceiptVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "StoreCategory" NOT NULL,
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "shortCode" TEXT,
    "acceptsQuickPay" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "isScVerified" BOOLEAN NOT NULL DEFAULT false,
    "scVerifiedAt" TIMESTAMP(3),
    "acceptsUC" BOOLEAN NOT NULL DEFAULT true,
    "ucDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "communityCommitmentPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "status" "StoreStatus" NOT NULL DEFAULT 'PENDING',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProductCategory" NOT NULL,
    "imageUrl" TEXT,
    "images" TEXT[],
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "ucDiscountPrice" DOUBLE PRECISION,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreApplication" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "businessCity" TEXT NOT NULL,
    "businessState" TEXT NOT NULL,
    "businessZip" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "storeDescription" TEXT NOT NULL DEFAULT '',
    "communityBenefitStatement" TEXT NOT NULL DEFAULT '',
    "communityCommitmentPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "estimatedMonthlyRevenue" TEXT,
    "websiteUrl" TEXT,
    "socialMediaUrls" TEXT[],
    "businessLicenseCID" TEXT,
    "status" "StoreApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "subtotalUSD" DOUBLE PRECISION NOT NULL,
    "discountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUSD" DOUBLE PRECISION NOT NULL,
    "totalUC" DOUBLE PRECISION,
    "paymentMethod" "PaymentType" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "shippingAddress" TEXT,
    "trackingNumber" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "totalUSD" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StoreOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePaymentRequest" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "description" TEXT,
    "referenceId" TEXT,
    "token" TEXT NOT NULL,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "p2pTransferId" TEXT,
    "paidByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCategoryConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategoryConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCRewardTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountSC" DOUBLE PRECISION NOT NULL,
    "reason" "SCRewardReason" NOT NULL,
    "status" "SCRewardStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "sourceUcTxHash" TEXT,
    "sourceType" TEXT,
    "sourceRecordId" TEXT,
    "relatedStoreId" TEXT,
    "relatedOrderId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),

    CONSTRAINT "SCRewardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryReservePolicy" (
    "id" TEXT NOT NULL,
    "coopId" TEXT NOT NULL DEFAULT 'soulaan',
    "defaultReserveBps" INTEGER NOT NULL DEFAULT 500,
    "badgeReserveBps" INTEGER,
    "programReserveBps" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "TreasuryReservePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryReserveEntry" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceUcTxHash" TEXT NOT NULL,
    "transactionAmountUC" DOUBLE PRECISION NOT NULL,
    "reservePercentBps" INTEGER NOT NULL,
    "reserveAmountUC" DOUBLE PRECISION NOT NULL,
    "treasuryTxHash" TEXT,
    "status" "TreasuryReserveStatus" NOT NULL DEFAULT 'PENDING',
    "relatedScRewardIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TreasuryReserveEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_p2pTransferId_key" ON "Receipt"("p2pTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_pendingTransferId_key" ON "Receipt"("pendingTransferId");

-- CreateIndex
CREATE INDEX "Receipt_senderId_idx" ON "Receipt"("senderId");

-- CreateIndex
CREATE INDEX "Receipt_recipientId_idx" ON "Receipt"("recipientId");

-- CreateIndex
CREATE INDEX "Receipt_transferType_idx" ON "Receipt"("transferType");

-- CreateIndex
CREATE INDEX "Receipt_verificationStatus_idx" ON "Receipt"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Store_shortCode_key" ON "Store"("shortCode");

-- CreateIndex
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");

-- CreateIndex
CREATE INDEX "Store_status_idx" ON "Store"("status");

-- CreateIndex
CREATE INDEX "Store_category_idx" ON "Store"("category");

-- CreateIndex
CREATE INDEX "Store_shortCode_idx" ON "Store"("shortCode");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StoreApplication_storeId_key" ON "StoreApplication"("storeId");

-- CreateIndex
CREATE INDEX "StoreOrder_storeId_idx" ON "StoreOrder"("storeId");

-- CreateIndex
CREATE INDEX "StoreOrder_buyerId_idx" ON "StoreOrder"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "StorePaymentRequest_token_key" ON "StorePaymentRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StorePaymentRequest_p2pTransferId_key" ON "StorePaymentRequest"("p2pTransferId");

-- CreateIndex
CREATE INDEX "StorePaymentRequest_storeId_status_idx" ON "StorePaymentRequest"("storeId", "status");

-- CreateIndex
CREATE INDEX "StorePaymentRequest_token_idx" ON "StorePaymentRequest"("token");

-- CreateIndex
CREATE INDEX "StorePaymentRequest_status_expiresAt_idx" ON "StorePaymentRequest"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCategoryConfig_key_key" ON "StoreCategoryConfig"("key");

-- CreateIndex
CREATE INDEX "StoreCategoryConfig_isActive_sortOrder_idx" ON "StoreCategoryConfig"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategoryConfig_key_key" ON "ProductCategoryConfig"("key");

-- CreateIndex
CREATE INDEX "ProductCategoryConfig_isActive_sortOrder_idx" ON "ProductCategoryConfig"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SCRewardTransaction_txHash_key" ON "SCRewardTransaction"("txHash");

-- CreateIndex
CREATE INDEX "SCRewardTransaction_userId_createdAt_idx" ON "SCRewardTransaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SCRewardTransaction_status_idx" ON "SCRewardTransaction"("status");

-- CreateIndex
CREATE INDEX "SCRewardTransaction_relatedStoreId_idx" ON "SCRewardTransaction"("relatedStoreId");

-- CreateIndex
CREATE INDEX "SCRewardTransaction_relatedOrderId_idx" ON "SCRewardTransaction"("relatedOrderId");

-- CreateIndex
CREATE INDEX "SCRewardTransaction_sourceUcTxHash_idx" ON "SCRewardTransaction"("sourceUcTxHash");

-- CreateIndex
CREATE INDEX "SCRewardTransaction_sourceRecordId_idx" ON "SCRewardTransaction"("sourceRecordId");

-- CreateIndex
CREATE INDEX "TreasuryReservePolicy_coopId_isActive_idx" ON "TreasuryReservePolicy"("coopId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryReserveEntry_treasuryTxHash_key" ON "TreasuryReserveEntry"("treasuryTxHash");

-- CreateIndex
CREATE INDEX "TreasuryReserveEntry_sourceUcTxHash_idx" ON "TreasuryReserveEntry"("sourceUcTxHash");

-- CreateIndex
CREATE INDEX "TreasuryReserveEntry_sourceRecordId_idx" ON "TreasuryReserveEntry"("sourceRecordId");

-- CreateIndex
CREATE INDEX "TreasuryReserveEntry_status_idx" ON "TreasuryReserveEntry"("status");

-- CreateIndex
CREATE INDEX "TreasuryReserveEntry_createdAt_idx" ON "TreasuryReserveEntry"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "P2PTransfer_transferType_idx" ON "P2PTransfer"("transferType");

-- CreateIndex
CREATE INDEX "PendingTransfer_transferType_idx" ON "PendingTransfer"("transferType");

-- AddForeignKey
ALTER TABLE "ProposalReaction" ADD CONSTRAINT "ProposalReaction_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_p2pTransferId_fkey" FOREIGN KEY ("p2pTransferId") REFERENCES "P2PTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_pendingTransferId_fkey" FOREIGN KEY ("pendingTransferId") REFERENCES "PendingTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreApplication" ADD CONSTRAINT "StoreApplication_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePaymentRequest" ADD CONSTRAINT "StorePaymentRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePaymentRequest" ADD CONSTRAINT "StorePaymentRequest_p2pTransferId_fkey" FOREIGN KEY ("p2pTransferId") REFERENCES "P2PTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCRewardTransaction" ADD CONSTRAINT "SCRewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCRewardTransaction" ADD CONSTRAINT "SCRewardTransaction_relatedStoreId_fkey" FOREIGN KEY ("relatedStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCRewardTransaction" ADD CONSTRAINT "SCRewardTransaction_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "StoreOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

