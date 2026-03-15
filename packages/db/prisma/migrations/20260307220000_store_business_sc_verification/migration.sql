-- CreateEnum
CREATE TYPE "public"."SCApplicationStatus" AS ENUM ('NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."Store"
ADD COLUMN "businessId" TEXT,
ADD COLUMN "scApplicationStatus" "public"."SCApplicationStatus" NOT NULL DEFAULT 'NOT_APPLIED';

-- CreateTable
CREATE TABLE "public"."SCVerificationApplication" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "whyScEligible" TEXT NOT NULL,
    "expectedVolume" TEXT NOT NULL,
    "status" "public"."SCApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SCVerificationApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_businessId_key" ON "public"."Store"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "SCVerificationApplication_storeId_key" ON "public"."SCVerificationApplication"("storeId");

-- CreateIndex
CREATE INDEX "SCVerificationApplication_status_createdAt_idx" ON "public"."SCVerificationApplication"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "public"."Store" ADD CONSTRAINT "Store_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SCVerificationApplication" ADD CONSTRAINT "SCVerificationApplication_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
